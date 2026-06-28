import type { z } from 'zod';
import type {
  ChannelSchema,
  EncodingSchema,
  MarkChannelEncodingSchema,
  MarkGeometryLabelListSchema,
  MarkGeometryLabelSchema,
  MarkLabelContentSchema,
  MarkLabelSchema,
  MarkNodeLabelListSchema,
  MarkNodeLabelSchema,
  OpacityChannelSchema,
  PointEncodingSchema,
  PositionEncodingSchema,
  ShapeChannelSchema,
  SizeChannelSchema,
  TextChannelSchema,
} from './schema';

/** Channel binding: exactly one of field (data-driven) or value (constant). */
export type Channel = z.infer<typeof ChannelSchema>;
/** Positional channel bindings; built-ins use x / y / z, custom coordinates may add role keys. */
export type PositionEncoding = z.infer<typeof PositionEncodingSchema>;
/** Mark channel bindings for non-position channels. */
export type MarkChannelEncoding = z.infer<typeof MarkChannelEncodingSchema>;
/** Mark channel bindings: positional channels plus shared mark channels. */
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
/** Mark label content binding. */
export type MarkLabelContent = z.infer<typeof MarkLabelContentSchema>;
/** Host datum label config aligned with core NodeLabelSchema. */
export type MarkNodeLabel = z.infer<typeof MarkNodeLabelSchema>;
/** Host geometry label config aligned with core GeometryLabelSchema. */
export type MarkGeometryLabel = z.infer<typeof MarkGeometryLabelSchema>;
/** Single or array node label input. */
export type MarkNodeLabelList = z.infer<typeof MarkNodeLabelListSchema>;
/** Single or array geometry label input. */
export type MarkGeometryLabelList = z.infer<typeof MarkGeometryLabelListSchema>;
/** Host-inferred mark label config. */
export type MarkLabel = z.infer<typeof MarkLabelSchema>;
