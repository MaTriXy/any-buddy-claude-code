import { ISSUE_URL } from '@/constants.js';
import { BORDER_COLOR, DIM_COLOR } from '@/tui/builder/colors.js';
import { getCompanionName, renameCompanion } from '@/config/index.js';

/**
 * Full-screen rename TUI. Returns true if a rename was performed, false on cancel.
 */
export async function runRenameTUI(): Promise<boolean> {
  const otui = await import('@opentui/core');
  const { createCliRenderer, Box, Text, Input, InputRenderableEvents } = otui;
  type TextRenderableType = InstanceType<typeof otui.TextRenderable>;
  type InputRenderableType = InstanceType<typeof otui.InputRenderable>;

  let renderer: Awaited<ReturnType<typeof createCliRenderer>> | null = null;

  try {
    renderer = await createCliRenderer({
      exitOnCtrlC: false,
      screenMode: 'alternate-screen',
    });

    const r = renderer;

    return await new Promise<boolean>((resolve) => {
      let resolved = false;

      const currentName = getCompanionName() ?? '';

      const handleCtrlC = (key: { ctrl?: boolean; name?: string }) => {
        if (key.ctrl && key.name === 'c') finish(false);
      };

      function finish(result: boolean): void {
        if (resolved) return;
        resolved = true;
        r.keyInput.removeListener('keypress', handleCtrlC);
        r.keyInput.removeListener('keypress', handleEscape);
        r.destroy();
        renderer = null;
        resolve(result);
      }

      function handleEscape(key: { name?: string }): void {
        if (key.name === 'escape') finish(false);
      }

      const rootBox = Box(
        {
          id: 'root',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          borderStyle: 'rounded',
          border: true,
          borderColor: BORDER_COLOR,
          title: ' Rename buddy ',
          titleAlignment: 'center',
          padding: 0,
          justifyContent: 'center',
          alignItems: 'center',
        },

        Text({
          id: 'label',
          content: `  Current name: "${currentName}"`,
          fg: DIM_COLOR,
          height: 1,
        }),

        Text({ content: '', height: 1 }),

        Text({
          content: '  New name:',
          fg: '#ffffff',
          height: 1,
        }),

        Text({ content: '', height: 1 }),

        Input({
          id: 'rename-input',
          placeholder: currentName,
          width: 40,
          focusedTextColor: '#ffffff',
          placeholderColor: '#555555',
        }),

        Text({ content: '', height: 2 }),

        Text({
          id: 'status',
          content: '',
          height: 1,
        }),

        Text({ content: '', height: 1 }),

        Text({
          content: 'Enter confirm    Esc back',
          fg: DIM_COLOR,
          height: 1,
        }),
      );

      r.root.add(rootBox);

      const input = r.root.findDescendantById('rename-input') as InputRenderableType | null;
      const status = r.root.findDescendantById('status') as TextRenderableType | null;

      if (input) {
        input.focus();
        input.on(InputRenderableEvents.ENTER, () => {
          const newName = (input.value ?? '').trim();
          if (!newName) {
            if (status) {
              status.content = '  Name cannot be empty';
              status.fg = '#ff5555';
            }
            return;
          }
          if (newName === currentName) {
            finish(false);
            return;
          }
          try {
            renameCompanion(newName);
            finish(true);
          } catch (err) {
            if (status) {
              status.content = `  Error: ${(err as Error).message}`;
              status.fg = '#ff5555';
            }
          }
        });
      }

      r.keyInput.on('keypress', handleCtrlC);
      r.keyInput.on('keypress', handleEscape);
      r.auto();
    });
  } catch (err) {
    if (renderer) {
      try {
        renderer.destroy();
      } catch {
        /* ignore */
      }
    }
    console.error(`  Rename error: ${(err as Error).message}`);
    console.error(`  If this persists, please report at: ${ISSUE_URL}`);
    return false;
  }
}
