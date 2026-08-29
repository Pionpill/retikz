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

/** Cylinder 形状参数 */
export type CylinderShapeParams = EllipticCapShapeParams;

/** 可选 Cylinder 形状 Definition */
export const CylinderShapeDefinition = defineShape<CylinderShapeParams>({
  name: StandardShapeName.Cylinder,
  paramsSchema: EllipticCapShapeParamsSchema,
  circumscribe: circumscribeEllipticCaps,
  boundaryPoint: (bounds, toward, params) => localToWorld(bounds, ellipticCapLocalBoundary(bounds, toward, params)),
  anchor: (bounds, name) => {
    if (name === CenterAnchor.Center) return undefined;
    return isDirectionalAnchor(name) ? rect.anchor(bounds, name) : undefined;
  },
  connectionEnvelope: (bounds, kind) => boundsConnectionEnvelope(bounds, kind),
  *emit(bounds, style, round, params): Iterable<ScenePrimitive> {
    yield contourToPathPrimitive(ellipticCapCommands(bounds, params, round, true), style);
  },
  scaleParams: scaleEllipticCapParams,
});

/** Cylinder 的静态 Core provider */
export const CylinderShapeProvider: CoreDependencyProvider = Object.freeze({
  key: { capability: 'shape', name: CylinderShapeDefinition.name },
  dependencies: [],
  datasets: {},
  makeDefinition: () => CylinderShapeDefinition,
});
