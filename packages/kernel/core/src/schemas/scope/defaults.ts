import type { ValueOf } from '@retikz/foundation';
import { strictObject, union, boolean, array, enum as zodEnum } from 'zod';
import type { infer as ZodInfer } from 'zod';

import { NodeLabelConfigSchema } from '../node/label';
import { NodeSchema } from '../node/node';
import { ArrowDetailSchema } from '../path/arrow';
import { PathLabelSchema } from '../path/label';
import { PathSchema, PathGeometrySchema, PathTransformSchema } from '../path/path';
import { CssColorSchema, CascadingGraphicStyleSchema } from '../style/graphic';

const ScopeStyleChannel = {
  /** node 默认样式通道 */
  Node: 'node',
  /** path 默认样式通道 */
  Path: 'path',
} as const;

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

/** 节点主体、布局与已有标签的默认配置 */
export type IRNodeDefault = ZodInfer<typeof NodeDefaultSchema>;

/** 路径主体、几何及已有标签和箭头的默认配置 */
export type IRPathDefault = ZodInfer<typeof PathDefaultSchema>;

/** 节点已有标签的默认配置 */
export type IRNodeLabelDefault = ZodInfer<typeof NodeLabelDefaultSchema>;

/** 路径与步骤已有标签的默认配置 */
export type IRPathLabelDefault = ZodInfer<typeof PathLabelDefaultSchema>;

/** 样式继承通道标识，defaults.reset 按通道切断外层继承 */
export type StyleChannel = ValueOf<typeof ScopeStyleChannel>;

export type IRScopeDefaults = ZodInfer<typeof ScopeDefaultsSchema>;
