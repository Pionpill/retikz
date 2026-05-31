import { type Figure, createFigure } from '../Figure';
import type { Child, FigureConfig } from './types';

/**
 * 命令式 builder 入口
 * @description 不传 children 起 fluent（空 children，链式追加）；传 children 起 hyperscript。两路都返回同一
 *   `Figure` 类型、`.ir` 一致、可混用。单签名默认参数同时接受 `figure()` / `figure(config)` / `figure(config, children)`。
 */
export const figure = (config: FigureConfig = {}, children: Array<Child> = []): Figure => createFigure(config, children);
