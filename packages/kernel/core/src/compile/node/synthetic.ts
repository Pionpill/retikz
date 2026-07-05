import { minimalEnclosingCircle } from '@retikz/math';

import type { BoundaryDefinition, ShapeDefinition, Transform } from '../../contract';
import type { ProviderCollection } from '../../providers/registry';
import type { IRPosition } from '../../schemas';
import type { Rect } from '../../shared/geometry';
import type { NodeLayout } from './types';

import { resolveBoundaryRegistry } from '../../providers/boundary';
import { providerDefinitionOf } from '../../providers/registry';
import { resolveShapeRegistry } from '../../providers/shape';
import { applyTransformChain } from '../transform';
import { boxInsets } from './types';

/** synthetic layout 构造使用的 shape / boundary 注册表。 */
export type SyntheticLayoutRegistryContext = {
  /** shape 注册表。 */
  shapes?: ProviderCollection<ShapeDefinition>;
  /** boundary 注册表。 */
  boundaries?: ProviderCollection<BoundaryDefinition>;
};

/** synthetic rectangle layout 输入。 */
export type SyntheticRectangleLayoutInput = {
  /** layout id。 */
  id: string;
  /** layout 矩形。 */
  rect: Rect;
};

/** synthetic scope rectangle layout 输入。 */
export type ScopeRectangleLayoutInput = {
  /** layout id。 */
  id: string;
  /** 已计算的 bbox rect；空 scope 时传 null。 */
  bbox: Rect | null;
  /** 空 bbox 时使用的回退原点。 */
  fallbackOrigin: IRPosition;
};

/** synthetic scope circle layout 输入。 */
export type ScopeCircleLayoutInput = {
  /** layout id。 */
  id: string;
  /** 子树外包络角点。 */
  cornerPoints: ReadonlyArray<IRPosition>;
  /** 空点集时使用的回退原点。 */
  fallbackOrigin: IRPosition;
};

/** 构造编译期 synthetic rectangle layout。 */
export const createSyntheticRectangleLayout = (
  input: SyntheticRectangleLayoutInput,
  context: SyntheticLayoutRegistryContext = {},
): NodeLayout => {
  const shapes = context.shapes ?? resolveShapeRegistry();
  const boundaries = context.boundaries ?? resolveBoundaryRegistry();
  const rect: Rect = { ...input.rect, rotate: input.rect.rotate ?? 0 };
  return {
    id: input.id,
    shapeName: 'rectangle',
    shapeDef: providerDefinitionOf(shapes, 'rectangle', {
      capability: 'shape',
      optionName: 'shapes',
    }),
    rect,
    contentCenter: [rect.x, rect.y],
    rotateDeg: 0,
    margin: boxInsets(0),
    textWidth: rect.width,
    textHeight: rect.height,
    align: 'middle',
    lineHeight: 0,
    fontSize: 0,
    shapes,
    boundaries,
  };
};

/** 用 scope id 和当前 transform chain 构造临时 0×0 synthetic layout。 */
export const createScopePlaceholderLayout = (
  id: string,
  scopeChain: ReadonlyArray<Transform>,
  context: SyntheticLayoutRegistryContext = {},
): NodeLayout => {
  const globalOrigin: IRPosition = scopeChain.length === 0 ? [0, 0] : applyTransformChain([0, 0], scopeChain);
  return createSyntheticRectangleLayout({
    id,
    rect: { x: globalOrigin[0], y: globalOrigin[1], width: 0, height: 0, rotate: 0 },
  }, context);
};

/** 用 scope id 和 bbox 构造可引用的 synthetic rectangle layout。 */
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

/** 用 scope id 和子树点集构造可引用的 synthetic circle layout。 */
export const createScopeCircleLayout = (
  input: ScopeCircleLayoutInput,
  context: SyntheticLayoutRegistryContext = {},
): NodeLayout => {
  const shapes = context.shapes ?? resolveShapeRegistry();
  const boundaries = context.boundaries ?? resolveBoundaryRegistry();
  const mec = input.cornerPoints.length > 0 ? minimalEnclosingCircle([...input.cornerPoints]) : null;
  const center: IRPosition = mec ? [mec.center[0], mec.center[1]] : input.fallbackOrigin;
  const diameter = mec ? mec.radius * 2 : 0;
  return {
    id: input.id,
    shapeName: 'ellipse',
    shapeDef: providerDefinitionOf(shapes, 'ellipse', { capability: 'shape', optionName: 'shapes' }),
    shapeParams: { circumscribe: 'equal' },
    rect: { x: center[0], y: center[1], width: diameter, height: diameter, rotate: 0 },
    contentCenter: [center[0], center[1]],
    rotateDeg: 0,
    margin: boxInsets(0),
    textWidth: diameter,
    textHeight: diameter,
    align: 'middle',
    lineHeight: 0,
    fontSize: 0,
    shapes,
    boundaries,
  };
};
