export {
  savePetConfig,
  loadPetConfig,
  loadPetConfigV2,
  savePetConfigV2,
  saveProfile,
  getProfiles,
  switchToProfile,
  deleteProfile,
} from './pet-config.ts';
export {
  getClaudeUserId,
  getCompanionName,
  renameCompanion,
  getCompanionPersonality,
  setCompanionPersonality,
  deleteCompanion,
} from './claude-config.ts';
export {
  getClaudeSettings,
  saveClaudeSettings,
  isHookInstalled,
  installHook,
  removeHook,
} from './hooks.ts';
