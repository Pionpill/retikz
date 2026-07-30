import { z } from 'zod';

const finite = z.number().finite();
const role = z
  .string()
  .min(3)
  .regex(/^[^\s.]+(?:\.[^\s.]+)+$/);

/** Inspection primitive 的语义色阶 schema */
export const InspectionToneSchema = z.enum(['neutral', 'accent', 'guide', 'warning']);

/** Inspection line style schema */
export const InspectionLineStyleSchema = z.enum(['solid', 'dashed', 'dotted']);

/** Inspection rect primitive schema */
export const InspectionRectPrimitiveSchema = z.strictObject({
  kind: z.literal('rect'),
  role,
  x: finite,
  y: finite,
  width: finite.nonnegative(),
  height: finite.nonnegative(),
  presentation: z.enum(['outline', 'fill']),
  tone: InspectionToneSchema,
  lineStyle: InspectionLineStyleSchema.optional(),
  opacity: finite.min(0).max(1).optional(),
});

/** Inspection line primitive schema */
export const InspectionLinePrimitiveSchema = z.strictObject({
  kind: z.literal('line'),
  role,
  x1: finite,
  y1: finite,
  x2: finite,
  y2: finite,
  tone: InspectionToneSchema,
  lineStyle: InspectionLineStyleSchema,
  opacity: finite.min(0).max(1).optional(),
});

/** Inspection label primitive schema */
export const InspectionLabelPrimitiveSchema = z.strictObject({
  kind: z.literal('label'),
  role,
  x: finite,
  y: finite,
  text: z.string().min(1).max(128),
  tone: InspectionToneSchema,
});

/** Inspection primitive union schema */
export const InspectionPrimitiveSchema = z.discriminatedUnion('kind', [
  InspectionRectPrimitiveSchema,
  InspectionLinePrimitiveSchema,
  InspectionLabelPrimitiveSchema,
]);

const CompileExpansionSegmentSchema = z.strictObject({
  kind: z.enum(['expand', 'output', 'probe', 'replay', 'scopeChild']),
  index: z.number().int().nonnegative().safe(),
});

const CompileOccurrenceLocatorSchema = z.strictObject({
  sourcePath: z.string().min(1),
  expansionPath: z.array(CompileExpansionSegmentSchema),
});

/** 单个 occurrence 的 inspection plane entry schema */
export const InspectionPlaneEntrySchema = z.strictObject({
  occurrence: CompileOccurrenceLocatorSchema,
  transform: z.tuple([finite, finite, finite, finite, finite, finite]),
  primitives: z.array(InspectionPrimitiveSchema),
});

/** 独立 inspection plane schema */
export const InspectionPlaneSchema = z.strictObject({
  entries: z.array(InspectionPlaneEntrySchema),
});

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
