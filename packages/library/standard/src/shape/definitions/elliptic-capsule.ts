import type { CoreDependencyProvider, ScenePrimitive } from '@retikz/core';

import {
  boundsConnectionEnvelope,
  CenterAnchor,
  contourToPathPrimitive,
  defineShape,
  isDirectionalAnchor,
  localToWorld,
  rect,
} from '@retikz/core';

import type { EllipticCapShapeParams } from './_elliptic-cap';

import { StandardShapeName } from '../constants';
import {
  circumscribeEllipticCaps,
  ellipticCapCommands,
  ellipticCapLocalBoundary,
  EllipticCapShapeParamsSchema,
  scaleEllipticCapParams,
} from './_elliptic-cap';

/** Elliptic Capsule 形状参数 */
export type EllipticCapsuleShapeParams = EllipticCapShapeParams;

/** 仅由闭合半椭圆端外轮廓组成的 Elliptic Capsule Definition */
export const EllipticCapsuleShapeDefinition = defineShape<EllipticCapsuleShapeParams>({
  name: StandardShapeName.EllipticCapsule,
  paramsSchema: EllipticCapShapeParamsSchema,
  circumscribe: circumscribeEllipticCaps,
  boundaryPoint: (bounds, toward, params) => localToWorld(bounds, ellipticCapLocalBoundary(bounds, toward, params)),
  anchor: (bounds, name) => {
    if (name === CenterAnchor.Center) return undefined;
    return isDirectionalAnchor(name) ? rect.anchor(bounds, name) : undefined;
  },
  connectionEnvelope: (bounds, kind) => boundsConnectionEnvelope(bounds, kind),
  *emit(bounds, style, round, params): Iterable<ScenePrimitive> {
    yield contourToPathPrimitive(ellipticCapCommands(bounds, params, round, false), style);
  },
  scaleParams: scaleEllipticCapParams,
});

/** Elliptic Capsule 的静态 Core provider */
export const EllipticCapsuleShapeProvider: CoreDependencyProvider = Object.freeze({
  key: { capability: 'shape', name: EllipticCapsuleShapeDefinition.name },
  dependencies: [],
  datasets: {},
  makeDefinition: () => EllipticCapsuleShapeDefinition,
});
