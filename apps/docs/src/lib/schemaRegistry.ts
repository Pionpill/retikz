import * as IR from '@retikz/core';
import type { ZodTypeAny } from 'zod';

export type SchemaRegistryEntry = {
  schema: ZodTypeAny;
  /** 渲染类型签名时使用的名字（去掉 "Schema" 后缀） */
  label: string;
  /** Reference 页面 URL（含可选 #anchor） */
  url: string;
};

export const SCHEMA_REGISTRY: Record<string, SchemaRegistryEntry> = {
  // 顶层 scene
  SceneSchema:         { schema: IR.SceneSchema,         label: 'Scene',         url: '/core/reference/schema/scene' },
  ChildSchema:         { schema: IR.ChildSchema,         label: 'Child',         url: '/core/reference/schema/scene#child' },

  // Entity 及文本相关结构
  NodeSchema:          { schema: IR.NodeSchema,          label: 'Node',          url: '/core/reference/schema/entity#node' },
  NodeLabelSchema:     { schema: IR.NodeLabelSchema,     label: 'NodeLabel',     url: '/core/reference/schema/entity#nodelabel' },
  CoordinateSchema:    { schema: IR.CoordinateSchema,    label: 'Coordinate',    url: '/core/reference/schema/entity#coordinate' },
  FontSchema:          { schema: IR.FontSchema,          label: 'Font',          url: '/core/reference/schema/entity#font' },
  TextBlockSchema:     { schema: IR.TextBlockSchema,     label: 'TextBlock',     url: '/core/reference/schema/entity#textblock' },
  LineSpecSchema:      { schema: IR.LineSpecSchema,      label: 'LineSpec',      url: '/core/reference/schema/entity#linespec' },

  // Path / Step / Target
  PathSchema:          { schema: IR.PathSchema,          label: 'Path',          url: '/core/reference/schema/path#path' },
  StepSchema:          { schema: IR.StepSchema,          label: 'Step',          url: '/core/reference/schema/path#step' },
  StepLabelSchema:     { schema: IR.StepLabelSchema,     label: 'StepLabel',     url: '/core/reference/schema/path#steplabel' },
  ControlPointSchema:  { schema: IR.ControlPointSchema,  label: 'ControlPoint',  url: '/core/reference/schema/path#controlpoint' },
  TargetSchema:        { schema: IR.TargetSchema,        label: 'Target',        url: '/core/reference/schema/path#target' },
  PositionSchema:      { schema: IR.PositionSchema,      label: 'Position',      url: '/core/reference/schema/placement#position' },
  PolarPositionSchema: { schema: IR.PolarPositionSchema, label: 'PolarPosition', url: '/core/reference/schema/placement#polarposition' },
  AtPositionSchema:    { schema: IR.AtPositionSchema,    label: 'AtPosition',    url: '/core/reference/schema/placement#atposition' },
  OffsetPositionSchema:{ schema: IR.OffsetPositionSchema,label: 'OffsetPosition',url: '/core/reference/schema/placement#offsetposition' },

  // Step 10 变体（同页 #anchor）
  MoveStepSchema:        { schema: IR.MoveStepSchema,        label: 'MoveStep',        url: '/core/reference/schema/path#move' },
  LineStepSchema:        { schema: IR.LineStepSchema,        label: 'LineStep',        url: '/core/reference/schema/path#line' },
  FoldStepSchema:        { schema: IR.FoldStepSchema,        label: 'FoldStep',        url: '/core/reference/schema/path#fold' },
  CycleStepSchema:       { schema: IR.CycleStepSchema,       label: 'CycleStep',       url: '/core/reference/schema/path#cycle' },
  CurveStepSchema:       { schema: IR.CurveStepSchema,       label: 'CurveStep',       url: '/core/reference/schema/path#curve' },
  CubicStepSchema:       { schema: IR.CubicStepSchema,       label: 'CubicStep',       url: '/core/reference/schema/path#cubic' },
  BendStepSchema:        { schema: IR.BendStepSchema,        label: 'BendStep',        url: '/core/reference/schema/path#bend' },
  ArcStepSchema:         { schema: IR.ArcStepSchema,         label: 'ArcStep',         url: '/core/reference/schema/path#arc' },
  CirclePathStepSchema:  { schema: IR.CirclePathStepSchema,  label: 'CirclePathStep',  url: '/core/reference/schema/path#circlepath' },
  EllipsePathStepSchema: { schema: IR.EllipsePathStepSchema, label: 'EllipsePathStep', url: '/core/reference/schema/path#ellipsepath' },

  // Target 2 变体（同页 #anchor）
  RelativeTargetSchema:           { schema: IR.RelativeTargetSchema,           label: 'RelativeTarget',           url: '/core/reference/schema/path#relative' },
  RelativeAccumulateTargetSchema: { schema: IR.RelativeAccumulateTargetSchema, label: 'RelativeAccumulateTarget', url: '/core/reference/schema/path#relativeaccumulate' },

  // Arrow detail（path-level 箭头视觉规格）
  ArrowDetailSchema:    { schema: IR.ArrowDetailSchema,    label: 'ArrowDetail',    url: '/core/reference/schema/path#arrowdetail' },
  ArrowEndDetailSchema: { schema: IR.ArrowEndDetailSchema, label: 'ArrowEndDetail', url: '/core/reference/schema/path#arrowenddetail' },
};

/** 按 identity 反查注册表项（同一 Zod schema 实例必命中同一条目） */
export function lookupSchema(schema: ZodTypeAny): SchemaRegistryEntry | undefined {
  return Object.values(SCHEMA_REGISTRY).find(e => e.schema === schema);
}
