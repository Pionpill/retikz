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
import type { EllipticCapShapeParams } from './_elliptic-cap';
import {
  EllipticCapShapeParamsSchema,
  circumscribeEllipticCaps,
  ellipticCapCommands,
  ellipticCapLocalBoundary,
  scaleEllipticCapParams,
} from './_elliptic-cap';

/** Cylinder 形状参数 */
export type CylinderShapeParams = EllipticCapShapeParams;

/** 可选 Cylinder 形状 Definition */
export const CylinderShapeDefinition = defineShape<CylinderShapeParams>({
  name: BuiltinExtensionShapeName.Cylinder,
  paramsSchema: EllipticCapShapeParamsSchema,
  computeCircumscribedHalfAxes: circumscribeEllipticCaps,
  computeBoundaryPoint: (bounds, toward, params) =>
    localToWorld(bounds, ellipticCapLocalBoundary(bounds, toward, params)),
  resolveAnchor: (bounds, name) => {
    if (name === CenterAnchor.Center) return undefined;
    return isDirectionalAnchor(name) ? rect.anchor(bounds, name) : undefined;
  },
  computeConnectionEnvelope: (bounds, kind) => boundsConnectionEnvelope(bounds, kind),
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
