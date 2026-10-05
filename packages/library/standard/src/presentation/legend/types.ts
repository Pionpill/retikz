import type { IRScopeProps } from '@retikz/core';
import type { infer as ZodInfer, input as ZodInput } from 'zod';

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

/** 持久化的 Legend 离散条目 */
export type IRLegendItem = ZodInfer<typeof LegendItemSchema>;

/** 持久化的 Legend 离散内容 */
export type IRLegendItemsContent = Omit<ZodInput<typeof LegendItemsContentSchema>, 'items'> & {
  /** 按作者顺序排列的样本与标签项 */
  items: Array<IRLegendItem>;
};

/** 持久化的 Legend 连续刻度 */
export type IRLegendTick = ZodInfer<typeof LegendTickSchema>;

/** 持久化的 Legend 连续样本内容 */
export type IRLegendRampContent = Omit<ZodInput<typeof LegendRampContentSchema>, 'sample' | 'ticks'> &
  Pick<ZodInfer<typeof LegendRampContentSchema>, 'sample' | 'ticks'>;

/** 持久化的 Standard Legend composite */
export type IRLegend = Omit<ZodInput<typeof LegendSchema>, keyof IRScopeProps | 'title' | 'content'> &
  IRScopeProps &
  Pick<ZodInfer<typeof LegendSchema>, 'title'> & {
    /** 选择离散项列表或连续样本刻度的互斥内容分支 */
    content: IRLegendItemsContent | IRLegendRampContent;
  };

/** 创建 Legend 时允许省略固定 discriminator 与 schema 默认字段的输入 */
export type LegendInput = Omit<IRLegend, 'namespace' | 'type'>;

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
