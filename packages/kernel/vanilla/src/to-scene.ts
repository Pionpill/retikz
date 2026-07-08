import type { Scene } from '@retikz/core';

import { compileToScene } from '@retikz/core';

import type { CommonOptions, RenderInput } from './types';

import { FIGURE_RENDER_OPTIONS, isFigure } from './builder/is-figure';

/**
 * 入参归一成 `Scene`
 * @description 已是 `Scene`（有 `primitives`）直接用；`Figure` 先合并自身 config 与调用点 options，再取 `.ir`；
 *   否则当 `IRScene` 经 `compileToScene` 编译。剥掉 render-only 键（`idPrefix`/`width`/`height`），其余即 core
 *   `CompileOptions` 原样透传（`measureText` 缺省时 core 回退 `fallbackMeasurer`，Node 下确定可跑）。
 */
export const toScene = (input: RenderInput, options: CommonOptions): Scene => {
  if (isFigure(input)) {
    const compileOptions: CommonOptions = input[FIGURE_RENDER_OPTIONS](options);
    delete compileOptions.idPrefix;
    delete compileOptions.width;
    delete compileOptions.height;
    return compileToScene(input.ir, compileOptions);
  }
  if ('primitives' in input) return input;
  const compileOptions: CommonOptions = { ...options };
  delete compileOptions.idPrefix;
  delete compileOptions.width;
  delete compileOptions.height;
  return compileToScene(input, compileOptions);
};
