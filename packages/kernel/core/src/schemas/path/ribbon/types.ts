import type { Vector2 } from '@retikz/math';
import type { z } from 'zod';

import type { ValueOf } from '../../../shared';
import type { PolarPosition } from '../../position';
import type {
  RibbonAlignment,
  RibbonArcCapSweep,
  RibbonCap,
  RibbonMode,
  RibbonTaperInterpolation,
  RibbonWidthInterpolation,
} from './constants';
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

/** ribbon 多 stop 宽度插值方式取值 */
export type RibbonWidthInterpolationValue = ValueOf<typeof RibbonWidthInterpolation>;

/** ribbon 起止宽度渐变插值方式取值 */
export type RibbonTaperInterpolationValue = ValueOf<typeof RibbonTaperInterpolation>;
