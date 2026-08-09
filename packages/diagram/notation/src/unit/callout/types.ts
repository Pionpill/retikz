import type { ValueOf } from '@retikz/foundation';
import type { z } from 'zod';

import type { CalloutSide } from './constants';
import type {
  CalloutArtifactSchema,
  CalloutPlacementSchema,
  CalloutSchema,
  CalloutSideSchema,
  ConnectorAppearanceSchema,
  LogicDiagramTargetSchema,
} from './schema';

export type CalloutSideValue = ValueOf<typeof CalloutSide>;
export type CalloutSideSchemaValue = z.infer<typeof CalloutSideSchema>;

/** Callout 目标引用的规范类型 */
export type LogicDiagramTarget = z.infer<typeof LogicDiagramTargetSchema>;

/** Callout 目标引用的作者输入 */
export type LogicDiagramTargetInput = z.input<typeof LogicDiagramTargetSchema>;

/** Callout 引导线外观的规范类型 */
export type ConnectorAppearance = z.infer<typeof ConnectorAppearanceSchema>;

/** Callout 引导线外观的作者输入 */
export type ConnectorAppearanceInput = z.input<typeof ConnectorAppearanceSchema>;

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
