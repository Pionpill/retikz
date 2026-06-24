import { type Figure, createFigure } from '../figure';
import type { Child, FigureConfig } from './types';

/**
 * `figure` 的重载签名
 * @description children-array 形态排在 config 之前——`FigureConfig` 字段全可选，数组也结构上「可赋给」它，
 *   顺序反了会让 `figure([...])` 误匹配 config 重载。
 */
type FigureFn = {
  (): Figure;
  (children: Array<Child>): Figure;
  (config: FigureConfig): Figure;
  (config: FigureConfig, children: Array<Child>): Figure;
};

/**
 * 命令式 builder 入口
 * @description 四种调用：`figure()` 空图；`figure(children)` 省略 config 直接传子节点；`figure(config)` 起
 *   fluent；`figure(config, children)` hyperscript。都返回同一 `Figure`、`.ir` 一致、可混用。
 */
export const figure: FigureFn = (
  configOrChildren?: FigureConfig | Array<Child>,
  children?: Array<Child>,
): Figure => {
  if (Array.isArray(configOrChildren)) return createFigure({}, configOrChildren);
  return createFigure(configOrChildren ?? {}, children ?? []);
};
