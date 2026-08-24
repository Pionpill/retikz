import type { ValueOf } from '@retikz/foundation';
import type { infer as ZodInfer, input as ZodInput } from 'zod';

import type { LegendContentKind, LegendDirection, LegendSampleAlignment, LegendWrap } from './constants';
import type {
  LegendArtifactGeometrySchema,
  LegendArtifactSchema,
  LegendItemsArtifactSchema,
  LegendItemSchema,
  LegendItemsContentSchema,
  LegendPlacedChildArtifactSchema,
  LegendRampArtifactSchema,
  LegendRampContentSchema,
  LegendSchema,
  LegendTickSchema,
} from './schema';

/** Legend 内容形态取值 */
export type LegendContentKindValue = ValueOf<typeof LegendContentKind>;

/** Legend 物理排列方向取值 */
export type LegendDirectionValue = ValueOf<typeof LegendDirection>;

/** Legend 离散条目换行策略取值 */
export type LegendWrapValue = ValueOf<typeof LegendWrap>;

/** Legend 样本物理 y 轴对齐方式取值 */
export type LegendSampleAlignmentValue = ValueOf<typeof LegendSampleAlignment>;

/** 持久化的 Legend 离散条目 */
export type IRLegendItem = ZodInfer<typeof LegendItemSchema>;

/** 持久化的 Legend 离散内容 */
export type IRLegendItemsContent = ZodInfer<typeof LegendItemsContentSchema>;

/** 持久化的 Legend 连续刻度 */
export type IRLegendTick = ZodInfer<typeof LegendTickSchema>;

/** 持久化的 Legend 连续样本内容 */
export type IRLegendRampContent = ZodInfer<typeof LegendRampContentSchema>;

/** 持久化的 Standard Legend composite */
export type IRLegend = ZodInfer<typeof LegendSchema>;

/** 创建 Legend 时允许省略固定 discriminator 与 schema 默认字段的输入 */
export type LegendInput = Omit<ZodInput<typeof LegendSchema>, 'namespace' | 'type'>;

/** Legend 呈现区域的可观察几何 */
export type LegendArtifactGeometry = ZodInfer<typeof LegendArtifactGeometrySchema>;

/** Legend 单个 child 的可观察 placement */
export type LegendPlacedChildArtifact = ZodInfer<typeof LegendPlacedChildArtifactSchema>;

/** 离散条目 Legend 的 typed artifact */
export type LegendItemsArtifact = ZodInfer<typeof LegendItemsArtifactSchema>;

/** 连续样本 Legend 的 typed artifact */
export type LegendRampArtifact = ZodInfer<typeof LegendRampArtifactSchema>;

/** Standard Legend 的 typed artifact */
export type LegendArtifact = ZodInfer<typeof LegendArtifactSchema>;
