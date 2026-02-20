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
