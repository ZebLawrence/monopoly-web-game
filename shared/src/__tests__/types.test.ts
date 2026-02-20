import { describe, it, expect } from 'vitest';
import {
  SpaceType,
  TokenType,
  TurnState,
  GameEventType,
  DEFAULT_GAME_SETTINGS,
  MONEY_DENOMINATIONS,
  STARTING_CASH_BREAKDOWN,
  STARTING_CASH,
} from '../index';
import type {
  Space,
  Player,
  Property,
  Card,
  GameState,
  TradeOffer,
  TitleDeedData,
  GameAction,
  GameEvent,
  ClientToServerEvents,
  ServerToClientEvents,
} from '../index';

describe('SpaceType enum (P0.S5.T1)', () => {
  it('should have all expected space types', () => {
    expect(SpaceType.Property).toBe('property');
    expect(SpaceType.Railroad).toBe('railroad');
    expect(SpaceType.Utility).toBe('utility');
    expect(SpaceType.Tax).toBe('tax');
    expect(SpaceType.Chance).toBe('chance');
    expect(SpaceType.CommunityChest).toBe('communityChest');
    expect(SpaceType.Corner).toBe('corner');
  });

  it('should have exactly 7 space types', () => {
    const values = Object.values(SpaceType);
    expect(values).toHaveLength(7);
  });
});

describe('Space interface (P0.S5.T1)', () => {
  it('should create a valid space object', () => {
    const space: Space = {
      id: 1,
      name: 'Mediterranean Avenue',
      type: SpaceType.Property,
      position: 1,
      colorGroup: 'brown',
      cost: 60,
      rentTiers: [2, 10, 30, 90, 160, 250],
      mortgageValue: 30,
      houseCost: 50,
      hotelCost: 50,
    };
    expect(space.name).toBe('Mediterranean Avenue');
    expect(space.type).toBe(SpaceType.Property);
  });
});

describe('Player interface (P0.S5.T2)', () => {
  it('should create a valid player object', () => {
    const player: Player = {
      id: 'player-1',
      name: 'Alice',
      token: TokenType.TopHat,
      cash: 1500,
      position: 0,
      properties: [],
      jailStatus: { inJail: false },
      isActive: true,
      isBankrupt: false,
      getOutOfJailFreeCards: 0,
    };
    expect(player.name).toBe('Alice');
    expect(player.cash).toBe(1500);
    expect(player.token).toBe(TokenType.TopHat);
  });
});

describe('Property interface (P0.S5.T3)', () => {
  it('should create a valid property with correct rentTiers length', () => {
    const property: Property = {
      spaceId: 1,
      name: 'Mediterranean Avenue',
      type: 'street',
      colorGroup: 'brown',
      cost: 60,
      rentTiers: [2, 10, 30, 90, 160, 250],
      mortgaged: false,
      ownerId: null,
      houses: 0,
    };
    expect(property.rentTiers).toHaveLength(6);
    expect(property.name).toBe('Mediterranean Avenue');
  });
});

describe('Card and CardEffect (P0.S5.T4)', () => {
  it('should create one card of each effect type without type errors (10 variants)', () => {
    const cards: Card[] = [
      { id: '1', deck: 'chance', text: 'Cash card', effect: { type: 'cash', amount: 50 } },
      { id: '2', deck: 'chance', text: 'Move card', effect: { type: 'move', position: 0 } },
      { id: '3', deck: 'chance', text: 'Move back', effect: { type: 'moveBack', spaces: 3 } },
      { id: '4', deck: 'chance', text: 'Go to jail', effect: { type: 'jail' } },
      {
        id: '5',
        deck: 'communityChest',
        text: 'Birthday',
        effect: { type: 'collectFromAll', amount: 10 },
      },
      {
        id: '6',
        deck: 'chance',
        text: 'Pay each',
        effect: { type: 'payEachPlayer', amount: 50 },
      },
      {
        id: '7',
        deck: 'communityChest',
        text: 'Repairs',
        effect: { type: 'repairs', perHouse: 25, perHotel: 100 },
      },
      {
        id: '8',
        deck: 'chance',
        text: 'Nearest railroad',
        effect: { type: 'advanceNearestRailroad' },
      },
      {
        id: '9',
        deck: 'chance',
        text: 'Nearest utility',
        effect: { type: 'advanceNearestUtility' },
      },
      {
        id: '10',
        deck: 'chance',
        text: 'Get out of jail',
        effect: { type: 'goojf' },
      },
    ];
    expect(cards).toHaveLength(10);
    const effectTypes = new Set(cards.map((c) => c.effect.type));
    expect(effectTypes.size).toBe(10);
  });
});

