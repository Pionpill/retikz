// @vitest-environment jsdom
import type { FC } from 'react';
import type { Root } from 'react-dom/client';

import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { act } from 'react-dom/test-utils';
import { afterEach, describe, expect, it } from 'vitest';

import type { ComponentRenderSource } from '../../src/modules/docs/components/component-preview';
import type { SourcePanelState } from '../../src/modules/docs/components/component-preview/source-panel';

import { useSourcePanelState } from '../../src/modules/docs/components/component-preview/source-panel';

type ProbeProps = {
  source: ComponentRenderSource;
  defaultSourceFile?: string;
  onState: (state: SourcePanelState) => void;
};

const Probe: FC<ProbeProps> = props => {
  const { source, defaultSourceFile, onState } = props;
  const state = useSourcePanelState(source, defaultSourceFile);
  onState(state);
  return null;
};

type StabilityProbeProps = ProbeProps;

const StabilityProbe: FC<StabilityProbeProps> = props => {
  const { source, onState } = props;
  const [, setParentRevision] = useState(0);
  const state = useSourcePanelState(source);
  onState(state);

  return (
    <button type="button" onClick={() => setParentRevision(revision => revision + 1)}>
      rerender parent
    </button>
  );
};

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const renderedRoots: Array<Root> = [];

afterEach(async () => {
  for (const root of renderedRoots.splice(0)) {
    await act(() => root.unmount());
  }
  document.body.replaceChildren();
});

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

  it('按文件名初始化 React 源码视图的默认文件', () => {
    const source: ComponentRenderSource = {
      react: {
        files: [
          { filename: 'example.demo.tsx', code: 'export default null;', lang: 'tsx', isMain: true },
          { filename: 'example-preview.tsx', code: 'export const renderExample = () => null;', lang: 'tsx' },
        ],
      },
    };
    let latest: SourcePanelState | null = null;

    renderToStaticMarkup(
      <Probe source={source} defaultSourceFile="example-preview.tsx" onState={state => (latest = state)} />,
    );

    expect(latest).not.toBeNull();
    const state: SourcePanelState = latest!;
    expect(state.activeFileIndex).toBe(1);
    expect(state.activeFile?.filename).toBe('example-preview.tsx');
  });

  it('默认源码文件不存在时回退主 demo', () => {
    const source: ComponentRenderSource = {
      react: {
        files: [
          { filename: 'example.demo.tsx', code: 'export default null;', lang: 'tsx', isMain: true },
          { filename: 'example-preview.tsx', code: 'export const renderExample = () => null;', lang: 'tsx' },
        ],
      },
    };
    let latest: SourcePanelState | null = null;

    renderToStaticMarkup(
      <Probe source={source} defaultSourceFile="missing-preview.tsx" onState={state => (latest = state)} />,
    );

    expect(latest!.activeFileIndex).toBe(0);
    expect(latest!.activeFile?.filename).toBe('example.demo.tsx');
  });

  it('按视图独立保存源码文件位置', async () => {
    const source: ComponentRenderSource = {
      react: {
        files: [
          { filename: 'example.demo.tsx', code: 'export default null;', lang: 'tsx', isMain: true },
          { filename: 'example-preview.tsx', code: 'export const renderExample = () => null;', lang: 'tsx' },
        ],
      },
      vanilla: {
        files: [
          { filename: 'example.vanilla.ts', code: 'render({});', lang: 'ts', isMain: true },
          { filename: 'example-preview.tsx', code: 'export const renderExample = () => null;', lang: 'tsx' },
        ],
      },
      ir: { files: [{ filename: 'example.ir.json', code: '{}', lang: 'json', isMain: true }] },
    };
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    renderedRoots.push(root);
    let latest: SourcePanelState | null = null;

    await act(() =>
      root.render(
        <Probe source={source} defaultSourceFile="example-preview.tsx" onState={state => (latest = state)} />,
      ),
    );

    expect(latest!.activeFile?.filename).toBe('example-preview.tsx');

    await act(() => latest!.setView('vanilla'));
    expect(latest!.activeFile?.filename).toBe('example.vanilla.ts');

    await act(() => latest!.setView('ir'));
    expect(latest!.activeFile?.filename).toBe('example.ir.json');

    await act(() => latest!.setView('react'));
    expect(latest!.activeFile?.filename).toBe('example-preview.tsx');
  });

  it('父级无关状态更新时保持 source state 引用稳定', async () => {
    const source: ComponentRenderSource = {
      react: { files: [{ filename: 'example.tsx', code: 'export default null;', lang: 'tsx' }] },
    };
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    renderedRoots.push(root);
    const snapshots: Array<SourcePanelState> = [];

    await act(() => root.render(<StabilityProbe source={source} onState={state => snapshots.push(state)} />));
    const initialState = snapshots.at(-1);

    await act(() => container.querySelector('button')?.click());

    expect(snapshots.at(-1)).toBe(initialState);
  });
});
