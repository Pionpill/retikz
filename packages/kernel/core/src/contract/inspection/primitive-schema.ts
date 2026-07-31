import { z } from 'zod';

/** Inspection primitive 的语义色阶 */
const InspectionTone = {
  Neutral: 'neutral',
  Accent: 'accent',
  Guide: 'guide',
  Warning: 'warning',
} as const;

/** Inspection primitive 的线条样式 */
const InspectionLineStyle = {
  Solid: 'solid',
  Dashed: 'dashed',
  Dotted: 'dotted',
} as const;

/** Inspection rect 的呈现方式 */
const InspectionRectPresentation = {
  Outline: 'outline',
  Fill: 'fill',
} as const;

/** Inspection primitive 的判别类型 */
const InspectionPrimitiveKind = {
  Rect: 'rect',
  Line: 'line',
  Label: 'label',
} as const;

/** Compile occurrence expansion path 的段类型 */
const CompileExpansionSegmentKind = {
  Expand: 'expand',
  Output: 'output',
  Probe: 'probe',
  Replay: 'replay',
  ScopeChild: 'scopeChild',
} as const;

const finite = z.number();
const role = z
  .string()
  .min(3)
  .regex(/^[^\s.]+(?:\.[^\s.]+)+$/)
  .describe('Dot-separated semantic role used to identify the guide without renderer-specific ids.');

/** Inspection primitive 的语义色阶 schema */
export const InspectionToneSchema = z.enum(InspectionTone).describe('Semantic tone used by inspection renderers.');

/** Inspection line style schema */
export const InspectionLineStyleSchema = z
  .enum(InspectionLineStyle)
  .describe('Renderer-neutral stroke pattern for inspection guides.');

/** Inspection rect primitive schema */
export const InspectionRectPrimitiveSchema = z
  .strictObject({
    kind: z.literal(InspectionPrimitiveKind.Rect).describe('Discriminator for an inspection rectangle.'),
    role,
    x: finite.describe('Rectangle x coordinate in the occurrence-local coordinate system.'),
    y: finite.describe('Rectangle y coordinate in the occurrence-local coordinate system.'),
    width: finite.nonnegative().describe('Non-negative rectangle width.'),
    height: finite.nonnegative().describe('Non-negative rectangle height.'),
    presentation: z
      .enum(InspectionRectPresentation)
      .describe('Whether the rectangle is drawn as an outline or a filled region.'),
    tone: InspectionToneSchema,
    lineStyle: InspectionLineStyleSchema.optional().describe('Optional stroke pattern for an outlined rectangle.'),
    opacity: finite.min(0).max(1).optional().describe('Optional opacity between 0 and 1.'),
  })
  .describe('Renderer-neutral rectangle in an inspection plane.');

/** Inspection line primitive schema */
export const InspectionLinePrimitiveSchema = z
  .strictObject({
    kind: z.literal(InspectionPrimitiveKind.Line).describe('Discriminator for an inspection line.'),
    role,
    x1: finite.describe('Start x coordinate in the occurrence-local coordinate system.'),
    y1: finite.describe('Start y coordinate in the occurrence-local coordinate system.'),
    x2: finite.describe('End x coordinate in the occurrence-local coordinate system.'),
    y2: finite.describe('End y coordinate in the occurrence-local coordinate system.'),
    tone: InspectionToneSchema,
    lineStyle: InspectionLineStyleSchema,
    opacity: finite.min(0).max(1).optional().describe('Optional opacity between 0 and 1.'),
  })
  .describe('Renderer-neutral line in an inspection plane.');

/** Inspection label primitive schema */
export const InspectionLabelPrimitiveSchema = z
  .strictObject({
    kind: z.literal(InspectionPrimitiveKind.Label).describe('Discriminator for an inspection label.'),
    role,
    x: finite.describe('Label anchor x coordinate in the occurrence-local coordinate system.'),
    y: finite.describe('Label anchor y coordinate in the occurrence-local coordinate system.'),
    text: z.string().min(1).max(128).describe('Short inspection label text.'),
    tone: InspectionToneSchema,
  })
  .describe('Renderer-neutral text label in an inspection plane.');

/** Inspection primitive union schema */
export const InspectionPrimitiveSchema = z
  .discriminatedUnion('kind', [
    InspectionRectPrimitiveSchema,
    InspectionLinePrimitiveSchema,
    InspectionLabelPrimitiveSchema,
  ])
  .describe('Renderer-neutral primitive emitted by a composite inspector.');

const CompileExpansionSegmentSchema = z
  .strictObject({
    kind: z.enum(CompileExpansionSegmentKind).describe('Expansion path segment discriminator.'),
    index: z.number().int().nonnegative().safe().describe('Zero-based index within the selected expansion branch.'),
  })
  .describe('One segment of a compile occurrence expansion path.');

const CompileOccurrenceLocatorSchema = z
  .strictObject({
    sourcePath: z.string().min(1).describe('Stable authored source path for the composite occurrence.'),
    expansionPath: z.array(CompileExpansionSegmentSchema).describe('Compile-local expansion path for the occurrence.'),
  })
  .describe('Occurrence identity shared with composite artifacts and diagnostics.');

/** 单个 occurrence 的 inspection plane entry schema */
export const InspectionPlaneEntrySchema = z
  .strictObject({
    occurrence: CompileOccurrenceLocatorSchema.describe('Composite occurrence that owns these inspection primitives.'),
    transform: z
      .tuple([finite, finite, finite, finite, finite, finite])
      .describe('Affine transform from occurrence-local coordinates into Scene coordinates.'),
    primitives: z.array(InspectionPrimitiveSchema).describe('Ordered inspection primitives for this occurrence.'),
  })
  .describe('One occurrence-scoped entry in the inspection plane.');

/** 独立 inspection plane schema */
export const InspectionPlaneSchema = z
  .strictObject({
    entries: z.array(InspectionPlaneEntrySchema).describe('Inspection entries in deterministic compile order.'),
  })
  .describe('Complete renderer-neutral inspection plane committed beside the primary Scene.');

/** Inspection primitive */
export type InspectionPrimitive = z.infer<typeof InspectionPrimitiveSchema>;

/** Inspection rect primitive */
export type InspectionRectPrimitive = z.infer<typeof InspectionRectPrimitiveSchema>;

/** Inspection line primitive */
export type InspectionLinePrimitive = z.infer<typeof InspectionLinePrimitiveSchema>;

/** Inspection label primitive */
export type InspectionLabelPrimitive = z.infer<typeof InspectionLabelPrimitiveSchema>;

/** 单个 occurrence 的 inspection plane entry */
export type InspectionPlaneEntry = z.infer<typeof InspectionPlaneEntrySchema>;

/** 独立 inspection plane */
export type InspectionPlane = z.infer<typeof InspectionPlaneSchema>;
