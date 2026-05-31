import { createFigure, type Figure } from '../Figure';
import type { Child, FigureConfig } from './types';

/**
 * 命令式 builder 入口
 * @description `figure(config?)` 起 fluent（空 children，链式追加）；`figure(config, children)` 起 hyperscript。
 *   两路都返回同一 `Figure` 类型、`.ir` 一致、可混用。
 */
export function figure(config?: FigureConfig): Figure;
export function figure(config: FigureConfig, children: Child[]): Figure;
export function figure(config: FigureConfig = {}, children: Child[] = []): Figure {
  return createFigure(config, children);
}
