import {
  createInitialGameState,
  serializeGameState,
  deserializeGameState,
  rollDice,
  applyMovement,
  resolveSpace,
  applySpaceResolution,
  buyProperty,
  startAuction,
  getAuction,
  placeBid,
  passBid,
  isAuctionComplete,
  resolveAuction,
  buildHouse,
  sellBuilding,
  mortgageProperty,
  unmortgageProperty,
  createTradeOffer,
  acceptTrade,
  rejectTrade,
  counterTrade,
  payJailFine,
  useJailCard,
  rollInJail,
  drawCard,
  applyCardEffect,
  getActivePlayer,
  getPlayerById,
  isGameOver,
  declareBankruptcy,
  TurnStateMachine,
  getConsecutiveDoubles,
  type PlayerSetup,
  type GameAction,
  type GameState,
  type RoomMetadata,
  type DiceResult,
  TurnState,
} from '@monopoly/shared';
import type { RedisClient } from '../redis/client';

export interface ActionResult {
  ok: boolean;
  state?: GameState;
  error?: string;
}

// Keep turn state machines per game in memory
const turnMachines = new Map<string, TurnStateMachine>();

export function getTurnMachine(gameId: string, currentState?: TurnState): TurnStateMachine {
  let machine = turnMachines.get(gameId);
  if (!machine) {
    machine = new TurnStateMachine(currentState ?? TurnState.WaitingForRoll);
    turnMachines.set(gameId, machine);
  }
  return machine;
}

export function deleteTurnMachine(gameId: string): void {
  turnMachines.delete(gameId);
}

export function initializeGame(room: RoomMetadata): GameState {
  const players: PlayerSetup[] = room.players.map((p) => ({
    id: p.id,
    name: p.name,
    token: p.token,
  }));

  const state = createInitialGameState(players, {
    gameId: room.roomCode,
    settings: {
      maxPlayers: room.maxPlayers,
      startingCash: room.startingCash,
    },
  });

  // Create turn machine for this game
  const machine = new TurnStateMachine(TurnState.WaitingForRoll);
  turnMachines.set(state.gameId, machine);

  return state;
}

export async function processAction(
  redis: RedisClient,
  gameId: string,
  playerId: string,
  action: GameAction,
): Promise<ActionResult> {
  const raw = await redis.loadGameState(gameId);
  if (!raw) {
    return { ok: false, error: 'Game not found' };
  }

  let state = deserializeGameState(raw);

  if (state.status !== 'playing') {
    return { ok: false, error: 'Game is not in progress' };
  }

  const activePlayer = getActivePlayer(state);

  // Most actions require it to be your turn
  // DeclareBankruptcy can be done by the current player at any time
  const turnActions = [
    'RollDice',
    'RollForDoubles',
    'BuyProperty',
    'DeclineProperty',
    'AuctionBid',
    'AuctionPass',
    'EndTurn',
    'PayJailFine',
    'UseJailCard',
    'DeclareBankruptcy',
  ];

  if (turnActions.includes(action.type) && activePlayer.id !== playerId) {
    return { ok: false, error: 'Not your turn' };
  }

  const machine = getTurnMachine(gameId, state.turnState);

  try {
    state = applyAction(state, playerId, action, machine);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Action failed';
    return { ok: false, error: message };
  }

  // Check for game over
  if (isGameOver(state)) {
    state.status = 'finished';
  }

  // Sync turn state
  state.turnState = machine.currentState;

  // Persist
  await redis.saveGameState(gameId, serializeGameState(state));

  return { ok: true, state };
}

