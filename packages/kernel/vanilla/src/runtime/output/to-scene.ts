import type { Scene } from '@retikz/core';
import type { CompositeArtifact } from '@retikz/reconciler';

import { RetikzVanillaError, RetikzVanillaErrorCode } from '../../error';
import type { SingleSceneSource } from '../_input';
import type { ProcessingResult } from '../compile';
import { compileToScene } from '../compile';
import type { CommonOptions, InputRender } from './types';

/** 预编译 Scene 或作者输入的完整编译结果 */
export type SceneResult = Scene | ProcessingResult;

/** 裸 Scene 没有编译产物，所有适配入口复用同一空集合 */
export const EMPTY_ARTIFACTS: ReadonlyArray<CompositeArtifact> = Object.freeze([]);

/** 从直接输入或编译结果读取渲染所需的 Scene */
export const sceneOfResult = (result: SceneResult): Scene =>
  'primitives' in result ? result : result.compileResult.scene;

/** 已编译的 Scene 原样透传；作者声明经一次编译返回完整处理结果 */
export function toSceneResult(input: Scene, options: CommonOptions): Scene;
export function toSceneResult(input: SingleSceneSource, options: CommonOptions): ProcessingResult;
export function toSceneResult(input: InputRender, options: CommonOptions): SceneResult;
export function toSceneResult(input: InputRender, options: CommonOptions): SceneResult {
  if ('primitives' in input) {
    if (options.compileResultExtension !== undefined) {
      throw new RetikzVanillaError(
        RetikzVanillaErrorCode.Runtime,
        'Vanilla compile result extensions require authored IR or an InputScene',
      );
    }

    return input;
  }

  return compileToScene(input, options);
}
