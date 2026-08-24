import type { infer as ZodInfer } from 'zod';

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
export type IRPlotChannel = ZodInfer<typeof ChannelSchema>;

/** Positional channel bindings; built-ins use x / y / z, custom coordinates may add role keys. */
export type IRPlotPositionEncoding = ZodInfer<typeof PositionEncodingSchema>;

/** Mark channel bindings for non-position channels. */
export type IRPlotMarkChannelEncoding = ZodInfer<typeof MarkChannelEncodingSchema>;

/** Mark channel bindings: positional channels plus shared mark channels. */
export type IRPlotEncoding = ZodInfer<typeof EncodingSchema>;

/** Legacy size channel helper schema type. PointMark canonical size is a schema-defined style field. */
export type IRPlotSizeChannel = ZodInfer<typeof SizeChannelSchema>;

/** Legacy opacity channel helper schema type. PointMark canonical opacity is a schema-defined style field. */
export type IRPlotOpacityChannel = ZodInfer<typeof OpacityChannelSchema>;

/** Legacy shape channel helper schema type. PointMark canonical shape is a schema-defined style field. */
export type IRPlotShapeChannel = ZodInfer<typeof ShapeChannelSchema>;

/** PointMark encoding: positional channels plus optional text only. */
export type IRPlotPointEncoding = ZodInfer<typeof PointEncodingSchema>;

/** Text content channel binding. */
export type IRPlotTextChannel = ZodInfer<typeof TextChannelSchema>;

/** Mark label content binding. */
export type IRPlotMarkLabelContent = ZodInfer<typeof MarkLabelContentSchema>;

/** Host datum label config aligned with core NodeLabelSchema. */
export type IRPlotMarkNodeLabel = ZodInfer<typeof MarkNodeLabelSchema>;

/** Host geometry label config aligned with core GeometryLabelSchema. */
export type IRPlotMarkGeometryLabel = ZodInfer<typeof MarkGeometryLabelSchema>;

/** Single or array node label declaration. */
export type IRPlotMarkNodeLabelList = ZodInfer<typeof MarkNodeLabelListSchema>;

/** Single or array geometry label declaration. */
export type IRPlotMarkGeometryLabelList = ZodInfer<typeof MarkGeometryLabelListSchema>;

/** Host-inferred mark label config. */
export type IRPlotMarkLabel = ZodInfer<typeof MarkLabelSchema>;
