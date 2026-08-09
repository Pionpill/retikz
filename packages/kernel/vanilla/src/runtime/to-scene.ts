import type { CompileArtifact, CompileOptions, IRScene, Scene } from '@retikz/core';
import type { RenderReadonlyLayer } from '@retikz/render/runtime';

import { EMPTY_READONLY_LAYERS } from '@retikz/render/runtime';

import type { VanillaAuthoringSite, VanillaRuntimeMeta } from '../spec';
import type { CommonOptions, RenderInput } from './types';

import { isVanillaFigureSpec, normalizeFigureSpec } from '../spec';
import { createEmptyRuntimeMetaSnapshot } from '../spec/internal';
import {
  commitVanillaCompileOutput,
  compileVanillaWithDriver,
  createVanillaCompileDriverSession,
  defaultVanillaCompileDriver,
} from './compile-driver';

/** 为非 plain spec 输入创建独立的空 runtime metadata */
export const createEmptyRuntimeMeta = (): VanillaRuntimeMeta => createEmptyRuntimeMetaSnapshot();

/** 一份未编译输入归一后的领域中立编译材料 */
export type PreparedVanillaCompileInput = Readonly<{
  /** 可交给 Core 编译的 IR */
  source: IRScene;
  /** 本次编译使用的 Core options */
  coreOptions: CompileOptions;
  /** plain spec normalizer 报告的 authored sites */
  authoringSites: ReadonlyArray<VanillaAuthoringSite>;
  /** plain spec 运行时元数据 */
  runtimeMeta: VanillaRuntimeMeta;
}>;

/** Render input 归一结果 */
export type SceneResult = {
  /** 主 Scene */
  scene: Scene;
  /** 主编译产出的 artifacts */
  artifacts: ReadonlyArray<CompileArtifact>;
  /** 与主 Scene 同 revision 的后置只读图层 */
  layers: ReadonlyArray<RenderReadonlyLayer>;
  /** 可选编译驱动产出的诊断 */
  diagnostics: ReadonlyArray<unknown>;
  /** plain spec 运行时元数据 */
  runtimeMeta: VanillaRuntimeMeta;
};

const EMPTY_ARTIFACTS: ReadonlyArray<CompileArtifact> = Object.freeze([]);
const EMPTY_AUTHORING_SITES: ReadonlyArray<VanillaAuthoringSite> = Object.freeze([]);
const EMPTY_DIAGNOSTICS: ReadonlyArray<never> = Object.freeze([]);

/** 把 IR 或 plain spec 归一成通用编译驱动输入 */
export const prepareVanillaCompileInput = (
  input: Exclude<RenderInput, Scene>,
  options: CommonOptions,
): PreparedVanillaCompileInput => {
  if (isVanillaFigureSpec(input)) {
    const normalized = normalizeFigureSpec(input, {
      adapters: options.adapters,
      composites: options.compile?.composites,
    });
    return Object.freeze({
      source: normalized.ir,
      coreOptions: Object.freeze({
        ...options.compile,
        composites: normalized.composites,
      }),
      authoringSites: normalized.authoringSites,
      runtimeMeta: normalized.runtimeMeta,
    });
  }
  return Object.freeze({
    source: input,
    coreOptions: Object.freeze({ ...(options.compile ?? {}) }),
    authoringSites: EMPTY_AUTHORING_SITES,
    runtimeMeta: createEmptyRuntimeMeta(),
  });
};

/**
 * 入参归一成 `Scene`
 * @description 已是 `Scene`（有 `primitives`）直接用；plain spec 先规范化成 IR；
 *   否则当 `IRScene` 经 `compileToScene` 编译。`options.compile` 原样透传（`measureText` 缺省时 core 回退
 *   `fallbackMeasurer`，Node 下确定可跑）
 */
export const toSceneResult = (input: RenderInput, options: CommonOptions): SceneResult => {
  if ('primitives' in input) {
    if (options.compileDriver !== undefined) {
      throw new Error('Vanilla compile drivers require authored IR or a plain figure spec');
    }
    return {
      scene: input,
      artifacts: EMPTY_ARTIFACTS,
      layers: EMPTY_READONLY_LAYERS,
      diagnostics: EMPTY_DIAGNOSTICS,
      runtimeMeta: createEmptyRuntimeMeta(),
    };
  }
  const prepared = prepareVanillaCompileInput(input, options);
  const driverInput = Object.freeze({
    instance: Object.freeze({}),
    source: prepared.source,
    authoringSites: prepared.authoringSites,
    coreOptions: prepared.coreOptions,
  });
  const session = createVanillaCompileDriverSession(options.compileDriver ?? defaultVanillaCompileDriver, driverInput);
  const output = compileVanillaWithDriver(driverInput, session);
  commitVanillaCompileOutput(session, output);
  return {
    scene: output.primary.scene,
    artifacts: output.primary.artifacts,
    layers: output.layers,
    diagnostics: output.diagnostics,
    runtimeMeta: prepared.runtimeMeta,
  };
};

export const toScene = (input: RenderInput, options: CommonOptions): Scene => toSceneResult(input, options).scene;
