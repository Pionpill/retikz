import { NonNegativeNumberSchema } from '@retikz/foundation';
import { union, strictObject, enum as zodEnum, number, boolean } from 'zod';
import type { input as ZodInput } from 'zod';

import { ContextualColorSchema, OpacitySchema } from '../style/graphic';
import { FontSchema } from './font';
import { TextBlockSchema, TextAlignSchema } from './text';

/** 允许调用方替换的标签字段说明 */
type LabelVisualStyleDescriptionOverrides = Partial<Record<'textColor' | 'opacity' | 'font', string>>;

/** 创建标签共用的视觉字段校验器，并允许调用方覆盖字段的英文契约描述 */
export const createLabelVisualStyleShape = (descriptions: LabelVisualStyleDescriptionOverrides = {}) => ({
  textColor: ContextualColorSchema.optional().describe(
    descriptions.textColor ?? 'Label text color override. Missing values inherit from host defaults.',
  ),
  opacity: OpacitySchema.optional().describe(
    descriptions.opacity ?? 'Label-only opacity. Host opacity may still multiply it at emit time.',
  ),
  font: FontSchema.optional().describe(
    descriptions.font ?? 'Label font overrides. Missing fields inherit from host defaults.',
  ),
});

/** 校验节点标签与几何标签共用的颜色、透明度及字体覆盖 */
export const LabelVisualStyleSchema = strictObject(createLabelVisualStyleShape()).describe(
  'Shared visual style fields for node labels and geometry labels.',
);

/** 宿主已提供边界锚点时的共享标签配置 */
export const BoundaryLabelSchema = strictObject({
  ...createLabelVisualStyleShape(),
  text: TextBlockSchema,
  align: TextAlignSchema.default('middle').describe('Alignment along the attachment tangent.'),
  placement: zodEnum(['outside', 'inside']).default('outside').describe('Side of the boundary support line.'),
  distance: NonNegativeNumberSchema.default(4).describe('Gap from the support line to the rotated label box.'),
  rotate: union([zodEnum(['none', 'radial', 'tangent']), number().describe('Angle in degrees.')])
    .default('none')
    .describe('Text rotation: none, outward radial, radial plus 90 degrees, or an explicit angle.'),
  keepUpright: boolean().default(false).describe('Flip upside-down text in host-local coordinates.'),
}).describe('Shared label attached to a host-provided boundary frame.');

export type IRBoundaryLabel = ZodInput<typeof BoundaryLabelSchema>;
