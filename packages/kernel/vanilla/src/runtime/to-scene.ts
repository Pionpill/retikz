import type { CompileOptions, Scene } from '@retikz/core';

import { compileToScene } from '@retikz/core';

import type { VanillaRuntimeMeta } from '../spec';
import type { CommonOptions, RenderInput } from './types';

import { isVanillaFigureSpec, normalizeFigureSpec } from '../spec';

/** 为非 plain spec 输入创建独立的空 runtime metadata。 */
export const createEmptyRuntimeMeta = (): VanillaRuntimeMeta => ({
  layers: [],
  identityIndex: new Map(),
  parentIndex: new Map(),
});

/** 从 vanilla runtime options 中取出 core compile options。 */
const toCompileOptions = (options: CommonOptions): CompileOptions => ({ ...(options.compile ?? {}) });

/** Render input 归一结果。 */
export type SceneResult = {
  scene: Scene;
  runtimeMeta: VanillaRuntimeMeta;
};

/**
 * 入参归一成 `Scene`
 * @description 已是 `Scene`（有 `primitives`）直接用；plain spec 先规范化成 IR；
 *   否则当 `IRScene` 经 `compileToScene` 编译。`options.compile` 原样透传（`measureText` 缺省时 core 回退
 *   `fallbackMeasurer`，Node 下确定可跑）。
 */
export const toSceneResult = (input: RenderInput, options: CommonOptions): SceneResult => {
  if ('primitives' in input) return { scene: input, runtimeMeta: createEmptyRuntimeMeta() };
  if (isVanillaFigureSpec(input)) {
    const normalized = normalizeFigureSpec(input, {
      adapters: options.adapters,
      composites: options.compile?.composites,
    });
    const compileOptions = { ...toCompileOptions(options), composites: normalized.composites };
    return { scene: compileToScene(normalized.ir, compileOptions), runtimeMeta: normalized.runtimeMeta };
  }
  return { scene: compileToScene(input, toCompileOptions(options)), runtimeMeta: createEmptyRuntimeMeta() };
};

export const toScene = (input: RenderInput, options: CommonOptions): Scene => toSceneResult(input, options).scene;
