import type { IRTextBlock } from '@retikz/core';

import { ScopePropsSchema, TextBlockSchema } from '@retikz/core';
import { NonBlankStringSchema, NonNegativeIntegerSchema, NonNegativeNumberSchema } from '@retikz/foundation';
import {
  EntityRoleSchema,
  EntitySchema,
  GraphRelationDefaultsSchema,
  GraphRuleSchema,
  GraphStatusSchema,
  GroupCaptionTextSchema,
  GroupSchema,
  RelationDirectionSchema,
  RelationKindSchema,
  RelationRoleSchema,
  RelationSchema,
} from '@retikz/graph';
import { GRID_LAYOUT_MAX_TRACKS_PER_AXIS } from '@retikz/layout';
import { array, boolean as zodBoolean, discriminatedUnion, enum as zodEnum, literal, record, strictObject } from 'zod';

import {
  DIAGRAM_NAMESPACE,
  DiagramDefaultsSchema,
  DiagramFrameSchema,
  DiagramPresentationSchema,
} from '../../../_diagram';
import { FLOW_TYPE, FlowDirection, FlowLayoutAlignment, FlowPlacementKind, FlowRoutingKind } from '../../shared';

const requireOverrides = (label: string) => ({
  message: `${label} must contain at least one override.`,
});

const FlowStraightRoutingSchema = strictObject({
  kind: literal(FlowRoutingKind.Straight).describe('Straight two-endpoint route intent.'),
});

const FlowOrthogonalRoutingSchema = strictObject({
  kind: literal(FlowRoutingKind.Orthogonal).describe('Axis-aligned route intent.'),
  cornerRadius: NonNegativeNumberSchema.optional().describe(
    'Corner radius; omission inherits the ancestor axis-aligned routing or the selected layout Definition.',
  ),
});

const FlowHorizontalThenVerticalRoutingSchema = FlowOrthogonalRoutingSchema.extend({
  kind: literal(FlowRoutingKind.HorizontalThenVertical).describe(
    'Horizontal then vertical single-elbow route; no obstacle avoidance.',
  ),
});

const FlowVerticalThenHorizontalRoutingSchema = FlowOrthogonalRoutingSchema.extend({
  kind: literal(FlowRoutingKind.VerticalThenHorizontal).describe(
    'Vertical then horizontal single-elbow route; no obstacle avoidance.',
  ),
});

export const FlowRoutingSchema = discriminatedUnion('kind', [
  FlowStraightRoutingSchema,
  FlowOrthogonalRoutingSchema,
  FlowHorizontalThenVerticalRoutingSchema,
  FlowVerticalThenHorizontalRoutingSchema,
]).describe('Provider-neutral Flow relation routing intent.');

const FlowLayoutIntentBaseSchema = strictObject({
  direction: zodEnum(FlowDirection).optional().describe('Primary direction for this Flow layout scope.'),
  nodeGap: NonNegativeNumberSchema.optional().describe('Minimum gap between peers in the same rank.'),
  rankGap: NonNegativeNumberSchema.optional().describe('Minimum gap between adjacent ranks.'),
});

export const FlowLayoutIntentSchema = FlowLayoutIntentBaseSchema.refine(
  value => Object.keys(value).length > 0,
  requireOverrides('Flow layout intent'),
).describe('Non-empty provider-neutral layout overrides for one Flow scope.');

const FlowEntityStyleFieldsSchema = EntitySchema.shape.style.unwrap().pick({
  color: true,
  textColor: true,
  fill: true,
  stroke: true,
  fillOpacity: true,
  strokeWidth: true,
  strokeOpacity: true,
  opacity: true,
  shadow: true,
  blendMode: true,
  dashed: true,
  dotted: true,
  dashPattern: true,
  dashOffset: true,
  font: true,
});

const FlowEntityLayoutFieldsSchema = EntitySchema.shape.layout.unwrap().pick({
  align: true,
  lineHeight: true,
  maxTextWidth: true,
  minimumSize: true,
  margin: true,
});

export const FlowEntityStyleSchema = FlowEntityStyleFieldsSchema.refine(
  value => Object.keys(value).length > 0,
  requireOverrides('Flow Entity style'),
).describe('Non-empty Graph-compatible visual overrides for one Flow Entity.');

export const FlowEntityLayoutSchema = FlowEntityLayoutFieldsSchema.refine(
  value => Object.keys(value).length > 0,
  requireOverrides('Flow Entity layout'),
).describe('Non-empty size, collision-margin, and text-layout overrides for one Flow Entity.');

