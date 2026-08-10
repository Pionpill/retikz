import type { z } from 'zod';

import { NodeSchema } from '@retikz/core';
import { NonBlankStringSchema } from '@retikz/foundation';
import { z as zod } from 'zod';

import { LogicNeutralStyle, NOTATION_NAMESPACE, NotationElementType } from '../../shared';

const SemanticNodeShape = NodeSchema.omit({ type: true, id: true, shape: true }).shape;

type SemanticNodeDefaults = Readonly<{
  minimumSize?: z.input<typeof NodeSchema>['minimumSize'];
  padding: NonNullable<z.input<typeof NodeSchema>['padding']>;
  fill: NonNullable<z.input<typeof NodeSchema>['fill']>;
}>;

/** 创建保留 Notation 身份并复用 Core Node 字段的基础单元模式 */
const createSemanticNodeSchema = <const TType extends string>(
  type: TType,
  defaults: SemanticNodeDefaults,
  description: string,
) =>
  zod
    .strictObject({
      namespace: zod.literal(NOTATION_NAMESPACE).describe('Notation semantic element namespace.'),
      type: zod.literal(type).describe('Notation semantic unit discriminator.'),
      ...SemanticNodeShape,
      id: NonBlankStringSchema.describe('Stable authored semantic unit identity.'),
      ...(defaults.minimumSize === undefined
        ? {}
        : { minimumSize: NodeSchema.shape.minimumSize.default(defaults.minimumSize) }),
      padding: NodeSchema.shape.padding.default(defaults.padding),
      boundary: NodeSchema.shape.boundary.default('shape'),
      fill: NodeSchema.shape.fill.default(defaults.fill),
      stroke: NodeSchema.shape.stroke.default('currentColor'),
      strokeWidth: NodeSchema.shape.strokeWidth.default(1),
      opacity: NodeSchema.shape.opacity.default(1),
      zIndex: NodeSchema.shape.zIndex.default(0),
    })
    .describe(description);

/** Terminal 基础单元模式，表示流程的起点或终点 */
export const TerminalSchema = createSemanticNodeSchema(
  NotationElementType.Terminal,
  {
    minimumSize: { width: 48, height: 24 },
    padding: { x: 12, y: 6 },
    fill: LogicNeutralStyle.fill,
  },
  'A canonical Notation terminal that lowers to one fixed-shape Core Node.',
);

/** Stage 基础单元模式，表示流程中的处理或动作 */
export const StageSchema = createSemanticNodeSchema(
  NotationElementType.Stage,
  { padding: 8, fill: LogicNeutralStyle.fill },
  'A canonical Notation stage that lowers to one fixed-shape Core Node.',
);

/** Decision 基础单元模式，表示流程中的条件分支 */
export const DecisionSchema = createSemanticNodeSchema(
  NotationElementType.Decision,
  { padding: { x: 3, y: 2 }, fill: LogicNeutralStyle.fill },
  'A canonical Notation decision that lowers to one fixed-shape Core Node.',
);

/** Junction 基础单元模式，表示流程中的分叉、汇合或延续点 */
export const JunctionSchema = createSemanticNodeSchema(
  NotationElementType.Junction,
  {
    minimumSize: { width: 8, height: 8 },
    padding: 0,
    fill: 'currentColor',
  },
  'A canonical Notation junction that lowers to one fixed-shape Core Node.',
);
