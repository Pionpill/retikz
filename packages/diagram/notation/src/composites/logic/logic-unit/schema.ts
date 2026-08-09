import type { z } from 'zod';

import { NodeSchema } from '@retikz/core';

import { LogicNeutralStyle } from '../shared';
import { NonBlankStringSchema } from '../shared/schema';

const TerminalShape = { type: 'rectangle', params: { cornerRadius: 1_000_000 } } as const;
const StageShape = { type: 'rectangle', params: { cornerRadius: 8 } } as const;
const DecisionShape = { type: 'diamond', params: { aspectRatio: 1.8 } } as const;

type SemanticNodeDefaults = Readonly<{
  shape: NonNullable<z.infer<typeof NodeSchema>['shape']>;
  minimumSize?: z.input<typeof NodeSchema>['minimumSize'];
  padding: NonNullable<z.input<typeof NodeSchema>['padding']>;
  fill: NonNullable<z.input<typeof NodeSchema>['fill']>;
}>;

const createSemanticNodeSchema = (defaults: SemanticNodeDefaults, description: string) =>
  NodeSchema.extend({
    id: NonBlankStringSchema,
    shape: NodeSchema.shape.shape.default(defaults.shape),
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
    .superRefine((value, context) => {
      if (JSON.stringify(value.shape) !== JSON.stringify(defaults.shape)) {
        context.addIssue({ code: 'custom', path: ['shape'], message: 'Semantic logic Nodes use their fixed shape.' });
      }
    })
    .describe(description);

const NeutralSemanticNodeDefaults = {
  fill: LogicNeutralStyle.fill,
} as const;

/** Terminal 逻辑单元 Schema，表示流程的起点或终点 Node */
export const TerminalSchema = createSemanticNodeSchema(
  {
    ...NeutralSemanticNodeDefaults,
    shape: TerminalShape,
    minimumSize: { width: 48, height: 24 },
    padding: { x: 12, y: 6 },
  },
  'A terminal Node that represents the start or end of a logic flow.',
);

/** Stage 逻辑单元 Schema，表示流程中的处理或动作 Node */
export const StageSchema = createSemanticNodeSchema(
  {
    ...NeutralSemanticNodeDefaults,
    shape: StageShape,
    padding: 8,
  },
  'A stage Node that represents a process or action in a logic flow.',
);

/** Decision 逻辑单元 Schema，表示流程中的条件分支 Node */
export const DecisionSchema = createSemanticNodeSchema(
  {
    ...NeutralSemanticNodeDefaults,
    shape: DecisionShape,
    padding: { x: 3, y: 2 },
  },
  'A decision Node that represents a condition or branch in a logic flow.',
);

/** Junction 逻辑单元 Schema，表示流程中的分叉、汇合或连接点 Node */
export const JunctionSchema = createSemanticNodeSchema(
  {
    fill: 'currentColor',
    shape: 'circle',
    minimumSize: { width: 8, height: 8 },
    padding: 0,
  },
  'A junction Node that represents a fork, merge, or continuation point in a logic flow.',
);
