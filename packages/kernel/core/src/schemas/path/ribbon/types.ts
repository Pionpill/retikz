import type { z } from 'zod';

import type { Vector2 } from '../../../geometry/point';
import type { PolarPosition } from '../../../geometry/polar';
import type { ValueOf } from '../../../types';
import type { RibbonAlignment, RibbonArcCapSweep, RibbonCap, RibbonMode } from './constants';
import type {
  PathRibbonOptionsSchema,
  RibbonArcCapSchema,
  RibbonCapSchema,
  RibbonEndpointSchema,
  RibbonSamplingSchema,
  RibbonWidthSchema,
  RibbonWidthStopSchema,
} from './schema';

export type IRRibbonDirection = number | Vector2 | PolarPosition;

export type IRRibbonWidthStop = z.infer<typeof RibbonWidthStopSchema>;

export type IRRibbonWidth = z.infer<typeof RibbonWidthSchema>;

export type IRRibbonArcCap = z.infer<typeof RibbonArcCapSchema>;

export type IRRibbonCap = z.infer<typeof RibbonCapSchema>;

export type IRRibbonEndpoint = z.infer<typeof RibbonEndpointSchema>;

export type IRRibbonSampling = z.infer<typeof RibbonSamplingSchema>;

export type IRPathRibbonOptions = z.infer<typeof PathRibbonOptionsSchema>;

export type RibbonModeValue = ValueOf<typeof RibbonMode>;

export type RibbonAlignmentValue = ValueOf<typeof RibbonAlignment>;

export type RibbonCapValue = ValueOf<typeof RibbonCap>;

export type RibbonArcCapSweepValue = ValueOf<typeof RibbonArcCapSweep>;