function handlePostRollResolution(
  state: GameState,
  playerId: string,
  diceResult: DiceResult,
  machine: TurnStateMachine,
  action: GameAction,
): GameState {
  const currentPlayer = getActivePlayer(state);
  const resolution = resolveSpace(state, currentPlayer.id, diceResult);
  state = applySpaceResolution(state, currentPlayer.id, resolution);

  // Handle card drawing
  if (resolution.type === 'drawCard' && resolution.deckName) {
    const drawResult = drawCard(state, resolution.deckName);
    state = drawResult.state;
    state.lastCardDrawn = drawResult.card;

    // Apply card effect
    const effectResult = applyCardEffect(state, currentPlayer.id, drawResult.card, diceResult);
    state = effectResult.state;

    // If card moves player and triggers buy decision
    if (effectResult.needsBuyDecision && effectResult.spaceResolution?.propertyDetails) {
      state.pendingBuyDecision = {
        spaceId: effectResult.spaceResolution.propertyDetails.spaceId,
        spaceName: effectResult.spaceResolution.propertyDetails.name,
        cost: effectResult.spaceResolution.propertyDetails.cost,
      };
    }

    // If card sends to jail
    if (effectResult.sentToJail) {
      state.lastResolution = {
        type: 'goToJail',
        spaceName: 'Jail',
      };
    }
  } else {
    state.lastCardDrawn = null;
  }

  // Set resolution info for client UI
  if (resolution.type === 'unownedProperty' && resolution.propertyDetails) {
    state.pendingBuyDecision = {
      spaceId: resolution.propertyDetails.spaceId,
      spaceName: resolution.propertyDetails.name,
      cost: resolution.propertyDetails.cost,
    };
    state.lastResolution = {
      type: 'unownedProperty',
      spaceName: resolution.space.name,
    };
  } else if (resolution.type === 'rentPayment') {
    const owner = resolution.ownerId ? getPlayerById(state, resolution.ownerId) : null;
    state.lastResolution = {
      type: 'rentPayment',
      spaceName: resolution.space.name,
      amount: resolution.rentAmount,
      ownerId: resolution.ownerId,
      ownerName: owner?.name,
    };
    state.pendingBuyDecision = null;
  } else if (resolution.type === 'tax') {
    state.lastResolution = {
      type: 'tax',
      spaceName: resolution.space.name,
      amount: resolution.taxAmount,
    };
    state.pendingBuyDecision = null;
  } else if (resolution.type === 'goToJail') {
    state.lastResolution = {
      type: 'goToJail',
      spaceName: 'Go To Jail',
    };
    state.pendingBuyDecision = null;
  } else if (resolution.type === 'drawCard') {
    state.lastResolution = {
      type: 'drawCard',
      spaceName: resolution.space.name,
      deckName: resolution.deckName,
    };
    state.pendingBuyDecision = null;
  } else {
    state.lastResolution = {
      type: resolution.type,
      spaceName: resolution.space.name,
    };
    state.pendingBuyDecision = null;
  }

  // Transition through Rolling → Resolving
  machine.transition(action, {}); // auto to Resolving

  const landedOnUnownedProperty = resolution.type === 'unownedProperty';
  machine.transition(action, { landedOnUnownedProperty });

  return state;
}

