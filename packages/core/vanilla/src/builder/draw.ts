import { parseWay } from '@retikz/core';
import type { Child, DrawConfig, Way } from './types';

/**
 * 构造一个 path IR 子节点
 * @description `way` 经 core `parseWay` 解析成 IRStep 序列（与 React `<Draw way>` 同一解析、同一全集，零漂移）；
 *   `config` 是 path 级样式（arrow / stroke / dashPattern / fill …），原样并入。
 */
export const draw = (way: Way, config?: DrawConfig): Child => ({
  type: 'path',
  children: parseWay(way),
  ...config,
});
