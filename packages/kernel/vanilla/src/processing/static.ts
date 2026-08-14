import type { Scene } from '@retikz/core';

import type { ProcessingOptions, ProcessingResult, ProcessingSource } from './types';

import { createEmptyInputRuntimeMetaSnapshot } from '../normalize';
import {
  commitVanillaCompileOutput,
  compileVanillaWithDriver,
  createVanillaCompileDriverSession,
  defaultVanillaCompileDriver,
} from '../runtime/compile-driver';
import { prepareProcessingInput } from './prepare';

const EMPTY_ARTIFACTS = Object.freeze([]);
const EMPTY_LAYERS = Object.freeze([]);
const EMPTY_DIAGNOSTICS = Object.freeze([]);

/** 已完成编译、等待宿主确认提交的 static processing 候选结果 */
export type PreparedStaticProcessing = Readonly<{
  /** 不可变的同 revision processing result */
  result: ProcessingResult;
  /** 在宿主完成帧提交后通知 compile driver，重复调用无副作用 */
  commit: () => void;
}>;

/** 准备一次 authored static processing，保留 compile driver 的提交时机给宿主 */
export const prepareStaticProcessing = (
  source: ProcessingSource,
  options: ProcessingOptions,
  revision: number,
): PreparedStaticProcessing => {
  const prepared = prepareProcessingInput(source, options);
  const input = Object.freeze({
    instance: Object.freeze({}),
    source: prepared.source,
    authoringSites: prepared.authoringSites,
    coreOptions: prepared.coreOptions,
  });
  const session = createVanillaCompileDriverSession(options.compileDriver ?? defaultVanillaCompileDriver, input);
  const output = compileVanillaWithDriver(input, session);
  const result = Object.freeze({
    revision,
    scene: output.primary.scene,
    compileResult: output.primary,
    artifacts: Object.freeze([...output.primary.artifacts]),
    layers: Object.freeze([...output.layers]),
    diagnostics: Object.freeze([...output.diagnostics]),
    runtimeMeta: prepared.runtimeMeta,
  });
  let committed = false;
  return Object.freeze({
    result,
    commit: () => {
      if (committed) return;
      committed = true;
      commitVanillaCompileOutput(session, output);
    },
  });
};

/** 用给定 revision 处理并立即提交一次 authored static result */
export const processToResult = (
  source: ProcessingSource,
  options: ProcessingOptions,
  revision: number,
): ProcessingResult => {
  const prepared = prepareStaticProcessing(source, options, revision);
  prepared.commit();
  return prepared.result;
};

/** 以 revision `0` 执行一次无生命周期的作者输入处理 */
export const processToStaticInputResult = (
  source: ProcessingSource,
  options: ProcessingOptions = {},
): ProcessingResult => processToResult(source, options, 0);

/** 将预编译 Scene 封装为不可更新的 static processing result */
export const processToStaticResult = (scene: Scene, _options: ProcessingOptions = {}): StaticProcessingResult => {
  void _options;
  return Object.freeze({
    revision: 0,
    scene,
    compileResult: undefined,
    artifacts: EMPTY_ARTIFACTS,
    layers: EMPTY_LAYERS,
    diagnostics: EMPTY_DIAGNOSTICS,
    runtimeMeta: createEmptyInputRuntimeMetaSnapshot(),
  });
};

/** 预编译 Scene 的固定 revision processing 结果 */
export type StaticProcessingResult = Omit<ProcessingResult, 'compileResult'> & {
  /** 预编译 Scene 没有 authored Core compile result */
  compileResult: undefined;
};
