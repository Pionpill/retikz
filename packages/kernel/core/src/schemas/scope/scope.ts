import type { ValueOf } from '@retikz/foundation';
import { NonBlankStringSchema, JsonObjectSchema } from '@retikz/foundation';
import { union, strictObject, literal, boolean, array, number, enum as zodEnum, lazy } from 'zod';
import type { input as ZodInput, infer as ZodInfer } from 'zod';

import type { IRCoordinate } from '../node/coordinate';
import type { IRNode } from '../node/node';
import type { IRPathBase } from '../path/path';
import { PositionSchema } from '../position/position';
import { NodeTargetSchema } from '../position/target';
import { TransformSchema } from '../position/transform';
import { AnimationTrackSchema } from '../scene/animation';
import type { IRComposite } from '../scene/composite';
import { getRecursiveChildSchema } from '../scene/recursive';
import { ClipSchema } from './clip';
import { ScopeDefaultsSchema } from './defaults';
import { ScopeSelfPointSchema } from './self-point';
import { ThemeSchema } from './theme';

/**
 * scope.id synthetic 包络形状（受控枚举）
 * @description 'rectangle'（轴对齐外接矩形 AABB，默认）/ 'circle'（最小外接圆 Welzl）。
 *   与 Node `shape` / `boundary` 的开放 shape 系统不同：把任意子树点集包进某形状需要逐形状的
 *   "最小外接 X" 算法，无法走 ShapeRegistry 借用任意已注册 shape，故为闭集枚举而非开放 shape 引用
 */
export const ScopeBoundingShape = {
  /** 轴对齐外接矩形（默认） */
  Rectangle: 'rectangle',
  /** 最小外接圆 */
  Circle: 'circle',
} as const;

/** scope 包络形状名联合（'rectangle' | 'circle'） */
export type ScopeBoundingShape = ValueOf<typeof ScopeBoundingShape>;

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

/** 校验容器变换、样式继承、命名空间与最终放置等作用域属性 */
export const ScopePropsSchema = strictObject({
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

/** Scope 锚点定位允许的闭合目标 */
export type IRScopePositionTarget = ZodInput<typeof ScopePositionTargetSchema>;

/** Scope 最终锚点对齐放置 */
export type IRScopeAnchorPosition = ZodInput<typeof ScopeAnchorPositionSchema>;

/** Scope 原点位置或最终锚点对齐 */
export type IRScopePosition = ZodInput<typeof ScopePositionSchema>;

/** Scope 除 `type` 与递归 `children` 外的完整 authored 属性集合 */
export type IRScopeProps = Omit<ZodInfer<typeof ScopePropsSchema>, 'position'> & {
  /** 父坐标系原点位置或最终锚点对齐，省略时为原点 */
  position?: IRScopePosition;
};

/** 分组容器及其递归子项，支持局部变换和样式继承 */
export type IRScope = IRScopeProps & {
  /** 固定为 scope 的容器判别字段 */
  type: 'scope';
  /** 按声明顺序处理的节点、路径、坐标点、作用域或复合组件 */
  children: Array<IRNode | IRPathBase | IRCoordinate | IRScope | IRComposite>;
};
