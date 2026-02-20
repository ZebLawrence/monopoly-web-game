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
  getActivePlayer,
  isGameOver,
  TurnStateMachine,
  type PlayerSetup,
  type GameAction,
  type GameState,
  type RoomMetadata,
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

      const player = getActivePlayer(state);

      // Check if in jail
      if (player.jailStatus.inJail) {
        const jailResult = rollInJail(state, player.id, diceResult);
        state = jailResult.state;
        if (!jailResult.freed) {
          // Still in jail → transition through resolving to PlayerAction then EndTurn
          machine.transition(action, {}); // Rolling → Resolving
          machine.transition(action, {}); // Resolving → PlayerAction
          return state;
        }
        // Freed from jail — continue with movement below
      }

      const moveResult = applyMovement(state, player.id, diceResult);
      state = moveResult.state;

      if (moveResult.sentToJail) {
        machine.transition(action, {}); // Rolling → Resolving
        machine.transition(action, {}); // Resolving → PlayerAction
        return state;
      }

      // Resolve landing space
      const currentPlayer = getActivePlayer(state);
      const resolution = resolveSpace(state, currentPlayer.id);
      const resolved = applySpaceResolution(state, currentPlayer.id, resolution);
      state = resolved;

      // Transition through Rolling → Resolving
      machine.transition(action, {}); // auto to Resolving

      const landedOnUnownedProperty = resolution.type === 'unowned_property';
      machine.transition(action, { landedOnUnownedProperty });

      return state;
    }

    case 'RollForDoubles': {
      machine.transition(action);
      const diceResult = rollDice();

      const player = getActivePlayer(state);
      const jailResult = rollInJail(state, player.id, diceResult);
      state = jailResult.state;

      if (jailResult.freed) {
        machine.rolledDoubles = diceResult.isDoubles;
        const moveResult = applyMovement(state, player.id, diceResult);
        state = moveResult.state;

        const currentPlayer = getActivePlayer(state);
        const resolution = resolveSpace(state, currentPlayer.id);
        state = applySpaceResolution(state, currentPlayer.id, resolution);

        machine.transition(action, {});
        machine.transition(action, {
          landedOnUnownedProperty: resolution.type === 'unowned_property',
        });
      } else {
        machine.transition(action, {});
        machine.transition(action, {});
      }

      return state;
    }

    case 'BuyProperty': {
      machine.transition(action);
      return buyProperty(state, playerId, action.propertyId);
    }

    case 'DeclineProperty': {
      machine.transition(action);
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
      return payJailFine(state, playerId);
    }

    case 'UseJailCard': {
      machine.transition(action);
      return useJailCard(state, playerId);
    }

    case 'EndTurn': {
      machine.transition(action);

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
      const resolution = resolveSpace(state, currentPlayer.id);
      state = applySpaceResolution(state, currentPlayer.id, resolution);

      machine.transition({ type: 'RollDice' }, {});
      machine.transition(
        { type: 'RollDice' },
        { landedOnUnownedProperty: resolution.type === 'unowned_property' },
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
