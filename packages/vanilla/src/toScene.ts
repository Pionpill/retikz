import { type CompileOptions, type IR, type Scene, compileToScene } from '@retikz/core';
import type { CommonOptions } from './types';

/**
 * 入参归一成 `Scene`
 * @description 已是 `Scene`（有 `primitives`）直接用；否则当 `IR` 经 `compileToScene` 编译。剥掉 render-only 键
 *   （`idPrefix`/`width`/`height`），其余即 core `CompileOptions` 原样透传（`measureText` 缺省时 core 回退
 *   `fallbackMeasurer`，Node 下确定可跑）。注：调用方须先把 `Figure` 解成 `ir`，此处只认 `IR | Scene`。
 */
export const toScene = (input: Scene | IR, options: CommonOptions): Scene => {
  if ('primitives' in input) return input;
  const { idPrefix: _idPrefix, width: _width, height: _height, ...compile } = options;
  const compileOptions: CompileOptions = compile;
  return compileToScene(input, compileOptions);
};