export const FlowGroupCaptionTitleSchema = strictObject({
  text: NonBlankStringSchema.describe('Non-empty Group caption title text.'),
  align: GroupCaptionTextSchema.shape.align,
  lineHeight: GroupCaptionTextSchema.shape.lineHeight,
  maxTextWidth: GroupCaptionTextSchema.shape.maxTextWidth,
  textColor: GroupCaptionTextSchema.shape.textColor,
  font: GroupCaptionTextSchema.shape.font,
  opacity: GroupCaptionTextSchema.shape.opacity,
}).describe('Flow Group caption title with optional Graph-compatible text formatting.');

export const FlowGroupCaptionSchema = strictObject({
  title: FlowGroupCaptionTitleSchema,
}).describe('Flow Group caption containing a visible title.');

export const FlowRelationStyleSchema = strictObject({
  ...RelationSchema.shape.style.unwrap().shape,
})
  .refine(value => Object.keys(value).length > 0, requireOverrides('Flow Relation style'))
  .describe('Non-empty Graph-compatible path style overrides for one Flow Relation.');

export const FlowDefaultsLayoutSchema = FlowLayoutIntentBaseSchema.pick({ nodeGap: true, rankGap: true }).describe(
  'Sparse Flow layout spacing defaults without direction or routing.',
);

export const FlowDefaultsEntitySchema = strictObject({
  style: FlowEntityStyleFieldsSchema.optional().describe('Sparse Flow Entity style defaults.'),
  layout: FlowEntityLayoutFieldsSchema.optional().describe('Sparse Flow Entity layout defaults.'),
}).describe('Sparse Flow Entity defaults using the formal Flow Entity style and layout paths.');

export const FlowDefaultsGroupCaptionTitleSchema = FlowGroupCaptionTitleSchema.omit({ text: true }).describe(
  'Sparse Flow Group caption title defaults without content.',
);

export const FlowDefaultsGroupCaptionSchema = strictObject({
  title: FlowDefaultsGroupCaptionTitleSchema.optional().describe('Optional Group caption title defaults.'),
}).describe('Sparse Flow Group caption defaults without content.');

export const FlowDefaultsGroupSchema = strictObject({
  padding: GroupSchema.shape.padding.describe('Default Group Surface padding.'),
  background: GroupSchema.shape.background.describe('Default Group Surface background.'),
  border: GroupSchema.shape.border.describe('Default Group Surface border.'),
  cornerRadius: GroupSchema.shape.cornerRadius.describe('Default Group Surface corner radius.'),
  caption: FlowDefaultsGroupCaptionSchema.optional().describe('Optional Group caption title defaults.'),
}).describe('Sparse Flow Group defaults without overflow or layout strategy.');

export const FlowDefaultsRelationSchema = strictObject({
  ...GraphRelationDefaultsSchema.shape,
}).describe('Sparse Flow Relation defaults using Graph-compatible style and root fields.');

export const FlowDefaultsSchema = strictObject({
  layout: FlowDefaultsLayoutSchema.optional().describe('Optional Flow layout spacing defaults.'),
  entity: FlowDefaultsEntitySchema.optional().describe('Optional Flow Entity defaults.'),
  group: FlowDefaultsGroupSchema.optional().describe('Optional Flow Group defaults.'),
  relation: FlowDefaultsRelationSchema.optional().describe('Optional Flow Relation defaults.'),
}).describe('Sparse Flow defaults using the formal Flow Source paths.');

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
  group: EntitySchema.shape.group.describe('Optional Graph visual color grouping identifier.'),
  status: GraphStatusSchema.optional().describe('Optional closed Graph semantic status.'),
  rank: NonNegativeIntegerSchema.optional().describe('Optional rank constraint within the nearest Flow scope.'),
  style: FlowEntityStyleSchema.optional().describe('Entity-local visual overrides.'),
  layout: FlowEntityLayoutSchema.optional().describe('Entity-local size, margin, and text-layout overrides.'),
}).describe('LLM-friendly Flow Entity projected to one Graph Entity.');

