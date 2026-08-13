import type { CompileArtifact, CompileOptions, CompileResult, IRScene, Scene } from '@retikz/core';
import type { RenderReadonlyLayer } from '@retikz/render/runtime';

import { EMPTY_READONLY_LAYERS } from '@retikz/render/runtime';

import type { InputAuthoringSite, InputRuntimeMeta } from '../normalize';
import type { CommonOptions, RenderInput } from './types';

import { createEmptyInputRuntimeMetaSnapshot } from '../normalize';
import { prepareProcessingInput, processToStaticInputResult } from '../processing';

/** 为非 InputScene 输入创建独立的空 runtime metadata */
export const createEmptyRuntimeMeta = (): InputRuntimeMeta => createEmptyInputRuntimeMetaSnapshot();

/** 一份未编译输入归一后的领域中立编译材料 */
export type PreparedVanillaCompileInput = Readonly<{
  /** 可交给 Core 编译的 IR */
  source: IRScene;
  /** 本次编译使用的 Core options */
  coreOptions: CompileOptions;
  /** plain spec normalizer 报告的 authored sites */
  authoringSites: ReadonlyArray<InputAuthoringSite>;
  /** plain spec 运行时元数据 */
  runtimeMeta: InputRuntimeMeta;
}>;

/** Render input 归一结果 */
export type SceneResult = {
  /** 主 Scene */
  scene: Scene;
  /** 主编译产出的 artifacts */
  artifacts: ReadonlyArray<CompileArtifact>;
  /** authored input 的完整 Core compile result；预编译 Scene 输入为 undefined */
  compileResult: CompileResult | undefined;
  /** 与主 Scene 同 revision 的后置只读图层 */
  layers: ReadonlyArray<RenderReadonlyLayer>;
  /** 可选编译驱动产出的诊断 */
  diagnostics: ReadonlyArray<unknown>;
  /** plain spec 运行时元数据 */
  runtimeMeta: InputRuntimeMeta;
};

const EMPTY_ARTIFACTS: ReadonlyArray<CompileArtifact> = Object.freeze([]);
const EMPTY_DIAGNOSTICS: ReadonlyArray<never> = Object.freeze([]);

/** 把 IR 或 InputScene 归一成通用编译驱动输入 */
export const prepareVanillaCompileInput = (
  input: Exclude<RenderInput, Scene>,
  options: CommonOptions,
): PreparedVanillaCompileInput => {
  const prepared = prepareProcessingInput(input, options);
  return Object.freeze({
    source: prepared.source,
    coreOptions: prepared.coreOptions,
    authoringSites: prepared.authoringSites,
    runtimeMeta: prepared.runtimeMeta,
  });
};

/**
 * 入参归一成 `Scene`
 * @description 已是 `Scene`（有 `primitives`）直接用；InputScene 先规范化成 IR；
 *   否则当 `IRScene` 经 `compileToScene` 编译。`InputScene` 会先进入 processing 归一与 resolver。`options.compile` 原样透传（`measureText` 缺省时 core 回退
 *   `fallbackMeasurer`，Node 下确定可跑）
 */
export const toSceneResult = (input: RenderInput, options: CommonOptions): SceneResult => {
  if ('primitives' in input) {
    if (options.compileDriver !== undefined) {
      throw new Error('Vanilla compile drivers require authored IR or an InputScene');
    }
    return {
      scene: input,
      artifacts: EMPTY_ARTIFACTS,
      compileResult: undefined,
      layers: EMPTY_READONLY_LAYERS,
      diagnostics: EMPTY_DIAGNOSTICS,
      runtimeMeta: createEmptyRuntimeMeta(),
    };
  }
  const result = processToStaticInputResult(input, options);
  return {
    scene: result.scene,
    artifacts: result.artifacts,
    compileResult: result.compileResult,
    layers: result.layers,
    diagnostics: result.diagnostics,
    runtimeMeta: result.runtimeMeta,
  };
};
