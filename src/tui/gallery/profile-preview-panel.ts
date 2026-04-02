import type { BoxRenderable, TextRenderable } from '@opentui/core';
import { Box, Text } from '@opentui/core';
import type { Renderable as OTUIRenderable } from '@opentui/core';
import { renderAnimatedSprite, IDLE_SEQUENCE } from '@/sprites/index.js';
import { RARITY_STARS } from '@/constants.js';
import { RARITY_HEX, BORDER_COLOR, HELP_COLOR } from '../builder/colors.ts';
import { renderStatBarsFromStats } from '../builder/stat-bars.ts';
import type { GalleryEntry } from './state.ts';

export interface GalleryPreviewPanel {
  container: OTUIRenderable;
  update: (entry: GalleryEntry) => void;
  tick: (frame: number) => void;
}

export function createGalleryPreviewPanel(parent: OTUIRenderable): GalleryPreviewPanel {
  let spriteText: TextRenderable | null = null;
  let titleText: TextRenderable | null = null;
  let detailsText: TextRenderable | null = null;
  let companionText: TextRenderable | null = null;
  let statsText: TextRenderable | null = null;
  let currentEntry: GalleryEntry | null = null;
  let lastRenderedFrame = -1;

  const container = Box(
    {
      id: 'gallery-preview',
      borderStyle: 'rounded',
      border: true,
      borderColor: BORDER_COLOR,
      title: ' Preview ',
      titleAlignment: 'center',
      flexDirection: 'column',
      flexGrow: 1,
      padding: 1,
      paddingTop: 1,
      alignItems: 'center',
      justifyContent: 'flex-start',
    },
    // Title: "dragon ★★★★★"
    Text({ id: 'gp-title', content: '', height: 1 }),
    Text({ content: '', height: 1 }),
    // Sprite (5 lines)
    Text({ id: 'gp-sprite', content: '\n\n\n\n', height: 5 }),
    Text({ content: '', height: 1 }),
    // Details
    Text({ id: 'gp-details', content: '', height: 4 }),
    Text({ content: '', height: 1 }),
    // Companion name + personality
    Text({ id: 'gp-companion', content: '', height: 3 }),
    Text({ content: '', height: 1 }),
    // Stats
    Text({ id: 'gp-stats', content: '', height: 5 }),
  );

  parent.add(container);

  const containerRenderable = parent.findDescendantById('gallery-preview') as BoxRenderable;
  spriteText = containerRenderable?.findDescendantById('gp-sprite') as TextRenderable;
  titleText = containerRenderable?.findDescendantById('gp-title') as TextRenderable;
  detailsText = containerRenderable?.findDescendantById('gp-details') as TextRenderable;
  companionText = containerRenderable?.findDescendantById('gp-companion') as TextRenderable;
  statsText = containerRenderable?.findDescendantById('gp-stats') as TextRenderable;

  function renderSpriteAtFrame(bones: GalleryEntry['bones'], frame: number): void {
    if (!spriteText) return;
    spriteText.content = renderAnimatedSprite(bones, frame);
  }

  function update(entry: GalleryEntry): void {
    if (!spriteText || !titleText || !detailsText || !companionText || !statsText) return;

    currentEntry = entry;
    lastRenderedFrame = -1;

    const { bones, profile } = entry;
    const color = RARITY_HEX[bones.rarity];

    // Title
    titleText.content = `${bones.species} ${RARITY_STARS[bones.rarity]}`;
    titleText.fg = color;

    // Sprite (render frame 0 on entry change)
    renderSpriteAtFrame(bones, 0);
    spriteText.fg = color;

    // Details
    const detailLines = [
      `Rarity:  ${bones.rarity}`,
      `Eyes:    ${bones.eye}`,
      `Hat:     ${bones.hat}`,
      `Shiny:   ${bones.shiny ? 'YES' : 'no'}`,
    ];
    detailsText.content = detailLines.join('\n');
    detailsText.fg = color;

    // Companion info
    const name = profile?.name ?? (entry.isDefault ? 'Original Pet' : entry.name);
    const personality = profile?.personality;
    let companionLines = name;
    if (personality) {
      const truncated = personality.length > 50 ? personality.slice(0, 50) + '...' : personality;
      companionLines += `\n"${truncated}"`;
    }
    companionText.content = companionLines;
    companionText.fg = HELP_COLOR;

    // Stats
    const statContent = renderStatBarsFromStats(bones.stats);
    if (statContent) {
      statsText.content = statContent;
      statsText.fg = color;
      statsText.visible = true;
    } else {
      statsText.content = '';
      statsText.visible = false;
    }
  }

  function tick(frame: number): void {
    if (!currentEntry || !spriteText) return;
    const step = IDLE_SEQUENCE[frame % IDLE_SEQUENCE.length];
    if (step === lastRenderedFrame) return;
    lastRenderedFrame = step;
    renderSpriteAtFrame(currentEntry.bones, frame);
  }

  return {
    container: containerRenderable ?? (container as unknown as OTUIRenderable),
    update,
    tick,
  };
}