export const FlowGroupSchema = strictObject({
  id: NonBlankStringSchema.describe('Flow-wide authored Group identity.'),
  rank: NonNegativeIntegerSchema.optional().describe('Optional rank constraint within the nearest Flow scope.'),
  layout: FlowLayoutIntentSchema.optional().describe('Layout overrides for this Group contents.'),
  routing: FlowRoutingSchema.optional().describe('Routing default for Relations in this Group scope.'),
  caption: FlowGroupCaptionSchema.optional().describe('Optional Group caption title.'),
  padding: GroupSchema.shape.padding.describe('Group Surface padding override.'),
  background: GroupSchema.shape.background.describe('Group Surface background override.'),
  border: GroupSchema.shape.border.describe('Group Surface border override.'),
  cornerRadius: GroupSchema.shape.cornerRadius.describe('Group Surface corner radius override.'),
  overflow: GroupSchema.shape.overflow.describe('Group content overflow policy.'),
  children: array(NonBlankStringSchema).nonempty().describe('Non-empty ordered direct child identity references.'),
}).describe('Visible Flow Group projected to one Graph Group shell.');

const FlowLayoutBaseSchema = strictObject({
  id: NonBlankStringSchema.describe('Flow-wide authored Layout identity.'),
  rank: NonNegativeIntegerSchema.optional().describe('Optional rank constraint within the parent Flow scope.'),
  children: array(NonBlankStringSchema).nonempty().describe('Non-empty ordered direct child identity references.'),
});

const FlowLinearLayoutSchema = strictObject({
  kind: literal(FlowPlacementKind.Linear).describe('One-dimensional placement discriminator.'),
  ...FlowLayoutBaseSchema.shape,
  direction: zodEnum(FlowDirection).describe('Required authored direction for direct children placement.'),
  gap: NonNegativeNumberSchema.optional().describe('Optional gap between direct children in user units.'),
  align: zodEnum(FlowLayoutAlignment)
    .optional()
    .describe('Optional cross-axis alignment; omission resolves to center.'),
}).describe('Invisible Flow Layout with author-controlled one-dimensional placement.');

const FlowGridPlacementSchema = strictObject({
  row: NonNegativeIntegerSchema.max(GRID_LAYOUT_MAX_TRACKS_PER_AXIS - 1).describe('Zero-based physical row index.'),
  column: NonNegativeIntegerSchema.max(GRID_LAYOUT_MAX_TRACKS_PER_AXIS - 1).describe(
    'Zero-based physical column index.',
  ),
});

const FlowGridPlacementMatrixSchema = array(array(NonBlankStringSchema.nullable()).max(GRID_LAYOUT_MAX_TRACKS_PER_AXIS))
  .max(GRID_LAYOUT_MAX_TRACKS_PER_AXIS)
  .describe(
    'Physical Grid rows. Each non-null cell references one direct child; row and column indices derive from array positions.',
  );

const FlowGridPlacementsSchema = FlowGridPlacementMatrixSchema.or(
  record(NonBlankStringSchema, FlowGridPlacementSchema).describe(
    'Direct-child Grid cells keyed by authored identity with explicit zero-based row and column indices.',
  ),
);

const FlowGridLayoutSchema = strictObject({
  kind: literal(FlowPlacementKind.Grid).describe('Shared row and column placement discriminator.'),
  ...FlowLayoutBaseSchema.shape,
  rowGap: NonNegativeNumberSchema.optional().describe('Minimum row track gap. Omission uses inherited nodeGap.'),
  columnGap: NonNegativeNumberSchema.optional().describe('Minimum column track gap. Omission uses inherited nodeGap.'),
  reserveLabelSpace: zodBoolean()
    .optional()
    .describe('Whether measured relation labels expand their matching Grid track gap. Omission enables reservation.'),
  placements: FlowGridPlacementsSchema.describe(
    'Grid positions as a recommended row-major matrix or an id-keyed row and column mapping.',
  ),
});

