import {
  BoundarySchema,
  ChildSchema,
  DrawableStyleSchema,
  ShapeRefSchema,
  StrokeDashOffsetSchema,
  StrokeDashPatternSchema,
} from '@retikz/core';
import { z } from 'zod';

import { LayoutArtifactContainerSchema, LayoutOverflowSchema, LayoutSizeSchema } from '../../layout/shared';
import { STANDARD_NAMESPACE } from '../../shared';
import {
  LogicCompositeType,
  LogicContentSizeDefault,
  LogicLayoutItemArtifactSchema,
  LogicNeutralStyle,
  LogicNeutralStyleSchema,
  LogicOuterArtifactSchema,
  LogicSpacingSchema,
  LogicUnitAppearanceBaseShape,
  NonBlankStringSchema,
  TerminalRoleSchema,
} from '../shared';

const LogicShapeSchema = z
  .union([z.string().min(1), ShapeRefSchema])
  .describe('Visual shape name or parametric Core shape reference.');

const createLogicUnitAppearanceSchema = (defaults: {
  size: z.infer<typeof LayoutSizeSchema>;
  padding: z.infer<typeof LogicSpacingSchema>;
  shape: z.infer<typeof LogicShapeSchema>;
}) =>
  z
    .strictObject({
      ...LogicUnitAppearanceBaseShape,
      size: LayoutSizeSchema.default(defaults.size),
      padding: LogicSpacingSchema.default(defaults.padding),
      overflow: LayoutOverflowSchema.default('visible'),
      shape: LogicShapeSchema.default(defaults.shape),
      boundary: BoundarySchema.default('shape'),
      style: LogicNeutralStyleSchema.default(LogicNeutralStyle),
      dashPattern: StrokeDashPatternSchema.optional(),
      dashOffset: StrokeDashOffsetSchema.optional(),
      zIndex: z.number().int().default(0),
    })
    .describe('Canonical sizing, boundary, and visual appearance for a semantic logic unit.');

const TerminalSizeDefault = {
  x: { kind: 'content', min: 48 },
  y: { kind: 'content', min: 24 },
} as const;

const JunctionSizeDefault = {
  x: { kind: 'content', min: 8 },
  y: { kind: 'content', min: 8 },
} as const;

const TerminalAppearanceDefault = {
  size: TerminalSizeDefault,
  padding: { x: 12, y: 6 },
  overflow: 'visible' as const,
  shape: 'capsule',
  boundary: 'shape',
  style: LogicNeutralStyle,
  zIndex: 0,
};

const StageAppearanceDefault = {
  size: LogicContentSizeDefault,
  padding: 8,
  overflow: 'visible' as const,
  shape: { type: 'rectangle', params: { cornerRadius: 8 } },
  boundary: 'shape',
  style: LogicNeutralStyle,
  zIndex: 0,
};

const DecisionAppearanceDefault = {
  size: LogicContentSizeDefault,
  padding: 12,
  overflow: 'visible' as const,
  shape: 'diamond',
  boundary: 'shape',
  style: LogicNeutralStyle,
  zIndex: 0,
};

const JunctionAppearanceDefault = {
  size: JunctionSizeDefault,
  padding: 0,
  overflow: 'visible' as const,
  shape: 'circle',
  boundary: 'shape',
  style: LogicNeutralStyle,
  zIndex: 0,
};

const JunctionDotStyleDefault = {
  fill: 'currentColor',
  opacity: 1,
} as const;

const JunctionDotStyleSchema = DrawableStyleSchema.extend({
  fill: DrawableStyleSchema.shape.fill.default('currentColor'),
  opacity: DrawableStyleSchema.shape.opacity.default(1),
});

const JunctionDotAppearanceDefault = {
  size: JunctionSizeDefault,
  padding: 0,
  overflow: 'visible' as const,
  shape: 'circle',
  boundary: 'shape',
  style: JunctionDotStyleDefault,
  zIndex: 0,
};

/** Terminal 中性外观预设 */
export const TerminalAppearanceSchema = createLogicUnitAppearanceSchema({
  size: TerminalSizeDefault,
  padding: { x: 12, y: 6 },
  shape: 'capsule',
});

/** Stage 中性外观预设 */
export const StageAppearanceSchema = createLogicUnitAppearanceSchema({
  size: LogicContentSizeDefault,
  padding: 8,
  shape: { type: 'rectangle', params: { cornerRadius: 8 } },
});

/** Decision 中性外观预设 */
export const DecisionAppearanceSchema = createLogicUnitAppearanceSchema({
  size: LogicContentSizeDefault,
  padding: 12,
  shape: 'diamond',
});

/** Junction 中性外观预设 */
export const JunctionAppearanceSchema = createLogicUnitAppearanceSchema({
  size: JunctionSizeDefault,
  padding: 0,
  shape: 'circle',
});

const TerminalShape = {
  namespace: z.literal(STANDARD_NAMESPACE).describe('Standard composite namespace.'),
  type: z.literal(LogicCompositeType.Terminal).describe('Terminal composite discriminator.'),
  id: NonBlankStringSchema.describe('Stable authored Terminal identity.'),
  role: TerminalRoleSchema,
  content: ChildSchema.optional().describe('Optional JSON-safe Terminal content.'),
  appearance: TerminalAppearanceSchema.default(TerminalAppearanceDefault).describe(
    'Terminal appearance and sizing overrides.',
  ),
} as const;

