import type { CompileOptions, Scene } from '@retikz/core';

import { compileToScene } from '@retikz/core';

import type { VanillaRuntimeMeta } from './spec';
import type { CommonOptions, RenderInput } from './types';

import { FIGURE_RENDER_OPTIONS, isFigure } from './builder/is-figure';
import { isVanillaFigureSpec, normalizeFigureSpec } from './spec';

/** 空 runtime metadata，用于非 plain spec 输入。 */
export const EMPTY_RUNTIME_META: VanillaRuntimeMeta = {
  layers: [],
  identityIndex: new Map(),
  parentIndex: new Map(),
};

type CompileOptionBag = CommonOptions & {
  renderer?: 'svg' | 'canvas';
  devicePixelRatio?: number;
  animationProperties?: unknown;
};

/** 从 adapter runtime options 中剥离 renderer-only 字段，留下 core compile options。 */
const toCompileOptions = (options: CommonOptions): CompileOptions => {
  const compileOptions: CompileOptionBag = { ...options };
  delete compileOptions.idPrefix;
  delete compileOptions.width;
  delete compileOptions.height;
  delete compileOptions.animate;
  delete compileOptions.snapshotAt;
  delete compileOptions.easings;
  delete compileOptions.adapters;
  delete compileOptions.renderer;
  delete compileOptions.devicePixelRatio;
  delete compileOptions.animationProperties;
  return compileOptions;
};

/** Render input 归一结果。 */
export type SceneResult = {
  scene: Scene;
  runtimeMeta: VanillaRuntimeMeta;
};

/**
 * 入参归一成 `Scene`
 * @description 已是 `Scene`（有 `primitives`）直接用；`Figure` 先合并自身 config 与调用点 options，再取 `.ir`；
 *   否则当 `IRScene` 经 `compileToScene` 编译。剥掉 render-only 键（`idPrefix`/`width`/`height`），其余即 core
 *   `CompileOptions` 原样透传（`measureText` 缺省时 core 回退 `fallbackMeasurer`，Node 下确定可跑）。
 */
export const toSceneResult = (input: RenderInput, options: CommonOptions): SceneResult => {
  if (isFigure(input)) {
    const compileOptions = input[FIGURE_RENDER_OPTIONS](options);
    return { scene: compileToScene(input.ir, toCompileOptions(compileOptions)), runtimeMeta: EMPTY_RUNTIME_META };
  }
  if ('primitives' in input) return { scene: input, runtimeMeta: EMPTY_RUNTIME_META };
  if (isVanillaFigureSpec(input)) {
    const normalized = normalizeFigureSpec(input, { adapters: options.adapters, composites: options.composites });
    const compileOptions = toCompileOptions({ ...options, composites: normalized.composites });
    return { scene: compileToScene(normalized.ir, compileOptions), runtimeMeta: normalized.runtimeMeta };
  }
  return { scene: compileToScene(input, toCompileOptions(options)), runtimeMeta: EMPTY_RUNTIME_META };
};

export const toScene = (input: RenderInput, options: CommonOptions): Scene => toSceneResult(input, options).scene;