export const FlowLayoutSchema = discriminatedUnion('kind', [FlowLinearLayoutSchema, FlowGridLayoutSchema])
  .superRefine((layout, context) => {
    if (layout.kind !== FlowPlacementKind.Grid) return;
    const children = new Set(layout.children);
    if (Array.isArray(layout.placements)) {
      const placed = new Set<string>();
      for (const [row, cells] of layout.placements.entries()) {
        for (const [column, child] of cells.entries()) {
          if (child === null) continue;
          if (!children.has(child)) {
            context.addIssue({
              code: 'custom',
              path: ['placements', row, column],
              message: 'Grid cell must reference a direct child.',
            });
          }
          if (placed.has(child)) {
            context.addIssue({
              code: 'custom',
              path: ['placements', row, column],
              message: 'Grid child must appear in exactly one cell.',
            });
          }
          placed.add(child);
        }
      }
      for (const child of children) {
        if (!placed.has(child)) {
          context.addIssue({
            code: 'custom',
            path: ['placements'],
            message: `Direct child '${child}' requires a Grid cell.`,
          });
        }
      }
      return;
    }
    const occupied = new Set<string>();
    for (const [child, cell] of Object.entries(layout.placements)) {
      if (!children.has(child)) {
        context.addIssue({
          code: 'custom',
          path: ['placements', child],
          message: 'Grid cell must reference a direct child.',
        });
      }
      const coordinate = `${cell.row}:${cell.column}`;
      if (occupied.has(coordinate)) {
        context.addIssue({
          code: 'custom',
          path: ['placements', child],
          message: 'Grid cells must not overlap.',
        });
      }
      occupied.add(coordinate);
    }
    for (const child of children) {
      if (!Object.hasOwn(layout.placements, child)) {
        context.addIssue({
          code: 'custom',
          path: ['placements', child],
          message: 'Every direct child requires a placement.',
        });
      }
    }
  })
  .describe('Invisible Flow Layout with explicit linear or grid placement.');

export const FlowRelationSchema = strictObject({
  source: NonBlankStringSchema.describe('Authored source Flow element id.'),
  target: NonBlankStringSchema.describe('Authored target Flow element id.'),
  label: NonBlankStringSchema.optional().describe('Optional relation label measured and placed by Flow.'),
  role: RelationRoleSchema.optional().describe('Open Graph Relation role; omission resolves to flow.'),
  kind: RelationKindSchema.optional().describe('Open stable kind within the selected Relation role.'),
  status: GraphStatusSchema.optional().describe('Optional closed Graph semantic status.'),
  direction: RelationDirectionSchema.optional().describe('Optional semantic direction overriding the Graph role.'),
  group: RelationSchema.shape.group.describe('Optional Graph Relation color grouping identifier.'),
  style: FlowRelationStyleSchema.optional().describe('Relation-local path style overrides.'),
  sourceMarker: RelationSchema.shape.sourceMarker.describe('Source marker appearance fields.'),
  targetMarker: RelationSchema.shape.targetMarker.describe('Target marker appearance fields.'),
  labelTextForeground: RelationSchema.shape.labelTextForeground.describe('Relation label text color.'),
  labelFont: RelationSchema.shape.labelFont.describe('Relation label font.'),
  labelOpacity: RelationSchema.shape.labelOpacity.describe('Relation label opacity.'),
  routing: FlowRoutingSchema.optional().describe('Relation-local routing override.'),
}).describe('Ordered root Flow Relation between authored element identities.');

export const FlowDiagramSchema = strictObject({
  type: literal(FLOW_TYPE).describe('Flow Diagram Source discriminator.'),
  namespace: literal(DIAGRAM_NAMESPACE).describe('Diagram semantic element namespace.'),
  ...ScopePropsSchema.shape,
  presentation: DiagramPresentationSchema.optional().describe('Optional complete Diagram Presentation.'),
  frame: DiagramFrameSchema.optional().describe('Optional Diagram Frame overrides.'),
  diagramDefaults: DiagramDefaultsSchema.optional().describe('Optional Diagram Source defaults.'),
  flowDefaults: FlowDefaultsSchema.optional().describe('Optional Flow Source defaults.'),
  graphRules: array(GraphRuleSchema)
    .optional()
    .describe('Optional ordered Graph rules for Flow-materialized Entities and Relations.'),
  layout: FlowLayoutIntentSchema.optional().describe('Root Flow layout overrides.'),
  routing: FlowRoutingSchema.optional().describe('Root Flow relation routing default.'),
  entities: array(FlowEntitySchema).nonempty().describe('Non-empty flat Flow Entity declaration catalog.'),
  groups: array(FlowGroupSchema).describe('Flat Flow Group declaration catalog; empty when no Groups are authored.'),
  layouts: array(FlowLayoutSchema).describe(
    'Flat Flow Layout declaration catalog; empty when no Layouts are authored.',
  ),
  relations: array(FlowRelationSchema).nonempty().optional().describe('Optional non-empty root relation collection.'),
  children: array(NonBlankStringSchema)
    .nonempty()
    .describe('Non-empty ordered direct child references of the Flow root.'),
}).describe('LLM-first Flow Diagram Source without derived geometry.');
