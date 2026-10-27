import type { CoreDependencyProvider, ScenePrimitive } from '@retikz/core';
import {
  CenterAnchor,
  boundsConnectionEnvelope,
  contourToPathPrimitive,
  defineShape,
  isDirectionalAnchor,
  rect,
} from '@retikz/core';
import { localToWorld } from '@retikz/math';

import { BuiltinExtensionShapeName } from '../constants';
import type { EllipticCapShapeParams } from './elliptic-cap';
import {
  EllipticCapShapeParamsSchema,
  circumscribeEllipticCaps,
  ellipticCapCommands,
  ellipticCapLocalBoundary,
  scaleEllipticCapParams,
} from './elliptic-cap';

/** Elliptic Capsule 形状参数 */
export type EllipticCapsuleShapeParams = EllipticCapShapeParams;

/** 仅由闭合半椭圆端外轮廓组成的 Elliptic Capsule Definition */
export const ellipticCapsuleShapeDefinition = defineShape<EllipticCapsuleShapeParams>({
  name: BuiltinExtensionShapeName.EllipticCapsule,
  paramsSchema: EllipticCapShapeParamsSchema,
  computeCircumscribedGeometry: circumscribeEllipticCaps,
  computeBoundaryPoint: (bounds, toward, params) =>
    localToWorld(bounds, ellipticCapLocalBoundary(bounds, toward, params)),
  resolveAnchor: (bounds, name) => {
    if (name === CenterAnchor.Center) return undefined;
    return isDirectionalAnchor(name) ? rect.anchor(bounds, name) : undefined;
  },
  computeConnectionEnvelope: (bounds, kind) => boundsConnectionEnvelope(bounds, kind),
  *emit(bounds, style, round, params): Iterable<ScenePrimitive> {
    yield contourToPathPrimitive(ellipticCapCommands(bounds, params, round, false), style);
  },
  scaleParams: scaleEllipticCapParams,
});

/** Elliptic Capsule 的静态 Core provider */
export const ellipticCapsuleShapeProvider: CoreDependencyProvider = Object.freeze<CoreDependencyProvider>({
  key: { capability: 'shape', name: ellipticCapsuleShapeDefinition.name },
  makeDefinition: () => ellipticCapsuleShapeDefinition,
});