describe('GameState interface (P0.S5.T5)', () => {
  it('should create a minimal valid GameState object', () => {
    const state: GameState = {
      gameId: 'game-1',
      status: 'waiting',
      players: [],
      currentPlayerIndex: 0,
      board: [],
      decks: { chance: [], communityChest: [] },
      turnState: TurnState.WaitingForRoll,
      settings: DEFAULT_GAME_SETTINGS,
      events: [],
    };
    expect(state.gameId).toBe('game-1');
    expect(state.status).toBe('waiting');
  });
});

describe('GameSettings (P0.S5.T6)', () => {
  it('should have default starting cash of $1500', () => {
    expect(DEFAULT_GAME_SETTINGS.startingCash).toBe(1500);
  });

  it('should have all required settings fields', () => {
    expect(DEFAULT_GAME_SETTINGS.maxPlayers).toBeDefined();
    expect(DEFAULT_GAME_SETTINGS.turnTimeLimit).toBeDefined();
    expect(DEFAULT_GAME_SETTINGS.freeParking).toBeDefined();
    expect(DEFAULT_GAME_SETTINGS.auctionEnabled).toBeDefined();
  });
});

describe('GameAction (P0.S5.T10)', () => {
  it('should create one action of each type (18 action types)', () => {
    const actions: GameAction[] = [
      { type: 'RollDice' },
      { type: 'BuyProperty', propertyId: 1 },
      { type: 'DeclineProperty', propertyId: 1 },
      { type: 'AuctionBid', amount: 100 },
      { type: 'AuctionPass' },
      { type: 'BuildHouse', propertyId: 1 },
      { type: 'BuildHotel', propertyId: 1 },
      { type: 'SellBuilding', propertyId: 1, count: 1 },
      { type: 'MortgageProperty', propertyId: 1 },
      { type: 'UnmortgageProperty', propertyId: 1 },
      {
        type: 'ProposeTrade',
        recipientId: 'p2',
        offer: {
          offeredProperties: [],
          offeredCash: 0,
          offeredCards: 0,
          requestedProperties: [],
          requestedCash: 0,
          requestedCards: 0,
        },
      },
      { type: 'AcceptTrade', tradeId: 't1' },
      { type: 'RejectTrade', tradeId: 't1' },
      {
        type: 'CounterTrade',
        tradeId: 't1',
        offer: {
          offeredProperties: [],
          offeredCash: 0,
          offeredCards: 0,
          requestedProperties: [],
          requestedCash: 0,
          requestedCards: 0,
        },
      },
      { type: 'PayJailFine' },
      { type: 'UseJailCard' },
      { type: 'RollForDoubles' },
      { type: 'EndTurn' },
    ];
    expect(actions).toHaveLength(18);
    const actionTypes = new Set(actions.map((a) => a.type));
    expect(actionTypes.size).toBe(18);
  });
});

describe('Socket.IO event contracts (P0.S5.T11)', () => {
  it('should have ClientToServerEvents interface with expected event names', () => {
    // Type-level check: if this compiles, the interface has the expected shape
    const _clientEvents: ClientToServerEvents = {
      createRoom: (_settings, _cb) => {},
      joinRoom: (_data, _cb) => {},
      selectToken: (_data, _cb) => {},
      startGame: (_data, _cb) => {},
      leaveRoom: (_data, _cb) => {},
      gameAction: (_data, _cb) => {},
      reconnect: (_data, _cb) => {},
      chatMessage: (_data, _cb) => {},
    };
    expect(_clientEvents).toBeDefined();
  });

  it('should have ServerToClientEvents interface with expected event names', () => {
    const _serverEvents: ServerToClientEvents = {
      roomUpdated: (_room) => {},
      playerJoined: (_player) => {},
      playerLeft: (_data) => {},
      playerUpdated: (_player) => {},
      gameStarted: (_state) => {},
      stateUpdate: (_state) => {},
      gameEvent: (_event) => {},
      actionError: (_data) => {},
      playerDisconnected: (_data) => {},
      playerReconnected: (_data) => {},
      turnTimerUpdate: (_data) => {},
      chatMessage: (_data) => {},
      gameOver: (_data) => {},
      error: (_message) => {},
    };
    expect(_serverEvents).toBeDefined();
  });
});

