import type { IRCoordinate, IRNode, IRPath, PathThicknessValue, WayDSL } from '@retikz/core';

import { parseWay, THICKNESS_TO_WIDTH } from '@retikz/core';

import type {
  VanillaChildSpec,
  VanillaEmbedSpec,
  VanillaFigureSpec,
  VanillaLayerSpec,
  VanillaPathSpec,
  VanillaScopeSpec,
} from './types';

import { cloneThemeInput } from './theme-input';

/** Vanilla 图形辅助函数的输入配置 */
export type VanillaFigureInput = Pick<VanillaFigureSpec, 'id' | 'theme' | 'viewBox' | 'animations' | 'authoring'> &
  ({ children?: Array<VanillaChildSpec>; layers?: never } | { layers: Array<VanillaLayerSpec>; children?: never });

/** Vanilla 节点普通规格辅助函数 */
type NodeFn = {
  (): IRNode;
  (id: string): IRNode;
  (id: string, config: Omit<IRNode, 'type' | 'id'>): IRNode;
  (config: Omit<IRNode, 'type' | 'id'>): IRNode;
};

/** 创建 Vanilla 节点 IR；支持空配置、id 简写与完整配置 */
export const node: NodeFn = (
  idOrConfig?: string | Omit<IRNode, 'type' | 'id'>,
  maybeConfig?: Omit<IRNode, 'type' | 'id'>,
): IRNode => {
  const named = typeof idOrConfig === 'string';
  const config = named ? maybeConfig : idOrConfig;
  return {
    type: 'node',
    ...(named ? { id: idOrConfig } : {}),
    ...config,
  } as IRNode;
};

/** Vanilla 坐标普通规格辅助函数 */
export const coordinate = (id: string, config: Omit<IRCoordinate, 'type' | 'id'>): IRCoordinate => ({
  type: 'coordinate',
  id,
  ...config,
});

/** Vanilla 路径辅助函数的配置 */
export type VanillaPathConfig = Omit<IRPath, 'type' | 'id' | 'children'> & {
  /** 路径 id，作为公开身份标识 */
  id?: string;
  /** TikZ 风格的路径走向简写 */
  way: WayDSL;
  /** 路径描边宽度语法糖 */
  thickness?: PathThicknessValue;
  /** 可选编译驱动自行解释的运行时载荷，不进入 Core IR */
  authoring?: unknown;
};

type AnonymousVanillaPathConfig = Omit<VanillaPathConfig, 'id'>;

/** Vanilla 路径普通规格辅助函数 */
type PathFn = {
  (id: string, config: AnonymousVanillaPathConfig): VanillaPathSpec;
  (config: AnonymousVanillaPathConfig): VanillaPathSpec;
};

/** 从 way DSL 创建 Vanilla 路径 IR，并解析路径粗细语法糖 */
export const path: PathFn = (
  idOrConfig: string | AnonymousVanillaPathConfig,
  maybeConfig?: AnonymousVanillaPathConfig,
): VanillaPathSpec => {
  const named = typeof idOrConfig === 'string';
  const config = named ? maybeConfig : idOrConfig;
  if (config === undefined) throw new Error('path: config is required.');
  const { way, thickness: _thickness, ...restConfig } = config;
  void _thickness;
  return {
    type: 'path',
    ...(named ? { id: idOrConfig } : {}),
    children: parseWay(way),
    ...restConfig,
    ...(config.strokeWidth === undefined
      ? config.thickness === undefined
        ? {}
        : { strokeWidth: THICKNESS_TO_WIDTH[config.thickness] }
      : { strokeWidth: config.strokeWidth }),
  };
};

/** Vanilla 作用域普通规格辅助函数 */
export const scope = (
  config: Omit<VanillaScopeSpec, 'type' | 'children'>,
  children: Array<VanillaChildSpec>,
): VanillaScopeSpec => {
  const { theme, ...rest } = config;
  return {
    type: 'scope',
    ...rest,
    ...(theme === undefined ? {} : { theme: cloneThemeInput(theme) }),
    children,
  };
};

/** Vanilla 分层普通规格辅助函数 */
export const layer = (
  id: string,
  optionsOrChildren: Omit<VanillaLayerSpec, 'type' | 'id' | 'children'> | Array<VanillaChildSpec>,
  children?: Array<VanillaChildSpec>,
): VanillaLayerSpec => {
  const options = Array.isArray(optionsOrChildren) ? {} : optionsOrChildren;
  const layerChildren = Array.isArray(optionsOrChildren) ? optionsOrChildren : (children ?? []);
  return { type: 'layer', id, ...options, children: layerChildren };
};

/** Vanilla Tier2 嵌入节点普通规格辅助函数 */
export const embed = <TProps = Record<string, unknown>>(
  kind: string,
  id: string,
  props: TProps,
  authoring?: unknown,
): VanillaEmbedSpec<TProps> => ({
  type: 'embed',
  kind,
  id,
  props,
  ...(authoring === undefined ? {} : { authoring }),
});

/** Vanilla 图形普通规格辅助函数 */
export const figure = (input?: VanillaFigureInput | Array<VanillaChildSpec>): VanillaFigureSpec => {
  if (Array.isArray(input)) return { type: 'figure', version: 1, children: input };
  const base = {
    type: 'figure' as const,
    version: 1 as const,
    ...(input?.id !== undefined ? { id: input.id } : {}),
    ...(input?.theme !== undefined ? { theme: cloneThemeInput(input.theme) } : {}),
    ...(input?.viewBox !== undefined ? { viewBox: input.viewBox } : {}),
    ...(input?.animations !== undefined ? { animations: input.animations } : {}),
    ...(input?.authoring !== undefined ? { authoring: input.authoring } : {}),
  };
  if (input?.layers !== undefined) return { ...base, layers: input.layers };
  return { ...base, children: input?.children ?? [] };
};
