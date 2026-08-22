// @vitest-environment jsdom
import { path, renderToSvgString, scene, scope } from '@retikz/vanilla';
import { mountSvg } from '@retikz/vanilla/dom';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BUILTIN_INSPECTORS, createInspectorRegistry, STROKE_PATH_INSPECTOR_KEY } from '../../src';
import { createInspectionVanillaAuthoring, createInspectionVanillaDriver } from '../../src/vanilla';

const registry = createInspectorRegistry(BUILTIN_INSPECTORS);
const request = Object.freeze({ inspector: STROKE_PATH_INSPECTOR_KEY, options: Object.freeze({ labels: true }) });

const content = (barrier = false) =>
  scene({
    children: [
      scope(barrier ? { authoring: createInspectionVanillaAuthoring(false) } : {}, [
        path('curve', {
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