function applyAction(
  state: GameState,
  playerId: string,
  action: GameAction,
  machine: TurnStateMachine,
): GameState {
  switch (action.type) {
    case 'RollDice': {
      machine.transition(action);
      const diceResult = rollDice();
      machine.rolledDoubles = diceResult.isDoubles;

      // Store dice result for client
      state.lastDiceResult = {
        die1: diceResult.die1,
        die2: diceResult.die2,
        total: diceResult.total,
        isDoubles: diceResult.isDoubles,
      };
      state.doublesCount = getConsecutiveDoubles(state, playerId) + (diceResult.isDoubles ? 1 : 0);
      state.lastCardDrawn = null;

      const player = getActivePlayer(state);

      // Check if in jail
      if (player.jailStatus.inJail) {
        const jailResult = rollInJail(state, player.id, diceResult);
        state = jailResult.state;
        // Re-store dice result after state clone
        state.lastDiceResult = {
          die1: diceResult.die1,
          die2: diceResult.die2,
          total: diceResult.total,
          isDoubles: diceResult.isDoubles,
        };

        if (!jailResult.freed) {
          state.lastResolution = {
            type: 'stayInJail',
            spaceName: 'Jail',
          };
          state.pendingBuyDecision = null;
          // Still in jail
          machine.transition(action, {}); // Rolling → Resolving
          machine.transition(action, {}); // Resolving → PlayerAction
          return state;
        }

        if (jailResult.forcedExit) {
          state.lastResolution = {
            type: 'forcedJailExit',
            spaceName: 'Jail',
            amount: 50,
          };
        } else {
          state.lastResolution = {
            type: 'freedFromJail',
            spaceName: 'Jail',
          };
        }

        // Freed from jail — resolve the space they moved to
        state = handlePostRollResolution(state, player.id, diceResult, machine, action);
        // Preserve dice result
        state.lastDiceResult = {
          die1: diceResult.die1,
          die2: diceResult.die2,
          total: diceResult.total,
          isDoubles: diceResult.isDoubles,
        };
        return state;
      }

      const moveResult = applyMovement(state, player.id, diceResult);
      state = moveResult.state;
      // Re-store dice result after state clone
      state.lastDiceResult = {
        die1: diceResult.die1,
        die2: diceResult.die2,
        total: diceResult.total,
        isDoubles: diceResult.isDoubles,
      };

      if (moveResult.sentToJail) {
        state.lastResolution = {
          type: 'threeDoublesToJail',
          spaceName: 'Jail',
        };
        state.pendingBuyDecision = null;
        state.doublesCount = 0;
        machine.transition(action, {}); // Rolling → Resolving
        machine.transition(action, {}); // Resolving → PlayerAction
        return state;
      }

      if (moveResult.passedGo) {
        // Mark that player passed Go for client notification
        state.lastResolution = {
          type: 'passedGo',
          spaceName: 'Go',
          amount: 200,
        };
      }

      state = handlePostRollResolution(state, player.id, diceResult, machine, action);
      // Preserve dice result
      state.lastDiceResult = {
        die1: diceResult.die1,
        die2: diceResult.die2,
        total: diceResult.total,
        isDoubles: diceResult.isDoubles,
      };

      return state;
    }

    case 'RollForDoubles': {
      machine.transition(action);
      const diceResult = rollDice();

      state.lastDiceResult = {
        die1: diceResult.die1,
        die2: diceResult.die2,
        total: diceResult.total,
        isDoubles: diceResult.isDoubles,
      };
      state.lastCardDrawn = null;

      const player = getActivePlayer(state);
      const jailResult = rollInJail(state, player.id, diceResult);
      state = jailResult.state;
      state.lastDiceResult = {
        die1: diceResult.die1,
        die2: diceResult.die2,
        total: diceResult.total,
        isDoubles: diceResult.isDoubles,
      };

      if (jailResult.freed) {
        machine.rolledDoubles = diceResult.isDoubles;

        if (jailResult.forcedExit) {
          state.lastResolution = {
            type: 'forcedJailExit',
            spaceName: 'Jail',
            amount: 50,
          };
        } else {
          state.lastResolution = {
            type: 'freedFromJail',
            spaceName: 'Jail',
          };
        }

        const moveResult = applyMovement(state, player.id, diceResult);
        state = moveResult.state;
        state.lastDiceResult = {
          die1: diceResult.die1,
          die2: diceResult.die2,
          total: diceResult.total,
          isDoubles: diceResult.isDoubles,
        };

        const currentPlayer = getActivePlayer(state);
        const resolution = resolveSpace(state, currentPlayer.id, diceResult);
        state = applySpaceResolution(state, currentPlayer.id, resolution);
        state.lastDiceResult = {
          die1: diceResult.die1,
          die2: diceResult.die2,
          total: diceResult.total,
          isDoubles: diceResult.isDoubles,
        };

        // Handle card drawing
        if (resolution.type === 'drawCard' && resolution.deckName) {
          const drawResult = drawCard(state, resolution.deckName);
          state = drawResult.state;
          state.lastCardDrawn = drawResult.card;
          const effectResult = applyCardEffect(
            state,
            currentPlayer.id,
            drawResult.card,
            diceResult,
          );
          state = effectResult.state;
        }

        // Set resolution info
        if (resolution.type === 'unownedProperty' && resolution.propertyDetails) {
          state.pendingBuyDecision = {
            spaceId: resolution.propertyDetails.spaceId,
            spaceName: resolution.propertyDetails.name,
            cost: resolution.propertyDetails.cost,
          };
        }

        machine.transition(action, {});
        machine.transition(action, {
          landedOnUnownedProperty: resolution.type === 'unownedProperty',
        });
      } else {
        state.lastResolution = {
          type: 'stayInJail',
          spaceName: 'Jail',
        };
        state.pendingBuyDecision = null;
        machine.transition(action, {});
        machine.transition(action, {});
      }

      return state;
    }

    case 'BuyProperty': {
      machine.transition(action);
      state = buyProperty(state, playerId, action.propertyId);
      state.pendingBuyDecision = null;
      state.lastResolution = null;
      return state;
    }

    case 'DeclineProperty': {
      machine.transition(action);
      state.pendingBuyDecision = null;
      // Start auction if auctions enabled
      if (state.settings.auctionEnabled) {
        state = startAuction(state, action.propertyId);
      }
      return state;
    }

    case 'AuctionBid': {
      machine.transition(action);
      const auction = getAuction(state.gameId);
      if (!auction) throw new Error('No active auction');
      placeBid(state.gameId, playerId, action.amount);

      if (isAuctionComplete(state.gameId, state.players.length)) {
        state = resolveAuction(state);
        machine.transition(action, { auctionComplete: true });
      }
      return state;
    }

    case 'AuctionPass': {
      machine.transition(action);
      passBid(state.gameId, playerId);

      if (isAuctionComplete(state.gameId, state.players.length)) {
        state = resolveAuction(state);
        machine.transition(action, { auctionComplete: true });
      }
      return state;
    }

    case 'BuildHouse':
    case 'BuildHotel': {
      machine.transition(action);
      return buildHouse(state, playerId, action.propertyId);
    }

    case 'SellBuilding': {
      machine.transition(action);
      return sellBuilding(state, playerId, action.propertyId, action.count);
    }

    case 'MortgageProperty': {
      machine.transition(action);
      return mortgageProperty(state, playerId, action.propertyId);
    }

    case 'UnmortgageProperty': {
      machine.transition(action);
      return unmortgageProperty(state, playerId, action.propertyId);
    }

    case 'ProposeTrade': {
      machine.transition(action);
      const trade = createTradeOffer(state, playerId, action.recipientId, action.offer);
      return trade.state;
    }

    case 'AcceptTrade': {
      const trade = acceptTrade(state, action.tradeId, playerId);
      return trade.state;
    }

    case 'RejectTrade': {
      const trade = rejectTrade(state, action.tradeId, playerId);
      return trade.state;
    }

    case 'CounterTrade': {
      const trade = counterTrade(state, action.tradeId, playerId, action.offer);
      return trade.state;
    }

    case 'PayJailFine': {
      machine.transition(action);
      state = payJailFine(state, playerId);
      state.lastResolution = {
        type: 'paidJailFine',
        spaceName: 'Jail',
        amount: 50,
      };
      return state;
    }

    case 'UseJailCard': {
      machine.transition(action);
      state = useJailCard(state, playerId);
      state.lastResolution = {
        type: 'usedJailCard',
        spaceName: 'Jail',
      };
      return state;
    }

    case 'DeclareBankruptcy': {
      state = declareBankruptcy(state, playerId, action.creditorId);

      // Clear transient UI state
      state.lastDiceResult = null;
      state.lastCardDrawn = null;
      state.lastResolution = null;
      state.pendingBuyDecision = null;

      // If the bankrupt player was the current player, advance to next
      const activePlayer = state.players[state.currentPlayerIndex];
      if (activePlayer && (activePlayer.isBankrupt || !activePlayer.isActive)) {
        state = advanceToNextPlayer(state);
        machine.currentState = TurnState.WaitingForRoll;
      }

      return state;
    }

    case 'EndTurn': {
      machine.transition(action);

      // Clear transient UI state
      state.lastDiceResult = null;
      state.lastCardDrawn = null;
      state.lastResolution = null;
      state.pendingBuyDecision = null;
      state.doublesCount = 0;

      // If EndTurn transitions to EndTurn state, advance to next player
      if (machine.currentState === TurnState.EndTurn) {
        state = advanceToNextPlayer(state);
        machine.transition({ type: 'RollDice' } as GameAction, {}); // EndTurn → WaitingForRoll
        // Undo the machine state — we just wanted to get to WaitingForRoll
        machine.currentState = TurnState.WaitingForRoll;
      }
      // If rolled doubles, machine goes back to WaitingForRoll for same player

      return state;
    }
  }
}

