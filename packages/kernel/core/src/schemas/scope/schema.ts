import { JsonObjectSchema, NonBlankStringSchema } from '@retikz/foundation';
import { array, boolean, enum as zodEnum, lazy, literal, number, strictObject, union } from 'zod';

import { AnimationTrackSchema } from '../animation';
import { ClipSchema } from '../clip';
import { NodeSchema, NodeLabelConfigSchema } from '../node';
import { ArrowDetailSchema, PathLabelSchema, PathSchema, PathGeometrySchema, PathTransformSchema } from '../path';
import { NodeTargetSchema, PositionSchema } from '../position';
import { getRecursiveChildSchema } from '../recursive';
import { ScopeSelfPointSchema } from '../scope-point';
import { CascadingGraphicStyleSchema, CssColorSchema, GraphicStyleSchema } from '../style';
import { ThemeSchema } from '../theme';
import { TransformSchema } from '../transform';
import { ScopeBoundingShape, ScopeStyleChannel } from './constants';

/** 节点已有标签的稀疏配置；主色供标签颜色派生 */
export const NodeLabelDefaultSchema = NodeLabelConfigSchema.safeExtend({
  color: CssColorSchema.optional().describe('Master color for node labels; textColor falls back to it.'),
}).strict();

/** 路径与步骤已有标签的稀疏配置 */
export const PathLabelDefaultSchema = PathLabelSchema.omit({ text: true }).extend({
  color: CssColorSchema.optional().describe('Master color for path and step labels; textColor falls back to it.'),
});

/** 节点主体、布局与已有标签的默认配置 */
export const NodeDefaultSchema = strictObject(NodeSchema.shape)
  .pick({
    shape: true,
    boundary: true,
    cornerRadius: true,
    rotate: true,
    scale: true,
    style: true,
    layout: true,
  })
  .extend({
    label: NodeLabelDefaultSchema.optional().describe('Defaults for existing node labels; does not create labels.'),
  });

/** 路径主体、几何及已有标签和箭头的默认配置 */
export const PathDefaultSchema = strictObject({
  style: PathSchema.shape.style,
  cornerRadius: PathGeometrySchema.shape.cornerRadius,
  ...PathTransformSchema.shape,
  label: PathLabelDefaultSchema.optional().describe('Defaults for existing path and step labels.'),
  arrow: ArrowDetailSchema.optional().describe('Defaults for existing arrow marks; does not create marks.'),
});

/** Scope 锚点对齐的父坐标系目标 */
export const ScopePositionTargetSchema = union([PositionSchema, strictObject(NodeTargetSchema.shape)]).describe(
  'Parent-frame Cartesian point or previously resolved Node, Coordinate, or Scope target.',
);

/** 将变换后的 Scope 自身锚点对齐到目标 */
export const ScopeAnchorPositionSchema = strictObject({
  kind: literal('anchor').describe('Anchor alignment position discriminator.'),
  target: ScopePositionTargetSchema.describe('Alignment target resolved in the parent coordinate frame.'),
  selfAnchor: ScopeSelfPointSchema.optional().describe(
    'Point on the transformed Scope envelope aligned to target. Omitted fields use center.',
  ),
}).describe('Placement that aligns a transformed intrinsic Scope point to a parent-frame target.');

/** Scope 原点位置或最终锚点对齐 */
export const ScopePositionSchema = union([PositionSchema, ScopeAnchorPositionSchema]).describe(
  'Parent-frame origin position applied outside local transforms, or final transformed-envelope anchor alignment.',
);

/** 后代默认通道与继承屏障 */
export const ScopeDefaultsSchema = strictObject({
  style: CascadingGraphicStyleSchema.optional().describe('Shared graphic defaults inherited by descendants.'),
  node: NodeDefaultSchema.optional().describe(
    'Default style applied to nodes in this scope. Independent from the other default channels.',
  ),
  path: PathDefaultSchema.optional().describe(
    'Default style applied to path-like drawables in this scope. Includes label and arrow defaults.',
  ),
  reset: union([boolean(), array(zodEnum(ScopeStyleChannel))])
    .optional()
    .describe(
      'Inheritance barrier for style defaults. Use true for all channels, or list node and path host channels to reset, including their decorations.',
    ),
}).describe('Named descendant defaults and their inheritance barrier.');

/** 外框独立外观的静态默认值 */
export const ScopeFrameStyleSchema = GraphicStyleSchema.extend({
  fill: GraphicStyleSchema.shape.fill.default('none'),
  stroke: GraphicStyleSchema.shape.stroke.default('currentColor'),
  strokeWidth: GraphicStyleSchema.shape.strokeWidth.default(1),
  opacity: GraphicStyleSchema.shape.opacity.default(1),
}).describe('Isolated frame style defaults.');

/** Scope 固有内容包络的独立绘制装饰 */
export const ScopeFrameSchema = strictObject({
  padding: number()
    .nonnegative()
    .default(0)
    .describe('Uniform decoration spacing outside the intrinsic envelope; does not allocate layout space.'),
  style: ScopeFrameStyleSchema.prefault({}).describe(
    'Isolated frame appearance; only the effective scope color context is shared.',
  ),
}).describe('Non-interactive decoration derived from the intrinsic scope envelope.');

/** 校验容器变换、样式继承、命名空间与最终放置等作用域属性 */
export const ScopePropsSchema = strictObject({
  frame: ScopeFrameSchema.optional().describe(
    'Optional intrinsic-envelope decoration drawn beneath all scope children.',
  ),
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
      'Local transforms applied to all scope children. The last array item acts on local points first; translate variants are lowered at compile time.',
    ),
  position: ScopePositionSchema.default([0, 0]).describe(
    'Parent-frame origin position, or final anchor alignment after local transforms. Defaults to [0, 0].',
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

/** 递归校验分组容器及其子项，保留局部变换与级联样式描述 */
export const ScopeSchema = strictObject({
  type: literal('scope').describe('Discriminator marking this child as a scope container.'),
  ...ScopePropsSchema.shape,
  children: array(lazy(() => getRecursiveChildSchema())).describe(
    'Scope children: nested nodes, paths, coordinates, scopes, or composites.',
  ),
}).describe(
  'Scope container: groups child IR elements, applies local transforms, and provides cascading style defaults.',
);
