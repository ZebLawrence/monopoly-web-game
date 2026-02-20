// Step 1A.1 — Game State Manager
export {
  createInitialGameState,
  getActivePlayer,
  getPlayerById,
  getSpaceByPosition,
  getSpaceById,
  getPropertiesOwnedBy,
  spaceToProperty,
  isGameOver,
  serializeGameState,
  deserializeGameState,
  type PlayerSetup,
  type InitialGameStateOptions,
} from './state';

// Step 1A.2 — Turn State Machine
export { TurnStateMachine, type TurnContext } from './turn-machine';

// Step 1A.3 — Dice & Movement
export {
  rollDice,
  calculateNewPosition,
  didPassGo,
  applyMovement,
  getConsecutiveDoubles,
  setConsecutiveDoubles,
  resetDoublesTracker,
  type DiceResult,
  type RngFunction,
  type MovementResult,
} from './dice';

// Step 1A.4 — Space Resolution Engine
export {
  resolveSpace,
  applySpaceResolution,
  calculateStreetRent,
  calculateRailroadRent,
  calculateUtilityRent,
  getPropertyOwnership,
  getPropertyState,
  setPropertyState,
  resetPropertyStates,
  getColorGroupSpaces,
  ownsAllInColorGroup,
  countOwnedOfType,
  type SpaceResolution,
  type SpaceResolutionType,
  type PropertyOwnership,
  type PropertyStateEntry,
} from './spaces';

// Step 1A.5 — Card System
export {
  createDeck,
  drawCard,
  returnCardToDeck,
  applyCardEffect,
  type DrawCardResult,
  type CardEffectResult,
} from './cards';

// Step 1A.6 — Property Management
export {
  buyProperty,
  startAuction,
  getAuction,
  placeBid,
  passBid,
  isAuctionComplete,
  resolveAuction,
  hasMonopoly,
  buildHouse,
  canBuildHouse,
  sellBuilding,
  canSellBuilding,
  mortgageProperty,
  unmortgageProperty,
  getBuildingSupply,
  setBuildingSupply,
  resetBuildingSupply,
  initBuildingSupply,
  type AuctionState,
  type BuildingSupply,
} from './properties';

// Step 1A.7 — Trading Logic
export {
  createTradeOffer,
  acceptTrade,
  rejectTrade,
  counterTrade,
  storeTrade,
  getTrade,
  resetTrades,
} from './trading';

// Step 1A.8 — Jail Logic
export {
  sendToJail,
  payJailFine,
  useJailCard,
  rollInJail,
  type JailRollResult,
} from './jail';

// Step 1A.9 — Bankruptcy & Endgame
export {
  canPlayerAfford,
  calculateLiquidationValue,
  declareBankruptcy,
  getWinner,
  calculateNetWorth,
  determineTimedGameWinner,
} from './bankruptcy';

// Step 1A.10 — Event System
export {
  GameEventEmitter,
  GameEventLog,
  createPlayerMovedEvent,
  createPropertyPurchasedEvent,
  createRentPaidEvent,
  createCardDrawnEvent,
  createPlayerBankruptEvent,
  createTradeCompletedEvent,
  createBuildingPlacedEvent,
  createBuildingSoldEvent,
  createDiceRolledEvent,
} from './events';
