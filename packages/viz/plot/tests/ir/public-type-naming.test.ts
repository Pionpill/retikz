import type { z } from 'zod';

import { expectTypeOf, it } from 'vitest';

import type {
  IRPlotCoordinateOperation,
  IRPlotDomainPadding,
  IRPlotEncoding,
  IRPlotGuide,
  IRPlotGuideTickLabelFormat,
  IRPlotGuideTickSource,
  IRPlotMarkOperation,
  IRPlotPaletteResolution,
  IRPlotScaleOperation,
  IRPlot,
  IRPlotThemeAuthoredOverrideRecord,
  IRPlotThemeTokenResolution,
  IRPlotThemeTokenRuleSourceRecord,
  IRPlotThemeTokenSourceRecord,
  IRPlotTransform,
  PlotAnchorResolution,
  PlotLineageAnchorResolution,
  PlotThemeStyleResolution,
} from '../../src';
import type {
  CoordinateOperationSchema,
  DomainPaddingSchema,
  EncodingSchema,
  GuideSchema,
  GuideTickLabelFormatSchema,
  GuideTickSourceSchema,
  MarkOperationSchema,
  PlotPaletteResolutionSchema,
  PlotSchema,
  PlotThemeAuthoredOverrideRecordSchema,
  PlotThemeTokenResolutionSchema,
  PlotThemeTokenRuleSourceRecordSchema,
  PlotThemeTokenSourceRecordSchema,
  ScaleOperationSchema,
  TransformSchema,
} from '../../src';

it('exports owner-qualified plot IR types from their schema truth', () => {
  expectTypeOf<IRPlot>().toEqualTypeOf<z.infer<typeof PlotSchema>>();
  expectTypeOf<IRPlotCoordinateOperation>().toEqualTypeOf<z.infer<typeof CoordinateOperationSchema>>();
  expectTypeOf<IRPlotDomainPadding>().toEqualTypeOf<z.infer<typeof DomainPaddingSchema>>();
  expectTypeOf<IRPlotEncoding>().toEqualTypeOf<z.infer<typeof EncodingSchema>>();
  expectTypeOf<IRPlotGuide>().toEqualTypeOf<z.infer<typeof GuideSchema>>();
  expectTypeOf<IRPlotGuideTickSource>().toEqualTypeOf<z.infer<typeof GuideTickSourceSchema>>();
  expectTypeOf<IRPlotGuideTickLabelFormat>().toEqualTypeOf<z.infer<typeof GuideTickLabelFormatSchema>>();
  expectTypeOf<IRPlotMarkOperation>().toEqualTypeOf<z.infer<typeof MarkOperationSchema>>();
  expectTypeOf<IRPlotScaleOperation>().toEqualTypeOf<z.infer<typeof ScaleOperationSchema>>();
  expectTypeOf<IRPlotTransform>().toEqualTypeOf<z.infer<typeof TransformSchema>>();
  expectTypeOf<IRPlotThemeTokenSourceRecord>().toEqualTypeOf<z.infer<typeof PlotThemeTokenSourceRecordSchema>>();
  expectTypeOf<IRPlotThemeTokenRuleSourceRecord>().toEqualTypeOf<
    z.infer<typeof PlotThemeTokenRuleSourceRecordSchema>
  >();
  expectTypeOf<IRPlotThemeAuthoredOverrideRecord>().toEqualTypeOf<
    z.infer<typeof PlotThemeAuthoredOverrideRecordSchema>
  >();
  expectTypeOf<IRPlotThemeTokenResolution>().toEqualTypeOf<z.infer<typeof PlotThemeTokenResolutionSchema>>();
  expectTypeOf<IRPlotPaletteResolution>().toEqualTypeOf<z.infer<typeof PlotPaletteResolutionSchema>>();
  expectTypeOf<PlotAnchorResolution>().toBeObject();
  expectTypeOf<PlotLineageAnchorResolution>().toBeObject();
  expectTypeOf<PlotThemeStyleResolution>().toBeObject();
});
