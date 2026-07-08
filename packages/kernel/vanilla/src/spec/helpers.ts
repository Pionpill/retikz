import type { IRChild, IRCoordinate, IRNode, IRPath, IRScope, PathThicknessValue, WayDSL } from '@retikz/core';

import { parsePathThickness, parseWay } from '@retikz/core';

import type { VanillaChildSpec, VanillaEmbedSpec, VanillaFigureSpec, VanillaLayerSpec } from './types';

/** Vanilla figure helper input. */
export type VanillaFigureInput = Pick<VanillaFigureSpec, 'id' | 'viewBox' | 'animations'> &
  ({ children?: Array<VanillaChildSpec>; layers?: never } | { layers: Array<VanillaLayerSpec>; children?: never });

/** Vanilla node plain spec helper。 */
type NodeFn = {
  (): IRNode;
  (id: string): IRNode;
  (id: string, config: Omit<IRNode, 'type' | 'id'>): IRNode;
  (config: Omit<IRNode, 'type' | 'id'>): IRNode;
};

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

/** Vanilla coordinate plain spec helper。 */
export const coordinate = (id: string, config: Omit<IRCoordinate, 'type' | 'id'>): IRCoordinate => ({
  type: 'coordinate',
  id,
  ...config,
});

/** Vanilla path helper 的配置。 */
export type VanillaPathConfig = Omit<IRPath, 'type' | 'id' | 'children'> & {
  /** Path id，作为公开 identity。 */
  id?: string;
  /** TikZ-like way shorthand。 */
  way: WayDSL;
  /** Path stroke width sugar。 */
  thickness?: PathThicknessValue;
};

type AnonymousVanillaPathConfig = Omit<VanillaPathConfig, 'id'>;

/** Vanilla path plain spec helper。 */
type PathFn = {
  (id: string, config: AnonymousVanillaPathConfig): IRPath;
  (config: AnonymousVanillaPathConfig): IRPath;
};

export const path: PathFn = (
  idOrConfig: string | AnonymousVanillaPathConfig,
  maybeConfig?: AnonymousVanillaPathConfig,
): IRPath => {
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
    ...parsePathThickness(config),
  };
};

/** Vanilla scope plain spec helper。 */
export const scope = (config: Omit<IRScope, 'type' | 'children'>, children: Array<VanillaChildSpec>): IRScope => ({
  type: 'scope',
  ...config,
  children: children as Array<IRChild>,
});

/** Vanilla layer plain spec helper。 */
export const layer = (
  id: string,
  optionsOrChildren: Omit<VanillaLayerSpec, 'type' | 'id' | 'children'> | Array<VanillaChildSpec>,
  children?: Array<VanillaChildSpec>,
): VanillaLayerSpec => {
  const options = Array.isArray(optionsOrChildren) ? {} : optionsOrChildren;
  const layerChildren = Array.isArray(optionsOrChildren) ? optionsOrChildren : (children ?? []);
  return { type: 'layer', id, ...options, children: layerChildren };
};

/** Vanilla Tier2 embed plain spec helper。 */
export const embed = <TProps = Record<string, unknown>>(
  kind: string,
  id: string,
  props: TProps,
): VanillaEmbedSpec<TProps> => ({
  type: 'embed',
  kind,
  id,
  props,
});

/** Vanilla figure plain spec helper。 */
export const figure = (input?: VanillaFigureInput | Array<VanillaChildSpec>): VanillaFigureSpec => {
  if (Array.isArray(input)) return { type: 'figure', version: 1, children: input };
  const base = {
    type: 'figure' as const,
    version: 1 as const,
    ...(input?.id !== undefined ? { id: input.id } : {}),
    ...(input?.viewBox !== undefined ? { viewBox: input.viewBox } : {}),
    ...(input?.animations !== undefined ? { animations: input.animations } : {}),
  };
  if (input?.layers !== undefined) return { ...base, layers: input.layers };
  return { ...base, children: input?.children ?? [] };
};
