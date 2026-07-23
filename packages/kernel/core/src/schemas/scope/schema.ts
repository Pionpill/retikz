import { z } from 'zod';

import { AnimationTrackSchema } from '../animation';
import { ClipSpecSchema } from '../clip';
import { FontSchema } from '../font';
import { JsonObjectSchema } from '../json';
import { NodeSchema } from '../node';
import { ArrowDetailSchema, PathBaseSchema } from '../path';
import { NodeTargetSchema, PositionSchema } from '../position';
import { getRecursiveChildSchema } from '../recursive';
import { ScopeSelfPointSchema } from '../scope-point';
import { CascadingGraphicStyleSchema, CssColorSchema, OpacitySchema } from '../style';
import { TransformSchema } from '../transform';
import { ScopeBoundingShape, ScopeStyleChannel } from './constants';

// ===========================================================================
// every-X 四通道默认 schema —— 各从对应元素 schema `.omit()` 派生（单一真源，禁手抄）
// 全字段 optional（继承自源 schema）、顶层 `.strict()` 严拒未知 / 被排除字段
// ===========================================================================

export const NodeDefaultSchema = NodeSchema.omit({
  type: true,
  id: true,
  position: true,
  text: true,
  label: true,
  zIndex: true,
  meta: true,
  animations: true,
}).strict();

export const PathDefaultSchema = PathBaseSchema.omit({
  type: true,
  kind: true,
  kindOptions: true,
  ribbon: true,
  label: true,
  id: true,
  children: true,
  marks: true,
  zIndex: true,
  meta: true,
  animations: true,
}).strict();

export const LabelDefaultSchema = z
  .object({
    color: CssColorSchema.optional().describe('Master color for labels in this scope; textColor falls back to it.'),
    textColor: CssColorSchema.optional().describe('Default text color for node labels and step labels in this scope.'),
    opacity: OpacitySchema.optional().describe('Default label opacity.'),
    font: FontSchema.optional().describe('Default label font (family / size / weight / style); per-field fallback.'),
  })
  .strict()
  .describe('Default style applied to node labels and step labels in this scope.');

export const ArrowDefaultSchema = ArrowDetailSchema;

/** Scope placement 的闭合 target：父坐标系显式点或此前已完成的命名实体 */
export const ScopePlacementTargetSchema = z
  .union([PositionSchema, NodeTargetSchema.strict()])
  .describe('Parent-frame Cartesian point or previously resolved Node, Coordinate, or Scope target.');

/** Scope 固有包络到父坐标系 target 的锚点对齐放置 */
export const ScopePlacementSchema = z
  .strictObject({
    target: ScopePlacementTargetSchema.describe('Placement target resolved in the parent coordinate frame.'),
    selfAnchor: ScopeSelfPointSchema.optional().describe(
      'Point on the transformed Scope envelope aligned to target. Omitted fields use center.',
    ),
  })
  .describe('Placement that aligns a transformed intrinsic Scope point to a parent-frame target.');

export const ScopeSchema = z
  .object({
    type: z.literal('scope').describe('Discriminator marking this child as a scope container.'),
    ...CascadingGraphicStyleSchema.shape,
    id: z
      .string()
      .min(1)
      .optional()
      .describe('Optional reference id for targeting the scope as a whole. Always registers in the parent namespace.'),
    localNamespace: z
      .boolean()
      .optional()
      .describe(
        'When true, child node, coordinate, and nested-scope ids stay local to this scope. The scope id itself still registers in the parent namespace.',
      ),
    transforms: z
      .array(TransformSchema)
      .optional()
      .describe(
        'Local transforms applied to all scope children. Array order is application order; translate variants are lowered at compile time.',
      ),
    placement: ScopePlacementSchema.optional().describe(
      'Optional final placement applied after intrinsic layout and local transforms.',
    ),
    nodeDefault: NodeDefaultSchema.optional().describe(
      'Default style applied to nodes in this scope. Independent from the other default channels.',
    ),
    pathDefault: PathDefaultSchema.optional().describe(
      'Default style applied to path-like drawables in this scope. Arrows use the separate `arrowDefault` channel.',
    ),
    labelDefault: LabelDefaultSchema.optional().describe(
      'Default style applied to node labels and step labels in this scope.',
    ),
    arrowDefault: ArrowDefaultSchema.optional().describe('Default style applied to arrows in this scope.'),
    resetStyle: z
      .union([z.boolean(), z.array(z.enum(ScopeStyleChannel))])
      .optional()
      .describe(
        'Inheritance barrier for style defaults. Use true for all channels, or list node, path, label, and arrow channels to reset.',
      ),
    zIndex: z
      .number()
      .int()
      .optional()
      .describe(
        'Stacking order of this scope among sibling IR children. Applies to the scope group as one unit, not to children inside it.',
      ),
    clip: ClipSpecSchema.optional().describe(
      'Clip region for this scope in scope-local coordinates. Applies to clipped children through the emitted scope group.',
    ),
    boundingShape: z
      .enum(ScopeBoundingShape)
      .optional()
      .describe("Synthetic bounding envelope for this scope's id: rectangle or circle."),
    meta: JsonObjectSchema.optional().describe(
      'Opaque JSON metadata carried by this scope. Preserved into emitted Scene primitives and ignored by the compiler.',
    ),
    animations: z
      .array(AnimationTrackSchema)
      .optional()
      .describe(
        'Declarative animation tracks for this scope as a group. They do not affect layout and are not propagated to child elements.',
      ),
    children: z
      .array(z.lazy(() => getRecursiveChildSchema()))
      .describe('Scope children: nested nodes, paths, coordinates, scopes, or composites.'),
  })
  .strict()
  .describe(
    'Scope container: groups child IR elements, applies local transforms, and provides cascading style defaults.',
  );
