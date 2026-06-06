import { z } from 'zod';
import { ScalarValueSchema } from './data';

export const ChannelSchema = z
  .object({
    field: z
      .string()
      .min(1)
      .optional()
      .describe(
        'Path accessor into a data row bound to this channel (e.g. "month" or "user.age"); resolved against the externally-supplied dataset at lowering and must yield a scalar',
      ),
    value: ScalarValueSchema.optional().describe('Constant scalar literal for this channel (mutually exclusive with field)'),
    scale: z
      .string()
      .min(1)
      .optional()
      .describe(
        'Scale name driving this channel (required for non-positional channels like color; positional x / y derive their scale from the coordinate system and omit this)',
      ),
  })
  .refine(c => (c.field === undefined) !== (c.value === undefined), {
    message: 'channel must set exactly one of `field` or `value`',
  })
  .describe('A channel binding: exactly one of field (data-driven) / value (constant), plus an optional scale reference');

export const PositionEncodingSchema = z
  .object({
    x: ChannelSchema.describe(
      'Primary position channel (required); the coordinate system maps it to its first role — cartesian2D horizontal, polar2D angle. Its scale comes from the coordinate system',
    ),
    y: ChannelSchema.describe(
      'Secondary position channel (required); the coordinate system maps it to its second role — cartesian2D vertical, polar2D radius. Its scale comes from the coordinate system',
    ),
  })
  .describe(
    'Positional channel bindings (x / y, both required); the coordinate system maps them to its roles — cartesian2D x→horizontal / y→vertical, polar2D x→angle / y→radius',
  );

export const StyleEncodingSchema = z
  .object({
    color: ChannelSchema.optional().describe(
      'Color channel (non-positional): maps a field through an ordinal / color scale to the mark fill / stroke',
    ),
  })
  .describe('Non-positional style channel bindings fed to mark visuals (color today; opacity / size / shape later)');

export const EncodingSchema = PositionEncodingSchema.merge(StyleEncodingSchema).describe(
  'Channel bindings for a mark: positional channels (consumed by the coordinate system) composed with non-positional style channels (fed to mark visuals)',
);

/** 通道绑定：field（数据驱动）/ value（常量）二选一 */
export type Channel = z.infer<typeof ChannelSchema>;
/** 位置通道绑定（x / y / angle / radius；按坐标系角色解析） */
export type PositionEncoding = z.infer<typeof PositionEncodingSchema>;
/** 样式通道绑定（非位置视觉属性；当前仅 color） */
export type StyleEncoding = z.infer<typeof StyleEncodingSchema>;
/** mark 的通道绑定（位置 + 样式复合） */
export type Encoding = z.infer<typeof EncodingSchema>;
