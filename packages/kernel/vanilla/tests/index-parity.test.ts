import { describe, expect, it } from 'vitest';

import * as vanilla from '../src';

/**
 * 入口边界：vanilla 只导出自身 runtime / spec / legacy builder，不转手导出 core 能力。
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
      'legacyFigure',
      'draw',
    ] as const) {
      expect(vanilla[name]).toBeDefined();
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
