import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// @vitest-environment jsdom
import { coordinate, node, path, renderToSvgString, scene, scope } from '@retikz/vanilla';
import { mountSvg } from '@retikz/vanilla/dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createInspectorRegistry, PATH_INSPECTOR_KEY } from '../../src';
import { BUILTIN_INSPECTORS } from '../../src/providers';
import { createInspectionVanillaAuthoring, createInspectionVanillaDriver } from '../../src/vanilla';

const registry = createInspectorRegistry(BUILTIN_INSPECTORS);
const request = Object.freeze({ inspector: PATH_INSPECTOR_KEY, options: Object.freeze({ labels: true }) });

const content = (barrier = false) =>
  scene({
    children: [
      scope(barrier ? { authoring: createInspectionVanillaAuthoring(false) } : {}, [
        path({
          id: 'curve',
          authoring: createInspectionVanillaAuthoring(request),
          way: [
            [0, 0],
            {
              cubic: [
                [10, 12],
                [20, 12],
              ],
            },
            [30, 0],
          ],
        }),
      ]),
    ],
  });

afterEach(() => {
  vi.restoreAllMocks();
});

describe('@retikz/inspect/vanilla authoring and driver', () => {
  it('Node 与 Coordinate authored self 请求只选择各自实例', () => {
    const onCommit = vi.fn();
    const svg = renderToSvgString(
      scene({
        children: [
          node({
            id: 'selected',
            position: [0, 0],
            text: 'A',
            authoring: createInspectionVanillaAuthoring({
              inspector: { namespace: 'core', type: 'node' },
              options: true,
            }),
          }),
          node({ id: 'unselected', position: [60, 0], text: 'B' }),
          coordinate({
            id: 'point',
            position: [20, 40],
            authoring: createInspectionVanillaAuthoring({
              inspector: { namespace: 'core', type: 'coordinate' },
              options: { labels: true },
            }),
          }),
        ],
      }),
      { compileDriver: createInspectionVanillaDriver({ registry, onCommit }) },
    );
    expect(svg).toContain('data-retikz-readonly-layer');
    const entries = onCommit.mock.calls[0]?.[0].inspection.entries;
    expect(entries.some((entry: { owner: { kind: string } }) => entry.owner.kind === 'node')).toBe(true);
    expect(entries.some((entry: { owner: { kind: string } }) => entry.owner.kind === 'coordinate')).toBe(true);
    expect(
      entries.every(
        (entry: { occurrence: { sourcePath: string } }) => entry.occurrence.sourcePath !== 'children[1].node',
      ),
    ).toBe(true);
  });
  it('可选 authoring 复用基础 InputScene 并在 SSR 输出只读图层', () => {
    const onCommit = vi.fn();
    const svg = renderToSvgString(content(), {
      output: { idPrefix: 'inspect-vanilla' },
      compileDriver: createInspectionVanillaDriver({ registry, onCommit }),
    });

    expect(svg).toContain('data-retikz-readonly-layer');
    expect(svg).toContain('hsl(210, 38%, 48%)');
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit.mock.calls[0]?.[0].inspection?.entries.length).toBeGreaterThan(0);
  });

  it('retained mount 同 revision 提交 plane 与 diagnostics', () => {
    const onCommit = vi.fn();
    const onDiagnostic = vi.fn();
    const view = mountSvg(document.createElement('div'), content(), {
      compileDriver: createInspectionVanillaDriver({ registry, onCommit, onDiagnostic }),
    });

    expect(view.root.outerHTML).toContain('data-retikz-readonly-layer');
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onDiagnostic).not.toHaveBeenCalled();
    view.dispose();
  });

  it('Scope barrier 阻止后代 Path request 重新开启', () => {
    const svg = renderToSvgString(content(true), {
      compileDriver: createInspectionVanillaDriver({ registry }),
    });

    expect(svg).not.toContain('data-retikz-readonly-layer');
    expect(svg).not.toContain('hsl(210, 38%, 48%)');
  });

  it('Inspect 根入口源码不静态加载 Vanilla optional peer', () => {
    const rootEntry = readFileSync(resolve(process.cwd(), 'src/index.ts'), 'utf8');

    expect(rootEntry).not.toMatch(/@retikz\/vanilla|['"]\.\/vanilla/);
  });
});
