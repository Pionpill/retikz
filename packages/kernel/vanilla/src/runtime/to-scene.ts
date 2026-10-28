import type { CompileArtifact, CompileResult, Scene } from '@retikz/core';
import type { RenderReadonlyLayer } from '@retikz/render/runtime';
import { EMPTY_READONLY_LAYERS } from '@retikz/render/runtime';

import { RetikzVanillaError, RetikzVanillaErrorCode } from '../error';
import type { InputRuntimeMeta } from '../normalize';
import { createEmptyInputRuntimeMetaSnapshot } from '../normalize';
import { processToStaticInputResult } from '../processing';
import type { CommonOptions, InputRender } from './types';

/** 为非 InputScene 输入创建独立的空 runtime metadata */
export const createEmptyRuntimeMeta = (): InputRuntimeMeta => createEmptyInputRuntimeMetaSnapshot();

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
  /** InputScene 运行时元数据 */
  runtimeMeta: InputRuntimeMeta;
};

const EMPTY_ARTIFACTS: ReadonlyArray<CompileArtifact> = Object.freeze([]);

const EMPTY_DIAGNOSTICS: ReadonlyArray<never> = Object.freeze([]);

/**
 * 入参归一成 `Scene`
 * @description 已是 `Scene`（有 `primitives`）直接用；InputScene 先规范化成 IR；
 *   否则当 `IRScene` 经 `compileToScene` 编译。`InputScene` 会先进入 processing 归一与 resolver。
 *   显式测量器优先，否则按需使用浏览器 Canvas；不可用时使用 Core 估算器
 */
export const toSceneResult = (input: InputRender, options: CommonOptions): SceneResult => {
  if ('primitives' in input) {
    if (options.compileDriver !== undefined) {
      throw new RetikzVanillaError(
        RetikzVanillaErrorCode.Runtime,
        'Vanilla compile drivers require authored IR or an InputScene',
      );
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
