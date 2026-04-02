import { describe, it, expect } from 'vitest';
import {
  selectedEntry,
  activeEntryIndex,
  DEFAULT_PROFILE,
  type GalleryEntry,
  type GalleryState,
} from '@/tui/gallery/state.js';
import type { Bones } from '@/types.js';

function makeBones(overrides: Partial<Bones> = {}): Bones {
  return {
    species: 'duck',
    rarity: 'common',
    eye: '·',
    hat: 'none',
    shiny: false,
    stats: {},
    ...overrides,
  };
}

function makeEntry(overrides: Partial<GalleryEntry> = {}): GalleryEntry {
  return {
    name: 'test',
    isDefault: false,
    isActive: false,
    bones: makeBones(),
    profile: null,
    ...overrides,
  };
}

describe('selectedEntry', () => {
  it('returns the entry at selectedIndex', () => {
    const entries = [makeEntry({ name: 'a' }), makeEntry({ name: 'b' }), makeEntry({ name: 'c' })];
    const state: GalleryState = { entries, selectedIndex: 1 };
    expect(selectedEntry(state).name).toBe('b');
  });

  it('returns first entry when index is 0', () => {
    const entries = [makeEntry({ name: 'first' })];
    expect(selectedEntry({ entries, selectedIndex: 0 }).name).toBe('first');
  });
});

describe('activeEntryIndex', () => {
  it('returns the index of the active entry', () => {
    const entries = [
      makeEntry({ isActive: false }),
      makeEntry({ isActive: true }),
      makeEntry({ isActive: false }),
    ];
    expect(activeEntryIndex(entries)).toBe(1);
  });

  it('returns 0 when no entry is active', () => {
    const entries = [makeEntry({ isActive: false }), makeEntry({ isActive: false })];
    expect(activeEntryIndex(entries)).toBe(0);
  });

  it('returns first active entry if multiple are active', () => {
    const entries = [
      makeEntry({ isActive: false }),
      makeEntry({ isActive: true }),
      makeEntry({ isActive: true }),
    ];
    expect(activeEntryIndex(entries)).toBe(1);
  });
});

describe('DEFAULT_PROFILE', () => {
  it('is a sentinel string distinct from normal names', () => {
    expect(DEFAULT_PROFILE).toBe('__default__');
  });
});
