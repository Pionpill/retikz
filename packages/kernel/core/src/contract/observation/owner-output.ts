import type { infer as ZodInfer } from 'zod';

import { NonBlankStringSchema } from '@retikz/foundation';
import { array, literal, number, strictObject, tuple, union } from 'zod';

import { ClipFillRuleSchema, PathCommandSchema, PositionSchema } from '../../schemas';

const RectOwnerOutputSchema = strictObject({
  x: number().describe('Rect center x in the owner-local coordinate system.'),
  y: number().describe('Rect center y in the owner-local coordinate system.'),
  width: number().describe('Rect width in user units.'),
  height: number().describe('Rect height in user units.'),
  rotate: number().optional().describe('Rect rotation in radians.'),
}).describe('Owner-local rectangle with an optional rotation.');

const GeometryKeyPointOwnerOutputSchema = strictObject({
  name: NonBlankStringSchema.describe('Provider-defined unique key-point name.'),
  position: PositionSchema.describe('Key-point position in the owner-local coordinate system.'),
}).describe('Named structural key point supplied by a Shape provider.');

const NodeShapeOwnerOutputSchema = strictObject({
  name: NonBlankStringSchema.describe('Resolved Shape provider name.'),
  outline: array(PathCommandSchema)
    .nullable()
    .describe('Exact closed Shape outline, or null when the provider does not expose one.'),
  keyPoints: array(GeometryKeyPointOwnerOutputSchema)
    .nullable()
    .describe('Stable named Shape key points, or null when the provider does not expose them.'),
}).describe('Settled Shape geometry published for a Node occurrence.');

const NodeBoundaryOwnerOutputSchema = strictObject({
  name: NonBlankStringSchema.describe('Resolved Boundary provider name.'),
  outline: array(PathCommandSchema)
    .nullable()
    .describe('Exact closed Boundary outline, or null when the provider does not expose one.'),
}).describe('Settled Boundary geometry published for a Node occurrence.');

const NodeContentOwnerOutputSchema = strictObject({
  corners: tuple([PositionSchema, PositionSchema, PositionSchema, PositionSchema]).describe(
    'Content-box corners in top-left, top-right, bottom-right, bottom-left order.',
  ),
  baselines: array(
    strictObject({
      from: PositionSchema.describe('Baseline start point.'),
      to: PositionSchema.describe('Baseline end point.'),
    }).describe('One physical text-line baseline.'),
  ).describe('Physical baselines from the same settled text layout.'),
}).describe('Settled Node content-box geometry.');

/** Node 最终 occurrence 的局部几何与正文布局产物 schema */
export const NodeOwnerOutputSchema = strictObject({
  rect: RectOwnerOutputSchema.describe('Settled Node outer rectangle in occurrence-local coordinates.'),
  shape: NodeShapeOwnerOutputSchema,
  boundary: NodeBoundaryOwnerOutputSchema,
  content: NodeContentOwnerOutputSchema.nullable().describe('Settled content geometry, or null for no content.'),
}).describe('Settled Node owner output exposed to compile observers.');

/** Node 最终 occurrence 的局部几何与正文布局产物 */
export type NodeOwnerOutput = ZodInfer<typeof NodeOwnerOutputSchema>;

const ScopeEnvelopeOwnerOutputSchema = strictObject({
  shape: union([literal('rectangle'), literal('circle')]).describe('Intrinsic envelope shape.'),
  rect: RectOwnerOutputSchema.describe('Intrinsic envelope rectangle before Scope transforms and placement.'),
}).describe('Intrinsic Scope envelope.');

/** Scope 最终 occurrence 的固有包络产物 schema */
export const ScopeOwnerOutputSchema = strictObject({
  envelope: ScopeEnvelopeOwnerOutputSchema.nullable().describe(
    'Intrinsic Scope envelope, or null when no child layout contributes to it.',
  ),
}).describe('Settled Scope owner output exposed to compile observers.');

/** Scope 最终 occurrence 的固有包络产物 */
export type ScopeOwnerOutput = ZodInfer<typeof ScopeOwnerOutputSchema>;

/** Coordinate 最终 occurrence 的已解析点产物 schema */
export const CoordinateOwnerOutputSchema = strictObject({
  id: NonBlankStringSchema.describe('Resolved Coordinate id.'),
  position: PositionSchema.describe('Resolved Coordinate position in occurrence-local coordinates.'),
}).describe('Settled Coordinate owner output exposed to compile observers.');

/** Coordinate 最终 occurrence 的已解析点产物 */
export type CoordinateOwnerOutput = ZodInfer<typeof CoordinateOwnerOutputSchema>;

const SceneClipPathOwnerOutputSchema = strictObject({
  commands: array(PathCommandSchema).describe('Final lowered structured clip commands.'),
  fillRule: ClipFillRuleSchema.describe('Explicit fill rule for the lowered clip path.'),
}).describe('Final lowered clip path; subpaths may rely on fill-rule implicit closure.');

/** 一次 Clip 应用的最终 lowering 路径产物 schema */
export const ClipOwnerOutputSchema = strictObject({
  path: SceneClipPathOwnerOutputSchema.describe('Final lowered path for one logical Clip application.'),
}).describe('Settled Clip owner output exposed to compile observers.');

/** 一次 Clip 应用的最终 lowering 路径产物 */
export type ClipOwnerOutput = ZodInfer<typeof ClipOwnerOutputSchema>;
