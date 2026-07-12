import type { ValueOf } from '@retikz/core';
import type { z } from 'zod';

import type {
  CompositionAxisResolve,
  CompositionGridResolve,
  CompositionScaleResolve,
  CoordinateArrangementKind,
  CoordinateViewPlacementKind,
  FacetEmptyPolicy,
  FacetScaleSharing,
  PlotComposite,
  ScaffoldFrameMode,
} from './constants';
import type { PlotSpecSchema } from './schema';

/** plot composite 类型。 */
export type PlotCompositeValue = ValueOf<typeof PlotComposite>;

/** 分面空面板生成策略取值。 */
export type FacetEmptyPolicyValue = ValueOf<typeof FacetEmptyPolicy>;

/** 分面 scale domain 共享模式取值。 */
export type FacetScaleSharingValue = ValueOf<typeof FacetScaleSharing>;

/** 坐标组合中的比例尺解析模式取值。 */
export type CompositionScaleResolveValue = ValueOf<typeof CompositionScaleResolve>;

/** 坐标组合中的坐标轴输出模式取值。 */
export type CompositionAxisResolveValue = ValueOf<typeof CompositionAxisResolve>;

/** 坐标组合中的网格投放模式取值。 */
export type CompositionGridResolveValue = ValueOf<typeof CompositionGridResolve>;

/** 坐标视图放置方式取值。 */
export type CoordinateViewPlacementKindValue = ValueOf<typeof CoordinateViewPlacementKind>;

/** 坐标组合结构类型取值。 */
export type CoordinateArrangementKindValue = ValueOf<typeof CoordinateArrangementKind>;

/** 轨道组合结构的 frame 共享模式取值。 */
export type ScaffoldFrameModeValue = ValueOf<typeof ScaffoldFrameMode>;

/** Plot IR 根节点（plot composite 节点） */
export type IRPlotSpec = z.infer<typeof PlotSpecSchema>;
