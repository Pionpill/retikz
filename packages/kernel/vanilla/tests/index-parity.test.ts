import { describe, expect, it } from 'vitest';

import * as vanilla from '../src';

/**
 * 入口边界：vanilla 只导出自身 runtime / spec，不转手导出 core 能力。
 */
describe('@retikz/vanilla 入口边界', () => {
  it('own-runtime-and-spec：自身公开值挂在命名空间上', () => {
    for (const name of [
      'renderToSvgString',
      'mount',
      'mountSvg',
      'mountCanvas',
      'hydrate',
      'figure',
      'layer',
      'node',
      'path',
      'coordinate',
      'scope',
      'embed',
      'VanillaLayerCache',
    ] as const) {
      expect(vanilla[name]).toBeDefined();
    }
  });

  it('no-legacy-builder：不再导出旧命令式 builder 或内部 Figure 协议', () => {
    const namespace = vanilla as Record<string, unknown>;
    for (const name of ['legacyFigure', 'draw', 'FIGURE_BRAND', 'FIGURE_RENDER_OPTIONS', 'toScene']) {
      expect(namespace[name]).toBeUndefined();
    }
  });

  it('no-core-reexport：不从 vanilla 转手导出 core 注册器或 way 常量', () => {
    const namespace = vanilla as Record<string, unknown>;
    for (const name of [
      'DrawWay',
      'defineArrow',
      'defineBoundary',
      'defineClip',
      'definePathGenerator',
      'definePathKind',
      'definePattern',
      'defineRibbonWidthProfile',
      'fadeIn',
      'drawOn',
      'stagger',
    ]) {
      expect(namespace[name]).toBeUndefined();
    }
  });
});
