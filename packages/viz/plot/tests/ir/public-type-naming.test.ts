import type { z } from 'zod';

import { expectTypeOf, it } from 'vitest';

import type {
  IRPlotCoordinateOperation,
  IRPlotEncoding,
  IRPlotGuide,
  IRPlotMarkOperation,
  IRPlotScaleOperation,
  IRPlotSpec,
  IRPlotTransform,
} from '../../src';
import type {
  CoordinateOperationSchema,
  EncodingSchema,
  GuideSchema,
  MarkOperationSchema,
  PlotSpecSchema,
  ScaleOperationSchema,
  TransformSchema,
} from '../../src';

it('exports owner-qualified plot IR types from their schema truth', () => {
  expectTypeOf<IRPlotSpec>().toEqualTypeOf<z.infer<typeof PlotSpecSchema>>();
  expectTypeOf<IRPlotCoordinateOperation>().toEqualTypeOf<z.infer<typeof CoordinateOperationSchema>>();
  expectTypeOf<IRPlotEncoding>().toEqualTypeOf<z.infer<typeof EncodingSchema>>();
  expectTypeOf<IRPlotGuide>().toEqualTypeOf<z.infer<typeof GuideSchema>>();
  expectTypeOf<IRPlotMarkOperation>().toEqualTypeOf<z.infer<typeof MarkOperationSchema>>();
  expectTypeOf<IRPlotScaleOperation>().toEqualTypeOf<z.infer<typeof ScaleOperationSchema>>();
  expectTypeOf<IRPlotTransform>().toEqualTypeOf<z.infer<typeof TransformSchema>>();
});
