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

export const EncodingSchema = z
  .object({
    x: ChannelSchema.optional().describe('x position channel'),
    y: ChannelSchema.optional().describe('y position channel'),
    angle: ChannelSchema.optional().describe('Explicit angle position channel (polar coordinate systems); falls back to the x channel when omitted'),
    radius: ChannelSchema.optional().describe('Explicit radius position channel (polar coordinate systems); falls back to the y channel when omitted'),
    color: ChannelSchema.optional().describe(
      'Color channel (non-positional): maps a field through an ordinal / color scale to the mark fill / stroke',
    ),
  })
  .describe('Channel bindings for a mark; positional x / y consumed by the coordinate system, non-positional color fed to mark paint');

/** 通道绑定：field（数据驱动）/ value（常量）二选一 */
export type Channel = z.infer<typeof ChannelSchema>;
/** mark 的通道绑定（位置通道 x / y，无 scale 引用） */
export type Encoding = z.infer<typeof EncodingSchema>;
