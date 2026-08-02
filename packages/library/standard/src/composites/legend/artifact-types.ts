import type { z } from 'zod';

import type {
  LegendArtifactGeometrySchema,
  LegendArtifactSchema,
  LegendItemsArtifactSchema,
  LegendPlacedChildArtifactSchema,
  LegendRampArtifactSchema,
} from './artifact-schema';

/** Legend 呈现区域的可观察几何 */
export type LegendArtifactGeometry = z.infer<typeof LegendArtifactGeometrySchema>;

/** Legend 单个 child 的可观察 placement */
export type LegendPlacedChildArtifact = z.infer<typeof LegendPlacedChildArtifactSchema>;

/** 离散条目 Legend 的 typed artifact */
export type LegendItemsArtifact = z.infer<typeof LegendItemsArtifactSchema>;

/** 连续样本 Legend 的 typed artifact */
export type LegendRampArtifact = z.infer<typeof LegendRampArtifactSchema>;

/** Standard Legend 的 typed artifact */
export type LegendArtifact = z.infer<typeof LegendArtifactSchema>;
