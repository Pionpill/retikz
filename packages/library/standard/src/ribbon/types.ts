import type { IRStep, PolarPosition } from '@retikz/core';
import type { ValueOf } from '@retikz/foundation';
import type { Vector2 } from '@retikz/math';
import type { z } from 'zod';

import type {
  RibbonAlignment,
  RibbonArcCapSweep,
  RibbonCap,
  RibbonMode,
  RibbonTaperInterpolation,
  RibbonWidthInterpolation,
} from './constants';
import type { RibbonPathSchema as CompleteRibbonPathSchema } from './path-schema';
import type {
  RibbonArcCapSchema,
  RibbonCapSchema,
  RibbonEndpointSchema,
  RibbonPathOptionsSchema,
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

export type IRRibbonPathOptions = z.infer<typeof RibbonPathOptionsSchema>;

export type RibbonModeValue = ValueOf<typeof RibbonMode>;

export type RibbonAlignmentValue = ValueOf<typeof RibbonAlignment>;

export type RibbonCapValue = ValueOf<typeof RibbonCap>;

export type RibbonArcCapSweepValue = ValueOf<typeof RibbonArcCapSweep>;

/** ribbon 多 stop 宽度插值方式取值 */
export type RibbonWidthInterpolationValue = ValueOf<typeof RibbonWidthInterpolation>;

/** ribbon 起止宽度渐变插值方式取值 */
export type RibbonTaperInterpolationValue = ValueOf<typeof RibbonTaperInterpolation>;

/** Standard Ribbon 完整 Path subject */
export type IRRibbonPath = z.infer<typeof CompleteRibbonPathSchema>;

/** 已补齐 Ribbon 默认值的端点属性 */
export type CanonicalRibbonEndpoint = Omit<IRRibbonEndpoint, 'cap'> & {
  cap: NonNullable<IRRibbonEndpoint['cap']>;
};

/** 已补齐停靠点插值默认值的宽度规则 */
export type CanonicalRibbonWidth =
  | Exclude<IRRibbonWidth, { kind: 'stops' }>
  | (Omit<Extract<IRRibbonWidth, { kind: 'stops' }>, 'interpolation'> & {
      interpolation: NonNullable<Extract<IRRibbonWidth, { kind: 'stops' }>['interpolation']>;
    });

/** 已补齐 adaptive 采样上限的采样策略 */
export type CanonicalRibbonSampling =
  | Exclude<IRRibbonSampling, { kind: 'adaptive' }>
  | (Omit<Extract<IRRibbonSampling, { kind: 'adaptive' }>, 'maxSamples'> & {
      maxSamples: number;
    });

/** Ribbon compile 消费的完整 options */
export type CanonicalRibbonOptions = Omit<
  IRRibbonPathOptions,
  'mode' | 'align' | 'interpolation' | 'start' | 'end' | 'sampling' | 'samples' | 'width' | 'upper' | 'lower'
> & {
  mode: RibbonModeValue;
  align: RibbonAlignmentValue;
  interpolation: RibbonTaperInterpolationValue;
  start: CanonicalRibbonEndpoint;
  end: CanonicalRibbonEndpoint;
  width?: CanonicalRibbonWidth;
  sampling?: CanonicalRibbonSampling;
  upper?: Array<IRStep>;
  lower?: Array<IRStep>;
};
