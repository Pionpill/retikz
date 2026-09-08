import { JsonObjectSchema, NonBlankStringSchema } from '@retikz/foundation';
import { array, boolean, enum as zodEnum, lazy, literal, number, object, strictObject, union } from 'zod';

import { AnimationTrackSchema } from '../animation';
import { ClipSchema } from '../clip';
import { FontSchema } from '../font';
import { NodeSchema } from '../node';
import { ArrowDetailSchema, PathBaseSchema } from '../path';
import { NodeTargetSchema, PositionSchema } from '../position';
import { getRecursiveChildSchema } from '../recursive';
import { ScopeSelfPointSchema } from '../scope-point';
import { CascadingGraphicStyleSchema, ContextualColorSchema, CssColorSchema, OpacitySchema } from '../style';
import { ThemeSchema } from '../theme';
import { TransformSchema } from '../transform';
import { ScopeBoundingShape, ScopeStyleChannel } from './constants';

/** 节点默认值仅继承明确允许的几何与命名分组 */
export const NodeDefaultSchema = NodeSchema.pick({
  shape: true,
  boundary: true,
  cornerRadius: true,
  rotate: true,
  scale: true,
  style: true,
  layout: true,
});

/** 路径默认值仅继承视觉与整体几何 */
export const PathDefaultSchema = PathBaseSchema.pick({ style: true, roundedCorners: true, rotate: true, scale: true });

export const LabelDefaultSchema = object({
  color: CssColorSchema.optional().describe('Master color for labels in this scope; textColor falls back to it.'),
  textColor: ContextualColorSchema.optional().describe(
    'Default label text color: an exact CSS color or a weight derived from the effective label / host master color.',
  ),
  opacity: OpacitySchema.optional().describe('Default label opacity.'),
  font: FontSchema.optional().describe('Default label font (family / size / weight / style); per-field fallback.'),
})
  .strict()
  .describe('Default style applied to node labels and step labels in this scope.');

export const ArrowDefaultSchema = ArrowDetailSchema;

/** Scope placement 的闭合 target：父坐标系显式点或此前已完成的命名实体 */
export const ScopePlacementTargetSchema = union([PositionSchema, NodeTargetSchema.strict()]).describe(
  'Parent-frame Cartesian point or previously resolved Node, Coordinate, or Scope target.',
);

/** Scope 固有包络到父坐标系 target 的锚点对齐放置 */
export const ScopePlacementSchema = strictObject({
  target: ScopePlacementTargetSchema.describe('Placement target resolved in the parent coordinate frame.'),
  selfAnchor: ScopeSelfPointSchema.optional().describe(
    'Point on the transformed Scope envelope aligned to target. Omitted fields use center.',
  ),
}).describe('Placement that aligns a transformed intrinsic Scope point to a parent-frame target.');

/** 后代默认通道与继承屏障 */
export const ScopeDefaultsSchema = strictObject({
  node: NodeDefaultSchema.optional().describe(
    'Default style applied to nodes in this scope. Independent from the other default channels.',
  ),
  path: PathDefaultSchema.optional().describe(
    'Default style applied to path-like drawables in this scope. Arrows use the separate `defaults.arrow` channel.',
  ),
  label: LabelDefaultSchema.optional().describe('Default style applied to node labels and step labels in this scope.'),
  arrow: ArrowDefaultSchema.optional().describe('Default style applied to arrows in this scope.'),
  reset: union([boolean(), array(zodEnum(ScopeStyleChannel))])
    .optional()
    .describe(
      'Inheritance barrier for style defaults. Use true for all channels, or list node, path, label, and arrow channels to reset.',
    ),
}).describe('Named descendant defaults and their inheritance barrier.');

export const ScopePropsSchema = strictObject({
  style: CascadingGraphicStyleSchema.optional().describe('Cascading graphic overrides for descendants.'),
  theme: ThemeSchema.optional().describe('Sparse Theme override inherited by this Scope descendants.'),
  id: NonBlankStringSchema.optional().describe(
    'Optional reference id for targeting the scope as a whole. Always registers in the parent namespace.',
  ),
  localNamespace: boolean()
    .optional()
    .describe(
      'When true, child node, coordinate, and nested-scope ids stay local to this scope. The scope id itself still registers in the parent namespace.',
    ),
  transforms: array(TransformSchema)
    .optional()
    .describe(
      'Local transforms applied to all scope children. Array order is application order; translate variants are lowered at compile time.',
    ),
  placement: ScopePlacementSchema.optional().describe(
    'Optional final placement applied after intrinsic layout and local transforms.',
  ),
  zIndex: number()
    .int()
    .optional()
    .describe(
      'Stacking order of this scope among sibling IR children. Applies to the scope group as one unit, not to children inside it.',
    ),
  clip: ClipSchema.optional().describe(
    'Clip region for this scope in scope-local coordinates. Applies to clipped children through the emitted scope group.',
  ),
  boundingShape: zodEnum(ScopeBoundingShape)
    .optional()
    .describe("Synthetic bounding envelope for this scope's id: rectangle or circle."),
  meta: JsonObjectSchema.optional().describe(
    'Opaque JSON metadata carried by this scope. Preserved into emitted Scene primitives and ignored by the compiler.',
  ),
  animations: array(AnimationTrackSchema)
    .optional()
    .describe(
      'Declarative animation tracks for this scope as a group. They do not affect layout and are not propagated to child elements.',
    ),
  defaults: ScopeDefaultsSchema.optional().describe('Named descendant defaults and their inheritance barrier.'),
}).describe('Reusable authored properties for a Scope container.');

export const ScopeSchema = strictObject({
  type: literal('scope').describe('Discriminator marking this child as a scope container.'),
  ...ScopePropsSchema.shape,
  children: array(lazy(() => getRecursiveChildSchema())).describe(
    'Scope children: nested nodes, paths, coordinates, scopes, or composites.',
  ),
}).describe(
  'Scope container: groups child IR elements, applies local transforms, and provides cascading style defaults.',
);
