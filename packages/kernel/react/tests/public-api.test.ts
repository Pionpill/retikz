import { describe, expect, it } from 'vitest';

import type { ConvertIRToReactNodeOptions } from '../src';

import * as react from '../src';

const PUBLIC_RUNTIME_EXPORTS = [
  'Layout',
  'LayoutRuntimeMode',
  'Node',
  'Path',
  'Step',
  'Text',
  'Coordinate',
  'Scope',
  'Draw',
  'Circle',
  'Rectangle',
  'convertIRToReactNode',
  'RendererModeProvider',
  'AnimationModeProvider',
];

const INTERNAL_RENDER_EXPORTS = [
  'CanvasHost',
  'ArrowMarker',
  'ClipDefs',
  'PaintDefs',
  'renderPrim',
  'svgToReact',
  'browserDefaultFontFamily',
  'browserMeasurer',
  'buildPathD',
  'buildTransform',
  'formatViewBox',
];

describe('@retikz/react public API', () => {
  it('保留 Kernel、Sugar 与公开 runtime 能力', () => {
    const convertOptions: ConvertIRToReactNodeOptions = {};
    for (const name of PUBLIC_RUNTIME_EXPORTS) {
      expect(react).toHaveProperty(name);
    }
    expect(convertOptions).toEqual({});
  });

  it('不从包根暴露 renderer internals', () => {
    for (const name of INTERNAL_RENDER_EXPORTS) {
      expect(react).not.toHaveProperty(name);
    }
  });

  it('不暴露已迁移到 Vanilla 的 IR builder 与 processing owner', () => {
    for (const name of ['convertReactNodeToIR', 'buildIR', 'buildIRWithContributions', 'LayoutCompileDriver']) {
      expect(react).not.toHaveProperty(name);
    }
  });

  it('基础组件与公共入口不再暴露 inspection-specific API', () => {
    expect(react).not.toHaveProperty('defineInspector');
    expect(react).not.toHaveProperty('inspectionRoots');
  });
});
