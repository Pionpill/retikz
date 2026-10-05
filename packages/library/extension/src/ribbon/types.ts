import type { PolarPosition } from '@retikz/core';
import type { Vector2 } from '@retikz/math';
import type { infer as ZodInfer, input as ZodInput } from 'zod';

import type { RibbonPathSchema as CompleteRibbonPathSchema } from './path-schema';
import type {
  FixedRibbonWidthSchema,
  TaperRibbonWidthSchema,
  StopsRibbonWidthSchema,
  ProfileRibbonWidthSchema,
  RibbonArcCapSchema,
  RibbonCapSchema,
  RibbonEndpointSchema,
  RibbonPathOptionsSchema,
  RibbonSamplingSchema,
  RibbonWidthSchema,
  RibbonWidthStopSchema,
} from './schema';

/** 端面轴线的作者输入：角度、非零向量或无命名 origin 的极坐标 */
export type IRRibbonDirection = number | Vector2 | PolarPosition;

export type IRRibbonWidthStop = ZodInfer<typeof RibbonWidthStopSchema>;

export type IRFixedRibbonWidth = ZodInput<typeof FixedRibbonWidthSchema>;
export type IRTaperRibbonWidth = ZodInput<typeof TaperRibbonWidthSchema>;
export type IRStopsRibbonWidth = ZodInput<typeof StopsRibbonWidthSchema>;
export type IRProfileRibbonWidth = ZodInput<typeof ProfileRibbonWidthSchema>;
export type IRRibbonWidth = ZodInput<typeof RibbonWidthSchema>;

export type IRRibbonArcCap = ZodInfer<typeof RibbonArcCapSchema>;

export type IRRibbonCap = ZodInfer<typeof RibbonCapSchema>;

export type IRRibbonEndpoint = ZodInput<typeof RibbonEndpointSchema>;

export type IRRibbonSampling = ZodInput<typeof RibbonSamplingSchema>;

export type IRRibbonPathOptions = ZodInput<typeof RibbonPathOptionsSchema>;

/** Extension Ribbon 完整 Path subject */
export type IRRibbonPath = ZodInfer<typeof CompleteRibbonPathSchema>;

/** 已物化端点默认值 */
export type CanonicalRibbonEndpoint = ZodInfer<typeof RibbonEndpointSchema>;
/** 已物化宽度默认值 */
export type CanonicalRibbonWidth = ZodInfer<typeof RibbonWidthSchema>;
/** 已物化采样默认值 */
export type CanonicalRibbonSampling = ZodInfer<typeof RibbonSamplingSchema>;
/** 按模式区分的编译消费形态 */
export type CanonicalRibbonOptions = ZodInfer<typeof RibbonPathOptionsSchema>;