describe('GameEvent (P0.S5.T12)', () => {
  it('should create sample events of different types', () => {
    const event1: GameEvent = {
      id: 'evt-1',
      gameId: 'game-1',
      type: GameEventType.DiceRolled,
      payload: { die1: 3, die2: 4 },
      timestamp: Date.now(),
    };
    const event2: GameEvent = {
      id: 'evt-2',
      gameId: 'game-1',
      type: GameEventType.PropertyPurchased,
      payload: { playerId: 'p1', propertyId: 1 },
      timestamp: Date.now(),
    };
    expect(event1.type).toBe(GameEventType.DiceRolled);
    expect(event2.type).toBe(GameEventType.PropertyPurchased);
  });
});

describe('TokenType enum (P0.S5.T13)', () => {
  it('should have exactly 8 token types', () => {
    const values = Object.values(TokenType);
    expect(values).toHaveLength(8);
  });

  it('should have all expected tokens', () => {
    expect(TokenType.ScottieDog).toBe('scottieDog');
    expect(TokenType.TopHat).toBe('topHat');
    expect(TokenType.RaceCar).toBe('raceCar');
    expect(TokenType.Boot).toBe('boot');
    expect(TokenType.Thimble).toBe('thimble');
    expect(TokenType.Iron).toBe('iron');
    expect(TokenType.Wheelbarrow).toBe('wheelbarrow');
    expect(TokenType.Battleship).toBe('battleship');
  });
});

describe('TurnState enum (P0.S5.T14)', () => {
  it('should have all expected states', () => {
    expect(TurnState.WaitingForRoll).toBe('WaitingForRoll');
    expect(TurnState.Rolling).toBe('Rolling');
    expect(TurnState.Resolving).toBe('Resolving');
    expect(TurnState.AwaitingBuyDecision).toBe('AwaitingBuyDecision');
    expect(TurnState.Auction).toBe('Auction');
    expect(TurnState.PlayerAction).toBe('PlayerAction');
    expect(TurnState.TradeNegotiation).toBe('TradeNegotiation');
    expect(TurnState.EndTurn).toBe('EndTurn');
  });
});

describe('TradeOffer interface (P0.S5.T15)', () => {
  it('should create a valid trade offer object', () => {
    const trade: TradeOffer = {
      id: 'trade-1',
      proposerId: 'p1',
      recipientId: 'p2',
      offeredProperties: [1, 3],
      offeredCash: 100,
      offeredCards: 0,
      requestedProperties: [11],
      requestedCash: 0,
      requestedCards: 1,
      status: 'pending',
    };
    expect(trade.id).toBe('trade-1');
    expect(trade.offeredProperties).toHaveLength(2);
    expect(trade.status).toBe('pending');
  });
});

describe('MoneyDenomination and starting cash (P0.S5.T16)', () => {
  it('should have all 7 denominations defined', () => {
    expect(MONEY_DENOMINATIONS).toHaveLength(7);
    expect(MONEY_DENOMINATIONS).toContain(1);
    expect(MONEY_DENOMINATIONS).toContain(5);
    expect(MONEY_DENOMINATIONS).toContain(10);
    expect(MONEY_DENOMINATIONS).toContain(20);
    expect(MONEY_DENOMINATIONS).toContain(50);
    expect(MONEY_DENOMINATIONS).toContain(100);
    expect(MONEY_DENOMINATIONS).toContain(500);
  });

  it('should have starting cash breakdown summing to $1500', () => {
    const total = STARTING_CASH_BREAKDOWN.reduce(
      (sum, item) => sum + item.denomination * item.count,
      0,
    );
    expect(total).toBe(1500);
    expect(STARTING_CASH).toBe(1500);
  });
});

describe('TitleDeedData interface (P0.S5.T17)', () => {
  it('should create a valid title deed data object', () => {
    const deed: TitleDeedData = {
      propertyId: 1,
      name: 'Mediterranean Avenue',
      colorGroup: 'brown',
      cost: 60,
      rentTiers: [2, 10, 30, 90, 160, 250],
      mortgageValue: 30,
      houseCost: 50,
      hotelCost: 50,
    };
    expect(deed.name).toBe('Mediterranean Avenue');
    expect(deed.rentTiers).toHaveLength(6);
  });
});
