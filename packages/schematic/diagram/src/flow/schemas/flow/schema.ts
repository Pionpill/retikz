import type { IRTextBlock } from '@retikz/core';

import { ScopePropsSchema, TextBlockSchema } from '@retikz/core';
import { NonBlankStringSchema, NonNegativeIntegerSchema, NonNegativeNumberSchema } from '@retikz/foundation';
import {
  EntityRoleSchema,
  GraphStatusSchema,
  RelationDirectionSchema,
  RelationKindSchema,
  RelationRoleSchema,
} from '@retikz/graph';
import { array, enum as zodEnum, literal, strictObject } from 'zod';

import {
  DIAGRAM_NAMESPACE,
  DiagramFrameSchema,
  DiagramPresentationSchema,
  DiagramThemeSchema,
} from '../../../_diagram';
import { FLOW_TYPE, FlowDirection, FlowLayoutAlignment } from '../../shared';
import {
  FlowEntityLayoutSchema,
  FlowEntityStyleSchema,
  FlowGroupStyleSchema,
  FlowLayoutIntentSchema,
  FlowRelationLayoutSchema,
  FlowRelationStyleSchema,
  FlowThemeSchema,
  FlowThemeTokenOverridesSchema,
} from '../theme';

/** Flow Entity 文本是否至少包含一个非空白的可见文本或 TeX run */
const hasFlowEntityText = (text: IRTextBlock): boolean => {
  if (typeof text === 'string') return text.trim().length > 0;
  return text.some(line => {
    if (typeof line === 'string') return line.trim().length > 0;
    if ('text' in line) return line.text.trim().length > 0;
    return line.runs.some(run => ('text' in run ? run.text : run.tex).trim().length > 0);
  });
};

const FlowEntityTextSchema = TextBlockSchema.refine(hasFlowEntityText, {
  message: 'Flow Entity text must contain at least one non-whitespace text or TeX run.',
});

export const FlowEntitySchema = strictObject({
  id: NonBlankStringSchema.describe('Flow-wide authored Entity identity.'),
  text: FlowEntityTextSchema.describe('Required Core TextBlock with at least one non-whitespace text or TeX run.'),
  role: EntityRoleSchema.optional().describe('Open Graph Entity role; omission resolves to concept.'),
  kind: NonBlankStringSchema.optional().describe('Open stable kind within the selected Entity role.'),
  status: GraphStatusSchema.optional().describe('Optional closed Graph semantic status.'),
  rank: NonNegativeIntegerSchema.optional().describe('Optional rank constraint within the nearest Flow scope.'),
  style: FlowEntityStyleSchema.optional().describe('Entity-local drawing overrides.'),
  layout: FlowEntityLayoutSchema.optional().describe('Entity-local layout overrides.'),
}).describe('LLM-friendly Flow Entity projected to one Graph Entity.');

/** Flow Group 的闭合持久化 Source schema */
export const FlowGroupSchema = strictObject({
  id: NonBlankStringSchema.describe('Flow-wide authored Group identity.'),
  rank: NonNegativeIntegerSchema.optional().describe('Optional rank constraint within the nearest Flow scope.'),
  layout: FlowLayoutIntentSchema.optional().describe('Layout overrides for this Group contents.'),
  label: NonBlankStringSchema.optional().describe('Optional Graph Group caption title.'),
  style: FlowGroupStyleSchema.optional().describe('Group-local drawing overrides.'),
  children: array(NonBlankStringSchema).nonempty().describe('Non-empty ordered direct child identity references.'),
}).describe('Visible Flow Group projected to one Graph Group shell.');

/** Flow Layout 的闭合持久化 Source schema */
export const FlowLayoutSchema = strictObject({
  id: NonBlankStringSchema.describe('Flow-wide authored Layout identity.'),
  rank: NonNegativeIntegerSchema.optional().describe('Optional rank constraint within the parent Flow scope.'),
  direction: zodEnum(FlowDirection).describe('Required authored direction for direct children placement.'),
  gap: NonNegativeNumberSchema.optional().describe('Optional gap between direct children in user units.'),
  align: zodEnum(FlowLayoutAlignment)
    .optional()
    .describe('Optional cross-axis alignment; omission resolves to center.'),
  children: array(NonBlankStringSchema).nonempty().describe('Non-empty ordered direct child identity references.'),
}).describe('Invisible Flow Layout with author-controlled one-dimensional placement.');

export const FlowRelationSchema = strictObject({
  source: NonBlankStringSchema.describe('Authored source Flow element id.'),
  target: NonBlankStringSchema.describe('Authored target Flow element id.'),
  label: NonBlankStringSchema.optional().describe('Optional relation label measured and placed by Flow.'),
  role: RelationRoleSchema.optional().describe('Open Graph Relation role; omission resolves to flow.'),
  kind: RelationKindSchema.optional().describe('Open stable kind within the selected Relation role.'),
  status: GraphStatusSchema.optional().describe('Optional closed Graph semantic status.'),
  direction: RelationDirectionSchema.optional().describe('Optional semantic direction overriding the Graph role.'),
  style: FlowRelationStyleSchema.optional().describe('Relation-local drawing overrides.'),
  layout: FlowRelationLayoutSchema.optional().describe('Relation-local routing override.'),
}).describe('Ordered root Flow Relation between authored element identities.');

/** Flow Diagram 的唯一持久化 Source schema */
export const FlowDiagramSchema = strictObject({
  type: literal(FLOW_TYPE).describe('Flow Diagram Source discriminator.'),
  namespace: literal(DIAGRAM_NAMESPACE).describe('Diagram semantic element namespace.'),
  ...ScopePropsSchema.shape,
  presentation: DiagramPresentationSchema.optional().describe('Optional complete Diagram Presentation.'),
  frame: DiagramFrameSchema.optional().describe('Optional Diagram Frame overrides.'),
  diagramTheme: DiagramThemeSchema.optional().describe('Optional Diagram Theme overrides.'),
  entities: array(FlowEntitySchema).nonempty().describe('Non-empty flat Flow Entity declaration catalog.'),
  groups: array(FlowGroupSchema).describe('Flat Flow Group declaration catalog; empty when no Groups are authored.'),
  layouts: array(FlowLayoutSchema).describe(
    'Flat Flow Layout declaration catalog; empty when no Layouts are authored.',
  ),
  relations: array(FlowRelationSchema).nonempty().optional().describe('Optional non-empty root relation collection.'),
  flowThemeTokens: FlowThemeTokenOverridesSchema.optional().describe('Optional flat Flow token overrides.'),
  flowTheme: FlowThemeSchema.optional().describe('Optional structured global Flow configuration.'),
  children: array(NonBlankStringSchema)
    .nonempty()
    .describe('Non-empty ordered direct child references of the Flow root.'),
}).describe('LLM-first Flow Diagram Source without derived geometry.');
