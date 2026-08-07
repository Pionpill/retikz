import type { CompileArtifact, CompileOptions, InspectionPlane, Scene } from '@retikz/core';

import { compileToScene } from '@retikz/core';

import type { VanillaRuntimeMeta } from '../spec';
import type { CommonOptions, RenderInput } from './types';

import { isVanillaFigureSpec, normalizeFigureSpec } from '../spec';
import { createEmptyRuntimeMetaSnapshot } from '../spec/internal';

/** 为非 plain spec 输入创建独立的空 runtime metadata */
export const createEmptyRuntimeMeta = (): VanillaRuntimeMeta => createEmptyRuntimeMetaSnapshot();

/** 从 vanilla runtime options 中取出 core compile options */
const toCompileOptions = (options: CommonOptions): CompileOptions => ({
  ...(options.compile ?? {}),
  ...(options.inspect === undefined ? {} : { inspection: { root: options.inspect } }),
});

/** Render input 归一结果 */
export type SceneResult = {
  scene: Scene;
  artifacts: ReadonlyArray<CompileArtifact>;
  inspection: InspectionPlane | null;
  runtimeMeta: VanillaRuntimeMeta;
};

const EMPTY_ARTIFACTS: ReadonlyArray<CompileArtifact> = Object.freeze([]);

/**
 * 入参归一成 `Scene`
 * @description 已是 `Scene`（有 `primitives`）直接用；plain spec 先规范化成 IR；
 *   否则当 `IRScene` 经 `compileToScene` 编译。`options.compile` 原样透传（`measureText` 缺省时 core 回退
 *   `fallbackMeasurer`，Node 下确定可跑）
 */
export const toSceneResult = (input: RenderInput, options: CommonOptions): SceneResult => {
  if ('primitives' in input) {
    if (options.inspect !== undefined) {
      throw new Error('Vanilla Layout Inspector cannot run from a precompiled Scene.');
    }
    return { scene: input, artifacts: EMPTY_ARTIFACTS, inspection: null, runtimeMeta: createEmptyRuntimeMeta() };
  }
  if (isVanillaFigureSpec(input)) {
    const normalized = normalizeFigureSpec(input, {
      adapters: options.adapters,
      composites: options.compile?.composites,
    });
    const baseOptions = toCompileOptions(options);
    const compileOptions = {
      ...baseOptions,
      composites: normalized.composites,
      ...(normalized.themeTokenDefinitions.length === 0
        ? {}
        : {
            themeTokenDefinitions: [...normalized.themeTokenDefinitions, ...(baseOptions.themeTokenDefinitions ?? [])],
          }),
      ...(options.inspect === undefined && normalized.inspectionRoots.length === 0
        ? {}
        : {
            inspection: {
              ...(options.inspect === undefined ? {} : { root: options.inspect }),
              ...(normalized.inspectionRoots.length === 0 ? {} : { roots: normalized.inspectionRoots }),
            },
          }),
    };
    const result = compileToScene(normalized.ir, compileOptions);
    return { ...result, runtimeMeta: normalized.runtimeMeta };
  }
  const result = compileToScene(input, toCompileOptions(options));
  return { ...result, runtimeMeta: createEmptyRuntimeMeta() };
};

export const toScene = (input: RenderInput, options: CommonOptions): Scene => toSceneResult(input, options).scene;
