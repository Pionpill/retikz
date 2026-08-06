import { z } from 'zod';

import type { CompileOccurrenceLocator } from '../occurrence';
import type { Scene, ScenePrimitive, SceneResource } from '../scene';
import type { InspectionOwner } from './types';

/** 单个 occurrence 的静态辅助 Scene */
export type InspectionPlaneEntry = Readonly<{
  /** 提供辅助内容的 Definition owner */
  owner: InspectionOwner;
  /** settled subject 对应的最终 compile occurrence */
  occurrence: CompileOccurrenceLocator;
  /** 最终 occurrence 稳定排序后的循环色域序号 */
  colorScope: number;
  /** occurrence 局部坐标到主 Scene 坐标的仿射矩阵 */
  transform: readonly [number, number, number, number, number, number];
  /** 已移除公共身份与动画的 occurrence-local 静态 Scene */
  scene: Scene;
}>;

/** 与主 Scene 同 revision 原子提交的辅助平面 */
export type InspectionPlane = Readonly<{
  /** 按最终 occurrence 顺序排列的辅助 Scene */
  entries: ReadonlyArray<InspectionPlaneEntry>;
}>;

/** Compile occurrence expansion path 的段类型 */
const CompileExpansionSegmentKind = {
  Expand: 'expand',
  Output: 'output',
  Probe: 'probe',
  Replay: 'replay',
  ScopeChild: 'scopeChild',
} as const;

const finite = z.number();

const CompileExpansionSegmentSchema = z
  .strictObject({
    kind: z.enum(CompileExpansionSegmentKind).describe('Expansion path segment discriminator.'),
    index: z.number().int().nonnegative().safe().describe('Zero-based index within the selected expansion branch.'),
  })
  .describe('One segment of a compile occurrence expansion path.');

const CompileOccurrenceLocatorSchema = z
  .strictObject({
    sourcePath: z.string().min(1).describe('Stable authored source path for the owner occurrence.'),
    expansionPath: z.array(CompileExpansionSegmentSchema).describe('Compile-local expansion path for the occurrence.'),
  })
  .describe('Occurrence identity shared with artifacts and diagnostics.');

/** Inspector owner schema */
export const InspectionOwnerSchema: z.ZodType<InspectionOwner> = z
  .discriminatedUnion('kind', [
    z.strictObject({
      kind: z.literal('composite').describe('Composite owner discriminator.'),
      namespace: z.string().min(1).describe('Composite provider namespace.'),
      type: z.string().min(1).describe('Composite provider type.'),
    }),
    z.strictObject({
      kind: z.literal('pathKind').describe('Path kind owner discriminator.'),
      name: z.string().min(1).describe('Path kind provider name.'),
    }),
  ])
  .describe('Definition owner that provided an Inspector.');

/** 校验静态辅助图元不携带公共身份、元数据或动画，并递归覆盖 group 后代 */
const isStaticScenePrimitive = (value: unknown): value is ScenePrimitive => {
  if (value === null || typeof value !== 'object') return false;
  if (['id', 'meta', 'animations'].some(key => Object.hasOwn(value, key))) return false;
  const type = Object.getOwnPropertyDescriptor(value, 'type');
  if (type === undefined || !('value' in type) || typeof type.value !== 'string') return false;
  if (type.value !== 'group') return true;
  const children = Object.getOwnPropertyDescriptor(value, 'children');
  return (
    children !== undefined &&
    'value' in children &&
    Array.isArray(children.value) &&
    children.value.every(isStaticScenePrimitive)
  );
};

const ScenePrimitiveSchema = z.custom<ScenePrimitive>(
  isStaticScenePrimitive,
  'Expected a static compiled Scene primitive without public identity, metadata, or animation.',
);

const SceneResourceSchema = z.custom<SceneResource>(
  value =>
    value !== null &&
    typeof value === 'object' &&
    (Reflect.get(value, 'kind') === 'paint' || Reflect.get(value, 'kind') === 'clip'),
  'Expected a compiled Scene resource.',
);

const StaticInspectionSceneSchema: z.ZodType<Scene> = z
  .strictObject({
    primitives: z.array(ScenePrimitiveSchema).describe('Compiled static Scene primitives.'),
    layout: z
      .strictObject({
        x: finite.describe('Scene layout x coordinate.'),
        y: finite.describe('Scene layout y coordinate.'),
        width: finite.nonnegative().describe('Non-negative Scene layout width.'),
        height: finite.nonnegative().describe('Non-negative Scene layout height.'),
      })
      .describe('Occurrence-local auxiliary Scene layout.'),
    resources: z.array(SceneResourceSchema).optional().describe('Entry-local compiled Scene resources.'),
  })
  .describe('Static auxiliary Scene with public animation state removed.');

/** 单个 occurrence 的 inspection plane entry schema */
export const InspectionPlaneEntrySchema: z.ZodType<InspectionPlaneEntry> = z
  .strictObject({
    owner: InspectionOwnerSchema.describe('Definition owner that produced this entry.'),
    occurrence: CompileOccurrenceLocatorSchema.describe('Settled owner occurrence.'),
    colorScope: z.number().int().nonnegative().safe().describe('Stable cyclic palette scope.'),
    transform: z
      .tuple([finite, finite, finite, finite, finite, finite])
      .describe('Affine matrix from occurrence-local coordinates to primary Scene coordinates.'),
    scene: StaticInspectionSceneSchema.describe('Compiled occurrence-local static auxiliary Scene.'),
  })
  .describe('One owner-scoped auxiliary Scene in the inspection plane.');

/** 独立 inspection plane schema */
export const InspectionPlaneSchema: z.ZodType<InspectionPlane> = z
  .strictObject({
    entries: z.array(InspectionPlaneEntrySchema).describe('Deterministically ordered auxiliary Scene entries.'),
  })
  .describe('Complete inspection plane committed beside the primary Scene.');
