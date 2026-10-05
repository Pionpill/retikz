import { CompositeBaseSchema, NodeSchema, ScopePropsSchema, PathSchema } from '@retikz/core';
import { JsonValueSchema, NonNegativeIntegerSchema, PositiveNumberSchema } from '@retikz/foundation';
import type { ZodArray, ZodObject, ZodUnion, ZodString, input } from 'zod';
import { strictObject, enum as zodEnum, union, literal, string, array, never } from 'zod';

import { DataExpandSchema } from '../../_cell/data';
import { CellSchema, CellStyleSchema, CellLayoutSchema } from '../../_cell/schema';

/** 自动连接的非结构性路径属性 */
export const ChainPathSchema = PathSchema.omit({ type: true, id: true, children: true, kind: true, kindOptions: true });
/** 自动连接的路径与呈现覆盖 */
export const ChainConnectionSchema = strictObject({
  route: zodEnum(['auto', 'straight', '|-', '-|'])
    .default('auto')
    .describe('Connection routing; auto reserves branch corridors.'),
  path: ChainPathSchema.optional(),
});
/** 并行块的结构排布 */
export const ChainParallelLayoutSchema = strictObject({
  gap: PositiveNumberSchema.default(24).describe('Main-axis clearance between items.'),
  branchGap: PositiveNumberSchema.default(24).describe('Cross-axis clearance between branches.'),
  branchAlign: union([zodEnum(['start', 'center', 'end']), strictObject({ branch: NonNegativeIntegerSchema })])
    .default('center')
    .describe('Branch envelope alignment or main branch index.'),
  spacing: zodEnum(['compact', 'steps'])
    .default('steps')
    .describe('Independent compact sequences or shared immediate-step tracks.'),
  justify: zodEnum(['start', 'center', 'end']).default('start').describe('Short branch position in the shared span.'),
});
/** 根布局包含单元格默认与链方向 */
export const ChainLayoutSchema = CellLayoutSchema.extend({
  ...ChainParallelLayoutSchema.shape,
  direction: zodEnum(['right', 'down']).default('right').describe('Main chain direction.'),
});
/** 有内容或空内容的链单元 */
export const ChainCellSchema = CellSchema.extend({ kind: literal('cell') });
/** 递归有序分支，每个分支是显式序列 */
export const ChainParallelSchema = strictObject({
  kind: literal('parallel'),
  get branches(): ZodArray<
    ZodObject<{
      items: ZodArray<ZodUnion<readonly [ZodString, typeof ChainCellSchema, typeof ChainParallelSchema]>>;
    }>
  > {
    return array(strictObject({ items: array(union([string(), ChainCellSchema, ChainParallelSchema])).min(1) })).min(2);
  },
  layout: strictObject({
    gap: ChainParallelLayoutSchema.shape.gap.unwrap().optional(),
    branchGap: ChainParallelLayoutSchema.shape.branchGap.unwrap().optional(),
    branchAlign: ChainParallelLayoutSchema.shape.branchAlign.unwrap().optional(),
    spacing: ChainParallelLayoutSchema.shape.spacing.unwrap().optional(),
    justify: ChainParallelLayoutSchema.shape.justify.unwrap().optional(),
  }).optional(),
  connection: strictObject({
    route: ChainConnectionSchema.shape.route.unwrap().optional(),
    path: ChainPathSchema.optional(),
  }).optional(),
});
/** 完整序列中的文字、单元或并行块 */
export const ChainItemSchema = union([string(), ChainCellSchema, ChainParallelSchema]);
/** 只携带符号的递归并行骨架 */
export const ChainSkeletonBranchSchema = strictObject({
  get branches(): ZodArray<ZodArray<ZodUnion<readonly [ZodString, typeof ChainSkeletonBranchSchema]>>> {
    return array(array(union([string(), ChainSkeletonBranchSchema])).min(1)).min(2);
  },
});
/** 线性计数、线性符号和递归骨架互斥 */
export const ChainSkeletonSchema = union([
  strictObject({ count: NonNegativeIntegerSchema, labels: never().optional(), items: never().optional() }),
  strictObject({ labels: array(string()), count: never().optional(), items: never().optional() }),
  strictObject({
    items: array(union([string(), ChainSkeletonBranchSchema])),
    count: never().optional(),
    labels: never().optional(),
  }),
]);
const ChainBaseSchema = CompositeBaseSchema.extend({
  namespace: literal('standard'),
  type: literal('chain'),
  ...ScopePropsSchema.omit({ style: true }).shape,
  style: CellStyleSchema.optional(),
  layout: ChainLayoutSchema.optional(),
  connection: ChainConnectionSchema.optional(),
  label: NodeSchema.shape.label,
});
/** 三入口与递归结构的 Source 真源 */
export const ChainSchema = union([
  ChainBaseSchema.extend({
    items: array(ChainItemSchema),
    data: never().optional(),
    skeleton: never().optional(),
    dataExpand: never().optional(),
  }),
  ChainBaseSchema.extend({
    data: array(JsonValueSchema),
    items: never().optional(),
    skeleton: never().optional(),
    dataExpand: DataExpandSchema.optional(),
  }),
  ChainBaseSchema.extend({
    skeleton: ChainSkeletonSchema,
    items: never().optional(),
    data: never().optional(),
    dataExpand: never().optional(),
  }),
]).superRefine((value, ctx) => {
  const fail = (path: Array<string | number>, message: string) => ctx.addIssue({ code: 'custom', path, message });
  const visit = (
    items: Array<input<typeof ChainItemSchema>>,
    path: Array<string | number>,
    align: input<typeof ChainParallelLayoutSchema>['branchAlign'],
    skeletonMode = false,
  ) => {
    items.forEach((item, i) => {
      if (typeof item === 'string' || item.kind === 'cell') return;
      const isCell = (index: number) => {
        const v = items.at(index < 0 ? items.length : index);
        return v !== undefined && (typeof v === 'string' || v.kind === 'cell');
      };
      if (!isCell(i - 1) || !isCell(i + 1))
        fail([...path, i], 'Parallel blocks require adjacent cells before and after.');
      const selected = item.layout?.branchAlign ?? align;
      if (typeof selected === 'object' && selected.branch >= item.branches.length)
        fail([...path, i, 'layout', 'branchAlign'], 'Main branch index is out of range.');
      item.branches.forEach((branch, j) =>
        visit(branch.items, [...path, i, 'branches', j, ...(skeletonMode ? [] : ['items'])], selected, skeletonMode),
      );
    });
  };
  if (value.items) visit(value.items, ['items'], value.layout?.branchAlign);
  const skeleton = value.skeleton;
  if (skeleton?.items) {
    const convert = (
      items: Array<input<typeof ChainSkeletonBranchSchema> | string>,
    ): Array<input<typeof ChainItemSchema>> =>
      items.map(item =>
        typeof item === 'string'
          ? item
          : { kind: 'parallel', branches: item.branches.map(branchItems => ({ items: convert(branchItems) })) },
      );
    visit(convert(skeleton.items), ['skeleton', 'items'], value.layout?.branchAlign, true);
  }
});
