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
