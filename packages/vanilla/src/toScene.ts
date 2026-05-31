import { type Scene, compileToScene } from '@retikz/core';
import type { CommonOptions, RenderInput } from './types';

/**
 * 入参归一成 `Scene`
 * @description 已是 `Scene`（有 `primitives`）直接用；否则当 `IR` 经 `compileToScene` 编译。
 *   `measureText` 缺省时 core 回退 `fallbackMeasurer`（近似、零 DOM），故 Node 下亦确定可运行。
 */
export const toScene = (input: RenderInput, options: CommonOptions): Scene => {
  if ('primitives' in input) return input;
  return compileToScene(input, options.measureText ? { measureText: options.measureText } : {});
};
