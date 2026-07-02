import { z } from 'zod';

import type { BoundaryDefinition } from '../../contract';

import { defineBoundary } from '../../contract';
import { defineBuiltinProviderArray, resolveProviderRegistry } from '../registry';
import { ellipseShape, rectangle } from '../shape';

const NO_PARAMS = z.strictObject({});

const squareToMax = (rect: Parameters<BoundaryDefinition['boundaryPoint']>[0]) => {
  const side = Math.max(rect.width, rect.height);
  return { x: rect.x, y: rect.y, width: side, height: side, rotate: rect.rotate };
};

export type BuiltinBoundaryProviderName = 'circle' | 'rectangle' | 'ellipse';

export const BUILTIN_BOUNDARIES = defineBuiltinProviderArray<BoundaryDefinition, BuiltinBoundaryProviderName>([
  defineBoundary({
    name: 'circle',
    paramsSchema: NO_PARAMS,
    boundaryPoint: (rect, toward, params) => ellipseShape.boundaryPoint(squareToMax(rect), toward, params),
    anchor: (rect, name, params) => ellipseShape.anchor(squareToMax(rect), name, params),
  }),
  defineBoundary({
    name: 'rectangle',
    paramsSchema: NO_PARAMS,
    boundaryPoint: rectangle.boundaryPoint,
    anchor: rectangle.anchor,
  }),
  defineBoundary({
    name: 'ellipse',
    paramsSchema: NO_PARAMS,
    boundaryPoint: ellipseShape.boundaryPoint,
    anchor: ellipseShape.anchor,
  }),
]);

export const resolveBoundaryRegistry = (
  boundaries?: ReadonlyArray<BoundaryDefinition>,
): ReadonlyMap<string, BoundaryDefinition> =>
  resolveProviderRegistry({
    capability: 'boundary',
    builtins: BUILTIN_BOUNDARIES,
    custom: boundaries,
    keyOf: definition => definition.name,
    optionName: 'boundaries',
  });
