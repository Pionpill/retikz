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
export type IRPlotChannel = z.infer<typeof ChannelSchema>;

/** Positional channel bindings; built-ins use x / y / z, custom coordinates may add role keys. */
export type IRPlotPositionEncoding = z.infer<typeof PositionEncodingSchema>;

/** Mark channel bindings for non-position channels. */
export type IRPlotMarkChannelEncoding = z.infer<typeof MarkChannelEncodingSchema>;

/** Mark channel bindings: positional channels plus shared mark channels. */
export type IRPlotEncoding = z.infer<typeof EncodingSchema>;

/** Legacy size channel helper schema type. PointMark canonical size is a schema-defined style field. */
export type IRPlotSizeChannel = z.infer<typeof SizeChannelSchema>;

/** Legacy opacity channel helper schema type. PointMark canonical opacity is a schema-defined style field. */
export type IRPlotOpacityChannel = z.infer<typeof OpacityChannelSchema>;

/** Legacy shape channel helper schema type. PointMark canonical shape is a schema-defined style field. */
export type IRPlotShapeChannel = z.infer<typeof ShapeChannelSchema>;

/** PointMark encoding: positional channels plus optional text only. */
export type IRPlotPointEncoding = z.infer<typeof PointEncodingSchema>;

/** Text content channel binding. */
export type IRPlotTextChannel = z.infer<typeof TextChannelSchema>;

/** Mark label content binding. */
export type IRPlotMarkLabelContent = z.infer<typeof MarkLabelContentSchema>;

/** Host datum label config aligned with core NodeLabelSchema. */
export type IRPlotMarkNodeLabel = z.infer<typeof MarkNodeLabelSchema>;

/** Host geometry label config aligned with core GeometryLabelSchema. */
export type IRPlotMarkGeometryLabel = z.infer<typeof MarkGeometryLabelSchema>;

/** Single or array node label declaration. */
export type IRPlotMarkNodeLabelList = z.infer<typeof MarkNodeLabelListSchema>;

/** Single or array geometry label declaration. */
export type IRPlotMarkGeometryLabelList = z.infer<typeof MarkGeometryLabelListSchema>;

/** Host-inferred mark label config. */
export type IRPlotMarkLabel = z.infer<typeof MarkLabelSchema>;
