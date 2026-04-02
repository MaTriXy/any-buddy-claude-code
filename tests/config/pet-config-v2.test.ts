import { describe, it, expect, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import type { PetConfig, PetConfigV2, ProfileData } from '@/types.js';

const tempDir = mkdtempSync(join(tmpdir(), 'anybuddy-v2-'));
const configPath = join(tempDir, '.claude-code-any-buddy.json');

vi.mock('os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('os')>();
  return { ...actual, homedir: () => tempDir };
});

// Mock claude-config so migrateV1 doesn't read real files
vi.mock('@/config/claude-config.ts', () => ({
  getCompanionName: () => 'TestBuddy',
  getCompanionPersonality: () => 'friendly',
  getClaudeUserId: () => 'test-user',
  renameCompanion: vi.fn(),
  setCompanionPersonality: vi.fn(),
}));

const {
  loadPetConfigV2,
  savePetConfigV2,
  saveProfile,
  getProfiles,
  switchToProfile,
  deleteProfile,
} = await import('@/config/pet-config.js');

function makeProfile(overrides: Partial<ProfileData> = {}): ProfileData {
  return {
    salt: 'profile-salt-1234',
    species: 'duck',
    rarity: 'common',
    eye: '·',
    hat: 'none',
    shiny: false,
    stats: {},
    name: null,
    personality: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeV2(overrides: Partial<PetConfigV2> = {}): PetConfigV2 {
  return {
    version: 2,
    activeProfile: null,
    salt: 'friend-2026-401',
    profiles: {},
    ...overrides,
  };
}

afterEach(() => {
  try {
    rmSync(configPath, { force: true });
  } catch {
    /* ignore */
  }
});

describe('loadPetConfigV2 + savePetConfigV2', () => {
  it('returns null when no config exists', () => {
    expect(loadPetConfigV2()).toBeNull();
  });

  it('round-trips v2 config', () => {
    const config = makeV2({
      activeProfile: 'sparky',
      profiles: { sparky: makeProfile({ salt: 'sparky-salt-1234' }) },
    });
    savePetConfigV2(config);
    expect(loadPetConfigV2()).toEqual(config);
  });

  it('returns null on corrupt JSON', () => {
    writeFileSync(configPath, 'not json{{{');
    expect(loadPetConfigV2()).toBeNull();
  });
});

describe('v1 → v2 migration', () => {
  it('migrates a v1 config with custom salt into a profile', () => {
    const v1: PetConfig = {
      salt: 'custom-salt-12345',
      species: 'cat',
      rarity: 'rare',
      eye: '✦',
      hat: 'crown',
      appliedAt: '2026-03-01T00:00:00.000Z',
    };
    writeFileSync(configPath, JSON.stringify(v1));

    const loaded = loadPetConfigV2();
    expect(loaded?.version).toBe(2);
    expect(loaded?.activeProfile).toBe('cat');
    expect(loaded?.profiles['cat']).toBeDefined();
    expect(loaded?.profiles['cat'].salt).toBe('custom-salt-12345');
    expect(loaded?.profiles['cat'].species).toBe('cat');
  });

  it('migrates a restored v1 config with no active profile', () => {
    const v1: PetConfig = {
      salt: 'friend-2026-401',
      restored: true,
    };
    writeFileSync(configPath, JSON.stringify(v1));

    const loaded = loadPetConfigV2();
    expect(loaded?.version).toBe(2);
    expect(loaded?.activeProfile).toBeNull();
    expect(Object.keys(loaded?.profiles ?? {})).toHaveLength(0);
  });

  it('migrates v1 with original salt (no custom pet) to empty profiles', () => {
    const v1: PetConfig = { salt: 'friend-2026-401' };
    writeFileSync(configPath, JSON.stringify(v1));

    const loaded = loadPetConfigV2();
    expect(loaded?.activeProfile).toBeNull();
    expect(Object.keys(loaded?.profiles ?? {})).toHaveLength(0);
  });

  it('uses species as profile name, falling back to "default"', () => {
    const v1: PetConfig = { salt: 'custom-salt-99999' };
    writeFileSync(configPath, JSON.stringify(v1));

    const loaded = loadPetConfigV2();
    // No species → should use 'default'
    expect(loaded?.profiles['default']).toBeDefined();
    expect(loaded?.profiles['default'].species).toBe('duck');
  });
});

describe('saveProfile', () => {
  it('adds a profile without activating it', () => {
    savePetConfigV2(makeV2());
    const profile = makeProfile({ salt: 'new-salt-1234567' });
    saveProfile('fluffy', profile);

    const loaded = loadPetConfigV2();
    expect(loaded).not.toBeNull();
    expect(loaded?.profiles['fluffy']).toEqual(profile);
    expect(loaded?.activeProfile).toBeNull();
    expect(loaded?.salt).toBe('friend-2026-401'); // unchanged
  });

  it('adds a profile and activates it', () => {
    savePetConfigV2(makeV2({ salt: 'old-salt-1234567' }));
    const profile = makeProfile({ salt: 'activated-salt-00' });
    saveProfile('sparky', profile, { activate: true });

    const loaded = loadPetConfigV2();
    expect(loaded).not.toBeNull();
    expect(loaded?.activeProfile).toBe('sparky');
    expect(loaded?.salt).toBe('activated-salt-00');
    expect(loaded?.previousSalt).toBe('old-salt-1234567');
  });

  it('creates fresh v2 config if none exists', () => {
    saveProfile('first', makeProfile());
    const loaded = loadPetConfigV2();
    expect(loaded).not.toBeNull();
    expect(loaded?.version).toBe(2);
    expect(loaded?.profiles['first']).toBeDefined();
  });

  it('does not set previousSalt when activating with same salt', () => {
    savePetConfigV2(makeV2({ salt: 'same-salt-1234567' }));
    saveProfile('x', makeProfile({ salt: 'same-salt-1234567' }), { activate: true });

    const loaded = loadPetConfigV2();
    expect(loaded).not.toBeNull();
    expect(loaded?.previousSalt).toBeUndefined();
  });
});

describe('switchToProfile', () => {
  it('switches active profile and updates salt', () => {
    const profile = makeProfile({ salt: 'target-salt-12345' });
    savePetConfigV2(makeV2({ salt: 'old-salt-1234567', profiles: { target: profile } }));

    const result = switchToProfile('target');
    expect(result.activeProfile).toBe('target');
    expect(result.salt).toBe('target-salt-12345');
    expect(result.previousSalt).toBe('old-salt-1234567');

    // Persisted
    const loaded = loadPetConfigV2();
    expect(loaded).not.toBeNull();
    expect(loaded?.activeProfile).toBe('target');
  });

  it('throws on non-existent profile', () => {
    savePetConfigV2(makeV2());
    expect(() => switchToProfile('nope')).toThrow('Profile "nope" not found');
  });

  it('throws when no config exists', () => {
    expect(() => switchToProfile('any')).toThrow();
  });
});

describe('deleteProfile', () => {
  it('removes a non-active profile', () => {
    savePetConfigV2(
      makeV2({
        activeProfile: 'keep',
        profiles: {
          keep: makeProfile({ salt: 'keep-salt-123456' }),
          remove: makeProfile({ salt: 'rm-salt-12345678' }),
        },
      }),
    );

    deleteProfile('remove');
    const loaded = loadPetConfigV2();
    expect(loaded).not.toBeNull();
    expect(loaded?.profiles['remove']).toBeUndefined();
    expect(loaded?.profiles['keep']).toBeDefined();
  });

  it('throws when deleting the active profile', () => {
    savePetConfigV2(
      makeV2({
        activeProfile: 'active',
        profiles: { active: makeProfile() },
      }),
    );

    expect(() => deleteProfile('active')).toThrow('Cannot delete the active profile');
  });

  it('silently does nothing for non-existent profile', () => {
    savePetConfigV2(makeV2());
    expect(() => deleteProfile('ghost')).not.toThrow();
  });
});

describe('getProfiles', () => {
  it('returns empty object when no config', () => {
    expect(getProfiles()).toEqual({});
  });

  it('returns all saved profiles', () => {
    savePetConfigV2(
      makeV2({
        profiles: {
          a: makeProfile({ salt: 'a-salt-123456789' }),
          b: makeProfile({ salt: 'b-salt-123456789' }),
        },
      }),
    );
    const profiles = getProfiles();
    expect(Object.keys(profiles)).toEqual(['a', 'b']);
  });
});
