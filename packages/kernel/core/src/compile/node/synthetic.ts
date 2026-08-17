import { circle } from '@retikz/math';

import type { BoundaryDefinition, ShapeDefinition, Transform } from '../../contract';
import type { ProviderCollection } from '../../providers/registry/index';
import type { IRJsonObject, IRNode, IRPosition } from '../../schemas';
import type { Rect } from '../../shared/geometry';
import type { NodeLayout } from './types';

import { BUILTIN_BOUNDARIES } from '../../providers/boundary';
import { BUILTIN_SHAPES } from '../../providers/shape';
import { resolveNode } from '../../resolve';
import { NamespaceStack } from '../namespace';
import { fallbackMeasurer } from '../text';
import { applyTransformChain } from '../transform';
import { layoutNode } from './layout';

/** synthetic layout 构造使用的 shape / boundary 注册表 */
export type SyntheticLayoutRegistryContext = {
  /** shape 注册表 */
  shapes?: ProviderCollection<ShapeDefinition>;
  /** boundary 注册表 */
  boundaries?: ProviderCollection<BoundaryDefinition>;
};

/** synthetic rectangle layout 输入 */
export type SyntheticRectangleLayoutInput = {
  /** layout id */
  id: string;
  /** layout 矩形 */
  rect: Rect;
};

/** synthetic scope rectangle layout 输入 */
export type ScopeRectangleLayoutInput = {
  /** layout id */
  id: string;
  /** 已计算的 bbox rect；空 scope 时传 null */
  bbox: Rect | null;
  /** 空 bbox 时使用的回退原点 */
  fallbackOrigin: IRPosition;
};

/** synthetic scope circle layout 输入 */
export type ScopeCircleLayoutInput = {
  /** 子树外包络角点 */
  cornerPoints: ReadonlyArray<IRPosition>;
  /** 空点集时使用的回退原点 */
  fallbackOrigin: IRPosition;
  /** layout id */
  id: string;
};

const syntheticNode = (
  input: SyntheticRectangleLayoutInput,
  shape: 'rectangle' | 'ellipse',
  shapeParams: IRJsonObject = {},
): IRNode => {
  const rect = input.rect;
  return {
    type: 'node',
    id: input.id,
    shape: Object.keys(shapeParams).length === 0 ? shape : { type: shape, params: shapeParams },
    position: [rect.x, rect.y],
    minimumSize: { width: rect.width, height: rect.height },
    padding: 0,
    margin: 0,
    rotate: ((rect.rotate ?? 0) * 180) / Math.PI,
  };
};

/** 通过 resolveNode + layoutNode 构造 synthetic layout */
const resolveSyntheticLayout = (
  input: SyntheticRectangleLayoutInput,
  shape: 'rectangle' | 'ellipse',
  context: SyntheticLayoutRegistryContext,
  shapeParams: IRJsonObject = {},
): NodeLayout => {
  const shapes = context.shapes ?? BUILTIN_SHAPES;
  const boundaries = context.boundaries ?? BUILTIN_BOUNDARIES;
  const node = syntheticNode(input, shape, shapeParams);
  const resolution = resolveNode(node, {
    styleFrames: [],
    shapes,
    boundaries,
    patterns: new Map(),
    round: value => value,
    irPath: `synthetic.${input.id}`,
    warn: () => {},
  });
  const layout = layoutNode(resolution, {
    measureText: fallbackMeasurer,
    namespaceStack: new NamespaceStack(),
  });
  return {
    ...layout,
    textWidth: input.rect.width,
    textHeight: input.rect.height,
    lineHeight: 0,
    fontSize: 0,
  };
};

/** 构造编译期 synthetic rectangle layout */
export const createSyntheticRectangleLayout = (
  input: SyntheticRectangleLayoutInput,
  context: SyntheticLayoutRegistryContext = {},
): NodeLayout => resolveSyntheticLayout(input, 'rectangle', context);

/** 用 scope id 和当前 transform chain 构造临时 0×0 synthetic layout */
export const createScopePlaceholderLayout = (
  id: string,
  scopeChain: ReadonlyArray<Transform>,
  context: SyntheticLayoutRegistryContext = {},
): NodeLayout => {
  const globalOrigin: IRPosition = scopeChain.length === 0 ? [0, 0] : applyTransformChain([0, 0], scopeChain);
  return createSyntheticRectangleLayout(
    {
      id,
      rect: { x: globalOrigin[0], y: globalOrigin[1], width: 0, height: 0, rotate: 0 },
    },
    context,
  );
};

/** 用 scope id 和 bbox 构造可引用的 synthetic rectangle layout */
export const createScopeRectangleLayout = (
  input: ScopeRectangleLayoutInput,
  context: SyntheticLayoutRegistryContext = {},
): NodeLayout => {
  const rect: Rect = input.bbox ?? {
    x: input.fallbackOrigin[0],
    y: input.fallbackOrigin[1],
    width: 0,
    height: 0,
    rotate: 0,
  };
  return createSyntheticRectangleLayout({ id: input.id, rect }, context);
};

/** 用 scope id 和子树点集构造可引用的 synthetic circle layout */
export const createScopeCircleLayout = (
  input: ScopeCircleLayoutInput,
  context: SyntheticLayoutRegistryContext = {},
): NodeLayout => {
  const mec = input.cornerPoints.length > 0 ? circle.minimalEnclosing([...input.cornerPoints]) : null;
  const center: IRPosition = mec ? [mec.center[0], mec.center[1]] : input.fallbackOrigin;
  const diameter = mec ? mec.radius * 2 : 0;
  return resolveSyntheticLayout(
    { id: input.id, rect: { x: center[0], y: center[1], width: diameter, height: diameter, rotate: 0 } },
    'ellipse',
    context,
    { circumscribe: 'equal' },
  );
};
