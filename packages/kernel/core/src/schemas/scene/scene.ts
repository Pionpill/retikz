import { PositiveNumberSchema } from '@retikz/foundation';
import type { ZodType, infer as ZodInfer } from 'zod';
import { lazy, union, discriminatedUnion, strictObject, number, literal, array } from 'zod';

import { CoordinateSchema } from '../node/coordinate';
import type { IRCoordinate } from '../node/coordinate';
import { NodeSchema } from '../node/node';
import type { IRNode } from '../node/node';
import { PathSchema } from '../path/path';
import type { IRPathBase } from '../path/path';
import { ScopeSchema } from '../scope/scope';
import type { IRScope } from '../scope/scope';
import { ThemeSchema } from '../scope/theme';
import { AnimationTrackSchema } from './animation';
import { CompositeNodeSchema } from './composite';
import type { IRComposite } from './composite';
import { registerRecursiveChildSchema } from './recursive';

/** IR 当前主版本号；只在 schema 出现破坏性变更时递增 */
export const CURRENT_IR_VERSION = 1 as const;

/** 递归校验内核图元或组合节点；领域扩展字段由注册定义继续校验 */
export const ChildSchema: ZodType<IRChild> = lazy(() =>
  union([
    discriminatedUnion('type', [NodeSchema, PathSchema, CoordinateSchema, ScopeSchema]).describe(
      'Tier 1 scene child: node, path, coordinate, or scope. Discriminator field is `type`.',
    ),
    CompositeNodeSchema.describe(
      'Tier 2 composite node with `namespace` and `type`. Registered domain schemas validate additional fields at compile time.',
    ),
  ]),
);

registerRecursiveChildSchema(ChildSchema);

/** 校验场景可见矩形的左上角与正数宽高 */
export const ViewBoxSchema = strictObject({
  x: number().describe('Left edge in scene coordinate units; must be finite and may be negative.'),
  y: number().describe('Top edge in scene coordinate units; must be finite and may be negative.'),
  width: PositiveNumberSchema.describe('Width in scene coordinate units; must be finite and greater than zero.'),
  height: PositiveNumberSchema.describe('Height in scene coordinate units; must be finite and greater than zero.'),
}).describe('Visible scene rectangle, specified by its top-left corner, width, and height.');

/** 校验可序列化的绘图根场景及有序子项、主题和可选取景范围 */
export const SceneSchema = strictObject({
  type: literal('scene').describe('Discriminator marking this object as the root scene'),
  version: literal(CURRENT_IR_VERSION).describe(
    `Scene data format version; currently must be ${CURRENT_IR_VERSION}, independent of the package version.`,
  ),
  theme: ThemeSchema.optional().describe('Root theme selection; sets only the name and mode fields to override.'),
  children: array(ChildSchema).describe('Ordered top-level scene children; an empty array is allowed.'),
  viewBox: ViewBoxSchema.optional().describe(
    'Explicit framing; when omitted, bounds are computed from content plus padding.',
  ),
  animations: array(AnimationTrackSchema)
    .optional()
    .describe(
      'Scene-root animation tracks, including viewBox framing animations; omitting this field adds no root tracks.',
    ),
}).describe('JSON-serializable scene data describing one drawing.');

/**
 * 顶层 Scene 的子节点：tier1 node / path / coordinate / scope，或 tier2 composite（有 namespace）
 * @description 手写而非 z.infer 派生，与 ScopeSchema 互递归（scope.children 也是 IRChild[]）
 */
export type IRChild = IRNode | IRPathBase | IRCoordinate | IRScope | IRComposite;

/** 显式视框 IR 类型 `{ x, y, width, height }` */
export type IRViewBox = ZodInfer<typeof ViewBoxSchema>;

/** retikz 顶层绘制 IR，可序列化 JSON 形式的绘制描述 */
export type IRScene = ZodInfer<typeof SceneSchema>;
