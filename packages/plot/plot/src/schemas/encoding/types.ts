import type { z } from 'zod';
import type { ChannelSchema, EncodingSchema, MarkLabelSchema, OpacityChannelSchema, PointEncodingSchema, PositionEncodingSchema, ShapeChannelSchema, SizeChannelSchema, StyleEncodingSchema, TextChannelSchema } from './schema';

/** Channel binding: exactly one of field (data-driven) or value (constant). */
export type Channel = z.infer<typeof ChannelSchema>;
/** Positional channel bindings; built-ins use x / y / z, custom coordinates may add role keys. */
export type PositionEncoding = z.infer<typeof PositionEncodingSchema>;
/** Style channel bindings for non-position visual channels. */
export type StyleEncoding = z.infer<typeof StyleEncodingSchema>;
/** Mark channel bindings: positional channels plus shared style channels. */
export type Encoding = z.infer<typeof EncodingSchema>;
/** Legacy size channel helper schema type. PointMark canonical size is top-level MarkValueType. */
export type SizeChannel = z.infer<typeof SizeChannelSchema>;
/** Legacy opacity channel helper schema type. PointMark canonical opacity is top-level MarkValueType. */
export type OpacityChannel = z.infer<typeof OpacityChannelSchema>;
/** Legacy shape channel helper schema type. PointMark canonical shape is top-level MarkValueType. */
export type ShapeChannel = z.infer<typeof ShapeChannelSchema>;
/** PointMark encoding: positional channels plus optional text only. */
export type PointEncoding = z.infer<typeof PointEncodingSchema>;
/** Text content channel binding. */
export type TextChannel = z.infer<typeof TextChannelSchema>;
/** Host datum label config aligned with core NodeLabelSchema position / distance / pin. */
export type MarkLabel = z.infer<typeof MarkLabelSchema>;
