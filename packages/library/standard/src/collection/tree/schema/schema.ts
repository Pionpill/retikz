import { CompositeBaseSchema, FoldStepSchema, NodeSchema, PathSchema, ScopePropsSchema } from '@retikz/core';
import { NonNegativeNumberSchema } from '@retikz/foundation';
import { array, literal, never, strictObject, string, union, enum as zodEnum } from 'zod';
import type { ZodType } from 'zod';

import type { IRTreeItem } from './types';

/** 树节点复用 Core 的形状、外观与文字布局 */
export const TreeNodeSchema = strictObject({
  shape: NodeSchema.shape.shape.describe('Node shape; defaults to circle after merging overrides.'),
  style: NodeSchema.shape.style,
  layout: NodeSchema.shape.layout,
});

/** 节点静态默认真源，合并稀疏作者配置后应用 */
export const TreeNodeDefaultsSchema = TreeNodeSchema.extend({
  shape: NodeSchema.shape.shape.unwrap().default('circle'),
  style: NodeSchema.shape.style.unwrap().extend({
    stroke: NodeSchema.shape.style.unwrap().shape.stroke.default('currentColor'),
    strokeWidth: NodeSchema.shape.style.unwrap().shape.strokeWidth.default(1),
    fill: NodeSchema.shape.style.unwrap().shape.fill.default('none'),
  }),
  layout: NodeSchema.shape.layout.unwrap().extend({
    minimumSize: NodeSchema.shape.layout.unwrap().shape.minimumSize.unwrap().default(32),
    padding: NodeSchema.shape.layout.unwrap().shape.padding.unwrap().default(2),
    margin: NodeSchema.shape.layout.unwrap().shape.margin.unwrap().default(0),
  }),
});

/** 父子连接复用 Core 路径外观，结构由 Tree 决定 */
const TreePathSchema = PathSchema.omit({ type: true, id: true, children: true, kind: true, kindOptions: true });

/** 稀疏连接覆盖，默认直线，分数仅用于三段折线 */
export const TreeConnectionSchema = union([
  strictObject({
    route: zodEnum(['straight', '-|', '|-']).optional(),
    fraction: never().optional(),
    path: TreePathSchema.optional(),
  }),
  strictObject({
    route: FoldStepSchema.options[1].shape.via,
    fraction: FoldStepSchema.options[1].shape.fraction,
    path: TreePathSchema.optional(),
  }),
]);

/** 路径静态默认在稀疏覆盖合并后物化 */
const TreePathDefaultsSchema = TreePathSchema.extend({
  style: PathSchema.shape.style.unwrap().extend({
    stroke: PathSchema.shape.style.unwrap().shape.stroke.default('currentColor'),
    strokeWidth: PathSchema.shape.style.unwrap().shape.strokeWidth.default(1),
    fill: PathSchema.shape.style.unwrap().shape.fill.default('none'),
  }),
  marks: PathSchema.shape.marks.unwrap().default([]),
});
/** 连接静态默认真源，不用于提前物化逐项覆盖 */
export const TreeConnectionDefaultsSchema = union([
  TreeConnectionSchema.options[0].extend({
    route: TreeConnectionSchema.options[0].shape.route.unwrap().default('straight'),
    path: TreePathDefaultsSchema,
  }),
  TreeConnectionSchema.options[1].extend({ path: TreePathDefaultsSchema }),
]);

/** 树的物理方向与边界净间距 */
export const TreeLayoutSchema = strictObject({
  direction: zodEnum(['down', 'up', 'right', 'left']).default('down').describe('Direction from root to descendants.'),
  levelGap: NonNegativeNumberSchema.default(32).describe('Clearance between adjacent levels.'),
  siblingGap: NonNegativeNumberSchema.default(24).describe('Clearance between sibling subtree envelopes.'),
});

/** 显式节点的非递归字段真源 */
export const TreeItemFieldsSchema = strictObject({
  id: NodeSchema.shape.id,
  content: string().optional().describe('Literal node text; omitted means an empty visible node.'),
  node: TreeNodeSchema.optional().describe('Sparse node shape, style, and layout overrides.'),
  connection: union([literal(false), TreeConnectionSchema])
    .optional()
    .describe('Parent-child connection overrides; false hides the connection.'),
});

/** 显式节点或文字叶节点 */
export const TreeItemSchema: ZodType<IRTreeItem, IRTreeItem> = union([
  string(),
  TreeItemFieldsSchema.extend({
    get children() {
      return array(TreeItemSchema.nullable()).optional();
    },
  }),
]);

/** 以根节点描述的静态有序树 */
export const TreeSchema = CompositeBaseSchema.extend({
  namespace: literal('standard').describe('Standard composite namespace.'),
  type: literal('tree').describe('Tree composite discriminator.'),
  ...ScopePropsSchema.shape,
  node: TreeNodeSchema.optional().describe('Sparse node shape, style, and layout overrides.'),
  connection: union([literal(false), TreeConnectionSchema])
    .optional()
    .describe('Parent-child connection overrides; false hides the connection.'),
  layout: TreeLayoutSchema.optional().describe('Growth direction and clearances between levels and subtree envelopes.'),
  label: NodeSchema.shape.label,
  root: TreeItemSchema.nullable().describe('Text leaf, configured recursive node, or null for an empty tree.'),
}).superRefine((source, context) => {
  const ids = new Set<string>();
  const visit = (item: IRTreeItem | null, path: Array<string | number>) => {
    if (item === null || typeof item === 'string') return;
    if (path.length === 1 && item.connection !== undefined)
      context.addIssue({
        code: 'custom',
        path: [...path, 'connection'],
        message: 'Root node has no incoming connection.',
      });
    if (item.id !== undefined) {
      if (ids.has(item.id))
        context.addIssue({ code: 'custom', path: [...path, 'id'], message: 'Duplicate tree node id.' });
      ids.add(item.id);
    }
    item.children?.forEach((child, index) => visit(child, [...path, 'children', index]));
  };
  visit(source.root, ['root']);
});
