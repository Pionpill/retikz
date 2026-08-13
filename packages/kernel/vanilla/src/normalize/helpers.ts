import type { IRCoordinate } from '@retikz/core';

import type { InputEmbed } from './embed';
import type { InputNode } from './node';
import type { InputPath } from './path';
import type { InputLayer, InputScene } from './scene';
import type { InputScope } from './scope';

/** 创建作者侧节点输入，支持 id 简写与完整配置 */
export const node = (
  idOrConfig?: string | Omit<InputNode, 'type' | 'id'>,
  maybeConfig?: Omit<InputNode, 'type' | 'id'>,
): InputNode => {
  const named = typeof idOrConfig === 'string';
  const config = named ? maybeConfig : idOrConfig;
  if (config === undefined) {
    throw new Error('node: config with position is required');
  }
  return {
    ...(named ? { id: idOrConfig } : {}),
    ...config,
  };
};

/** 创建作者侧坐标 Source IR */
export const coordinate = (id: string, config: Omit<IRCoordinate, 'type' | 'id'>): IRCoordinate => ({
  type: 'coordinate',
  id,
  ...config,
});

/** 创建作者侧路径输入，支持 id 简写与完整配置 */
export const path = (
  idOrConfig: string | Omit<InputPath, 'type' | 'id'>,
  maybeConfig?: Omit<InputPath, 'type' | 'id'>,
): InputPath => {
  const named = typeof idOrConfig === 'string';
  const config = named ? maybeConfig : idOrConfig;
  if (config === undefined) {
    throw new Error('path: config is required');
  }
  return {
    ...(named ? { id: idOrConfig } : {}),
    ...config,
  };
};

/** 创建作者侧 Scope 输入 */
export const scope = (
  config: Omit<InputScope, 'type' | 'children'>,
  children: ReadonlyArray<InputScope['children'][number]>,
): InputScope => ({ ...config, children });

/** 创建作者侧 Layer 输入 */
export const layer = (
  id: string,
  optionsOrChildren: Omit<InputLayer, 'type' | 'id' | 'children'> | ReadonlyArray<InputLayer['children'][number]>,
  children?: ReadonlyArray<InputLayer['children'][number]>,
): InputLayer => {
  const options = Array.isArray(optionsOrChildren) ? {} : optionsOrChildren;
  const layerChildren = Array.isArray(optionsOrChildren) ? optionsOrChildren : (children ?? []);
  return { type: 'layer', id, ...options, children: layerChildren };
};

/** 创建作者侧 Tier 2 嵌入输入 */
export const embed = <TProps = Record<string, unknown>>(
  kind: string,
  id: string,
  props: TProps,
  authoring?: unknown,
): InputEmbed<TProps> => ({
  type: 'embed',
  kind,
  id,
  props,
  ...(authoring === undefined ? {} : { authoring }),
});

/** 创建作者侧 Scene 输入 */
export const scene = (
  input: Omit<Extract<InputScene, { children: ReadonlyArray<unknown> }>, 'type' | 'version'>,
): InputScene => ({
  ...input,
  children: input.children,
});
