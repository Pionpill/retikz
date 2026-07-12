import type { FC } from 'react';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { ComponentRenderSource } from '../../src/modules/docs/components/component-preview';
import type { SourcePanelState } from '../../src/modules/docs/components/component-preview/source-panel';

import { useSourcePanelState } from '../../src/modules/docs/components/component-preview/source-panel';

type ProbeProps = {
  source: ComponentRenderSource;
  onState: (state: SourcePanelState) => void;
};

const Probe: FC<ProbeProps> = props => {
  const { source, onState } = props;
  const state = useSourcePanelState(source);
  onState(state);
  return null;
};

describe('useSourcePanelState', () => {
  it('提供固定排序的视图、三行 teaser 与默认 added diff', () => {
    const expectedAddedLines = ['context', 'added', 'context'];
    const source: ComponentRenderSource = {
      react: {
        files: [
          {
            filename: 'example.tsx',
            code: ['const first = 1;', 'const added = 2;', 'const last = 3;', 'const hidden = 4;'].join('\n'),
            lang: 'tsx',
            diff: {
              code: ['const first = 1;', 'const removed = 0;', 'const added = 2;', 'const last = 3;'].join('\n'),
              lineKinds: ['context', 'removed', 'added', 'context'],
            },
          },
        ],
      },
      vanilla: { files: [{ filename: 'example.ts', code: 'const vanilla = true;', lang: 'ts' }] },
      ir: { files: [{ filename: 'example.json', code: '{}', lang: 'json' }] },
    };
    let latest: SourcePanelState | null = null;

    renderToStaticMarkup(<Probe source={source} onState={state => (latest = state)} />);

    expect(latest).not.toBeNull();
    const state: SourcePanelState = latest!;
    expect(state.views).toEqual(['react', 'vanilla', 'ir']);
    expect(state.display(false).code.split('\n')).toHaveLength(3);
    expect(state.display(false).lineKinds).toBeUndefined();
    expect(state.display(true).lineKinds).toEqual(expectedAddedLines);
  });

  it('为卡片与弹窗分别创建源码 controller', () => {
    const source: ComponentRenderSource = {
      react: { files: [{ filename: 'example.tsx', code: 'export default null;', lang: 'tsx' }] },
    };
    let card: SourcePanelState | null = null;
    let dialog: SourcePanelState | null = null;

    renderToStaticMarkup(<Probe source={source} onState={state => (card = state)} />);
    renderToStaticMarkup(<Probe source={source} onState={state => (dialog = state)} />);

    expect(card).not.toBeNull();
    expect(dialog).not.toBeNull();
    expect(card!.setView).not.toBe(dialog!.setView);
    expect(card!.setActiveFileIndex).not.toBe(dialog!.setActiveFileIndex);
    expect(card!.setDiffMode).not.toBe(dialog!.setDiffMode);
    expect(card!.copyActiveFile).not.toBe(dialog!.copyActiveFile);
  });
});
