import { parsePathThickness, parseWay } from '@retikz/core';

import type { Child, DrawConfig, Way } from './types';

/**
 * 构造一个 path IR 子节点
 * @description `way` 经 core `parseWay` 解析成 IRStep 序列（与 React `<Draw way>` 同一解析、同一全集，零漂移）；
 *   `config` 是 path 级样式（marks / stroke / dashPattern / dashOffset / fill …），其中 `thickness` 会先解析成 `strokeWidth`。
 */
export const draw = (way: Way, config?: DrawConfig): Child => {
  const { thickness: _thickness, ...restConfig } = config ?? {};
  void _thickness;
  return {
    type: 'path',
    children: parseWay(way),
    ...restConfig,
    ...parsePathThickness(config ?? {}),
  };
};
