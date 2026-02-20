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
