import type { z } from 'zod';

import type { CalloutArtifactSchema, CalloutPlacementSchema, CalloutSchema } from './schema';

/** Callout 放置的规范类型 */
export type CalloutPlacement = z.infer<typeof CalloutPlacementSchema>;

/** Callout 放置的作者输入 */
export type CalloutPlacementInput = z.input<typeof CalloutPlacementSchema>;

/** Callout 规范 IR */
export type IRCallout = z.infer<typeof CalloutSchema>;

/** Callout 解析后的编译产物 */
export type CalloutArtifact = z.infer<typeof CalloutArtifactSchema>;

/** Callout 解析后的引导线几何 */
export type CalloutLeaderArtifact = NonNullable<CalloutArtifact['leader']>;

/** Callout 工厂输入 */
export type CalloutInput = Omit<z.input<typeof CalloutSchema>, 'namespace' | 'type'>;
