import { describe, expect, it } from 'vitest';

import type {
  CircleClipShape as ContractCircleClipShape,
  ClipShape as ContractClipShape,
  CompoundClipShape as ContractCompoundClipShape,
  EllipseClipShape as ContractEllipseClipShape,
  MarkerPrimitive as ContractMarkerPrimitive,
  PathClipShape as ContractPathClipShape,
  PathCommand as ContractPathCommand,
  PolygonClipShape as ContractPolygonClipShape,
  RectClipShape as ContractRectClipShape,
  ScenePrimitive as ContractScenePrimitive,
  Transform as ContractTransform,
} from '../../src/contract/scene';
import type {
  CircleClipShape as LegacyCircleClipShape,
  ClipShape as LegacyClipShape,
  CompoundClipShape as LegacyCompoundClipShape,
  EllipseClipShape as LegacyEllipseClipShape,
  MarkerPrimitive as LegacyMarkerPrimitive,
  PathClipShape as LegacyPathClipShape,
  PathCommand as LegacyPathCommand,
  PolygonClipShape as LegacyPolygonClipShape,
  RectClipShape as LegacyRectClipShape,
  ScenePrimitive as LegacyScenePrimitive,
  Transform as LegacyTransform,
} from '../../src/primitive';
import type { AssertEqual } from '../../src/shared';

type ExpectTrue<T extends true> = T;

type ScenePrimitiveCompat = ExpectTrue<AssertEqual<LegacyScenePrimitive, ContractScenePrimitive>>;
type PathCommandCompat = ExpectTrue<AssertEqual<LegacyPathCommand, ContractPathCommand>>;
type MarkerPrimitiveCompat = ExpectTrue<AssertEqual<LegacyMarkerPrimitive, ContractMarkerPrimitive>>;
type ClipShapeCompat = ExpectTrue<AssertEqual<LegacyClipShape, ContractClipShape>>;
type RectClipShapeCompat = ExpectTrue<AssertEqual<LegacyRectClipShape, ContractRectClipShape>>;
type CircleClipShapeCompat = ExpectTrue<AssertEqual<LegacyCircleClipShape, ContractCircleClipShape>>;
type EllipseClipShapeCompat = ExpectTrue<AssertEqual<LegacyEllipseClipShape, ContractEllipseClipShape>>;
type PolygonClipShapeCompat = ExpectTrue<AssertEqual<LegacyPolygonClipShape, ContractPolygonClipShape>>;
type PathClipShapeCompat = ExpectTrue<AssertEqual<LegacyPathClipShape, ContractPathClipShape>>;
type CompoundClipShapeCompat = ExpectTrue<AssertEqual<LegacyCompoundClipShape, ContractCompoundClipShape>>;
type TransformCompat = ExpectTrue<AssertEqual<LegacyTransform, ContractTransform>>;

describe('contract/scene compatibility surface', () => {
  it('keeps runtime-free type compatibility between legacy primitive and contract/scene exports', () => {
    const scenePrimitiveCheck: ScenePrimitiveCompat = true;
    const pathCommandCheck: PathCommandCompat = true;
    const markerPrimitiveCheck: MarkerPrimitiveCompat = true;
    const clipShapeCheck: ClipShapeCompat = true;
    const rectClipShapeCheck: RectClipShapeCompat = true;
    const circleClipShapeCheck: CircleClipShapeCompat = true;
    const ellipseClipShapeCheck: EllipseClipShapeCompat = true;
    const polygonClipShapeCheck: PolygonClipShapeCompat = true;
    const pathClipShapeCheck: PathClipShapeCompat = true;
    const compoundClipShapeCheck: CompoundClipShapeCompat = true;
    const transformCheck: TransformCompat = true;

    expect([
      scenePrimitiveCheck,
      pathCommandCheck,
      markerPrimitiveCheck,
      clipShapeCheck,
      rectClipShapeCheck,
      circleClipShapeCheck,
      ellipseClipShapeCheck,
      polygonClipShapeCheck,
      pathClipShapeCheck,
      compoundClipShapeCheck,
      transformCheck,
    ]).toEqual([true, true, true, true, true, true, true, true, true, true, true]);
  });
});