function advanceToNextPlayer(state: GameState): GameState {
  const activePlayers = state.players.filter((p) => p.isActive && !p.isBankrupt);
  if (activePlayers.length <= 1) return state;

  let nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
  while (state.players[nextIndex].isBankrupt || !state.players[nextIndex].isActive) {
    nextIndex = (nextIndex + 1) % state.players.length;
  }

  return { ...state, currentPlayerIndex: nextIndex };
}

export function autoRollForPlayer(state: GameState): GameState {
  const machine = getTurnMachine(state.gameId, state.turnState);
  const player = getActivePlayer(state);

  try {
    machine.transition({ type: 'RollDice' });
    const diceResult = rollDice();
    machine.rolledDoubles = diceResult.isDoubles;

    state.lastDiceResult = {
      die1: diceResult.die1,
      die2: diceResult.die2,
      total: diceResult.total,
      isDoubles: diceResult.isDoubles,
    };

    if (player.jailStatus.inJail) {
      const jailResult = rollInJail(state, player.id, diceResult);
      state = jailResult.state;
      if (!jailResult.freed) {
        machine.transition({ type: 'RollDice' }, {});
        machine.transition({ type: 'RollDice' }, {});
        state.turnState = machine.currentState;
        return state;
      }
    }

    const moveResult = applyMovement(state, player.id, diceResult);
    state = moveResult.state;

    if (!moveResult.sentToJail) {
      const currentPlayer = getActivePlayer(state);
      const resolution = resolveSpace(state, currentPlayer.id, diceResult);
      state = applySpaceResolution(state, currentPlayer.id, resolution);

      machine.transition({ type: 'RollDice' }, {});
      machine.transition(
        { type: 'RollDice' },
        { landedOnUnownedProperty: resolution.type === 'unownedProperty' },
      );
    } else {
      machine.transition({ type: 'RollDice' }, {});
      machine.transition({ type: 'RollDice' }, {});
    }

    state.turnState = machine.currentState;
    return state;
  } catch {
    return state;
  }
}

export function autoEndTurnForPlayer(state: GameState): GameState {
  const machine = getTurnMachine(state.gameId, state.turnState);

  try {
    machine.transition({ type: 'EndTurn' });

    if (machine.currentState === TurnState.EndTurn) {
      state = advanceToNextPlayer(state);
      machine.currentState = TurnState.WaitingForRoll;
    }

    state.turnState = machine.currentState;
    return state;
  } catch {
    // Force end turn if machine won't allow it
    state = advanceToNextPlayer(state);
    machine.currentState = TurnState.WaitingForRoll;
    state.turnState = TurnState.WaitingForRoll;
    return state;
  }
}