const StageShape = {
  namespace: z.literal(STANDARD_NAMESPACE).describe('Standard composite namespace.'),
  type: z.literal(LogicCompositeType.Stage).describe('Stage composite discriminator.'),
  id: NonBlankStringSchema.describe('Stable authored Stage identity.'),
  category: NonBlankStringSchema.optional().describe('Open authored Stage category.'),
  content: ChildSchema.describe('Required JSON-safe Stage content.'),
  appearance: StageAppearanceSchema.default(StageAppearanceDefault).describe('Stage appearance and sizing overrides.'),
} as const;

const DecisionShape = {
  namespace: z.literal(STANDARD_NAMESPACE).describe('Standard composite namespace.'),
  type: z.literal(LogicCompositeType.Decision).describe('Decision composite discriminator.'),
  id: NonBlankStringSchema.describe('Stable authored Decision identity.'),
  content: ChildSchema.describe('Required JSON-safe Decision content.'),
  appearance: DecisionAppearanceSchema.default(DecisionAppearanceDefault).describe(
    'Decision appearance and sizing overrides.',
  ),
} as const;

const JunctionBaseShape = {
  namespace: z.literal(STANDARD_NAMESPACE).describe('Standard composite namespace.'),
  type: z.literal(LogicCompositeType.Junction).describe('Junction composite discriminator.'),
  id: NonBlankStringSchema.describe('Stable authored Junction identity.'),
  role: NonBlankStringSchema.optional().describe('Open authored Junction role.'),
} as const;

const JunctionWithoutContentSchema = z
  .strictObject({
    ...JunctionBaseShape,
    appearance: JunctionAppearanceSchema.extend({
      style: JunctionDotStyleSchema.default(JunctionDotStyleDefault),
    })
      .default(JunctionDotAppearanceDefault)
      .describe('Junction dot appearance and sizing overrides.'),
  })
  .describe('Canonical JSON-safe Standard Junction composite without content.');

const JunctionWithContentSchema = z
  .strictObject({
    ...JunctionBaseShape,
    content: ChildSchema.describe('Required JSON-safe Junction content.'),
    appearance: JunctionAppearanceSchema.default(JunctionAppearanceDefault).describe(
      'Junction appearance and sizing overrides.',
    ),
  })
  .describe('Canonical JSON-safe Standard Junction composite with content.');

/** Terminal 规范 schema */
export const TerminalSchema = z
  .strictObject(TerminalShape)
  .describe('Canonical JSON-safe Standard Terminal composite.');

/** Stage 规范 schema */
export const StageSchema = z.strictObject(StageShape).describe('Canonical JSON-safe Standard Stage composite.');

/** Decision 规范 schema */
export const DecisionSchema = z
  .strictObject(DecisionShape)
  .describe('Canonical JSON-safe Standard Decision composite.');

/** Junction 规范 schema */
export const JunctionSchema = z
  .union([JunctionWithoutContentSchema, JunctionWithContentSchema])
  .describe('Canonical JSON-safe Standard Junction composite.');

const LogicUnitArtifactBaseShape = {
  id: NonBlankStringSchema.describe('Stable authored semantic logic unit identity.'),
  outer: LogicOuterArtifactSchema.describe('Resolved shell and content geometry union.'),
  container: LayoutArtifactContainerSchema.describe('Resolved content placement geometry.'),
} as const;

/** Terminal 已解析编译 artifact 载荷 */
export const TerminalArtifactSchema = z
  .strictObject({
    kind: z.literal('terminal').describe('Terminal artifact discriminator.'),
    ...LogicUnitArtifactBaseShape,
    role: TerminalRoleSchema,
    content: LogicLayoutItemArtifactSchema.nullable().describe('Resolved Terminal content placement, if present.'),
  })
  .describe('Strict JSON-safe Terminal compile artifact payload.');

/** Stage 已解析编译 artifact 载荷 */
export const StageArtifactSchema = z
  .strictObject({
    kind: z.literal('stage').describe('Stage artifact discriminator.'),
    ...LogicUnitArtifactBaseShape,
    category: NonBlankStringSchema.optional().describe('Authored Stage category, when provided.'),
    content: LogicLayoutItemArtifactSchema.describe('Resolved required Stage content placement.'),
  })
  .describe('Strict JSON-safe Stage compile artifact payload.');

/** Decision 已解析编译 artifact 载荷 */
export const DecisionArtifactSchema = z
  .strictObject({
    kind: z.literal('decision').describe('Decision artifact discriminator.'),
    ...LogicUnitArtifactBaseShape,
    content: LogicLayoutItemArtifactSchema.describe('Resolved required Decision content placement.'),
  })
  .describe('Strict JSON-safe Decision compile artifact payload.');

/** Junction 已解析编译 artifact 载荷 */
export const JunctionArtifactSchema = z
  .strictObject({
    kind: z.literal('junction').describe('Junction artifact discriminator.'),
    ...LogicUnitArtifactBaseShape,
    role: NonBlankStringSchema.optional().describe('Authored Junction role, when provided.'),
    content: LogicLayoutItemArtifactSchema.nullable().describe('Resolved Junction content placement, if present.'),
  })
  .describe('Strict JSON-safe Junction compile artifact payload.');
