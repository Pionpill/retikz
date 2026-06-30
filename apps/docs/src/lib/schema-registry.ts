import type { core, ZodTypeAny } from 'zod';

import * as IR from '@retikz/core';

export type SchemaRegistryEntry = {
  schema: ZodTypeAny;
  /** 渲染类型签名时使用的名字（去掉 "Schema" 后缀） */
  label: string;
  /** Reference 页面 URL（含可选 #anchor） */
  url: string;
};

export const SCHEMA_REGISTRY: Record<string, SchemaRegistryEntry> = {
  // 顶层 scene
  SceneSchema: { schema: IR.SceneSchema, label: 'Scene', url: '/kernel/reference/schema/scene' },
  ChildSchema: { schema: IR.ChildSchema, label: 'Child', url: '/kernel/reference/schema/scene#child' },

  // Entity 及文本相关结构
  NodeSchema: { schema: IR.NodeSchema, label: 'Node', url: '/kernel/reference/schema/entity#node' },
  NodeLabelSchema: { schema: IR.NodeLabelSchema, label: 'NodeLabel', url: '/kernel/reference/schema/entity#nodelabel' },
  CoordinateSchema: {
    schema: IR.CoordinateSchema,
    label: 'Coordinate',
    url: '/kernel/reference/schema/entity#coordinate',
  },
  FontSchema: { schema: IR.FontSchema, label: 'Font', url: '/kernel/reference/schema/entity#font' },
  TextBlockSchema: { schema: IR.TextBlockSchema, label: 'TextBlock', url: '/kernel/reference/schema/entity#textblock' },
  LineSpecSchema: { schema: IR.LineSpecSchema, label: 'LineSpec', url: '/kernel/reference/schema/entity#linespec' },

  // Path / Step / Target
  PathSchema: { schema: IR.PathSchema, label: 'Path', url: '/kernel/reference/schema/path#path' },
  DrawableStyleSchema: {
    schema: IR.DrawableStyleSchema,
    label: 'DrawableStyle',
    url: '/kernel/reference/schema/path#drawablestyle',
  },
  DrawableInstanceSchema: {
    schema: IR.DrawableInstanceSchema,
    label: 'DrawableInstance',
    url: '/kernel/reference/schema/path#drawableinstance',
  },
  PathRibbonOptionsSchema: {
    schema: IR.PathRibbonOptionsSchema,
    label: 'PathRibbonOptions',
    url: '/kernel/reference/schema/path#pathribbonoptions',
  },
  StepSchema: { schema: IR.StepSchema, label: 'Step', url: '/kernel/reference/schema/path#step' },
  GeometryLabelSchema: {
    schema: IR.GeometryLabelSchema,
    label: 'GeometryLabel',
    url: '/kernel/reference/schema/path#geometrylabel',
  },
  StepLabelSchema: { schema: IR.StepLabelSchema, label: 'StepLabel', url: '/kernel/reference/schema/path#steplabel' },
  ControlPointSchema: {
    schema: IR.ControlPointSchema,
    label: 'ControlPoint',
    url: '/kernel/reference/schema/path#controlpoint',
  },
  TargetSchema: { schema: IR.TargetSchema, label: 'Target', url: '/kernel/reference/schema/path#target' },
  PositionSchema: { schema: IR.PositionSchema, label: 'Position', url: '/kernel/reference/schema/placement#position' },
  PolarPositionSchema: {
    schema: IR.PolarPositionSchema,
    label: 'PolarPosition',
    url: '/kernel/reference/schema/placement#polarposition',
  },
  AtPositionSchema: {
    schema: IR.AtPositionSchema,
    label: 'AtPosition',
    url: '/kernel/reference/schema/placement#atposition',
  },
  OffsetPositionSchema: {
    schema: IR.OffsetPositionSchema,
    label: 'OffsetPosition',
    url: '/kernel/reference/schema/placement#offsetposition',
  },
  BetweenPositionSchema: {
    schema: IR.BetweenPositionSchema,
    label: 'BetweenPosition',
    url: '/kernel/reference/schema/placement#betweenposition',
  },
  AbsoluteTargetSchema: {
    schema: IR.AbsoluteTargetSchema,
    label: 'AbsoluteTarget',
    url: '/kernel/reference/schema/placement#absolutetarget',
  },

  // Step 12 变体（同页 #anchor）
  MoveStepSchema: { schema: IR.MoveStepSchema, label: 'MoveStep', url: '/kernel/reference/schema/path#move' },
  LineStepSchema: { schema: IR.LineStepSchema, label: 'LineStep', url: '/kernel/reference/schema/path#line' },
  FoldStepSchema: { schema: IR.FoldStepSchema, label: 'FoldStep', url: '/kernel/reference/schema/path#fold' },
  CycleStepSchema: { schema: IR.CycleStepSchema, label: 'CycleStep', url: '/kernel/reference/schema/path#cycle' },
  CurveStepSchema: { schema: IR.CurveStepSchema, label: 'CurveStep', url: '/kernel/reference/schema/path#curve' },
  CubicStepSchema: { schema: IR.CubicStepSchema, label: 'CubicStep', url: '/kernel/reference/schema/path#cubic' },
  BendStepSchema: { schema: IR.BendStepSchema, label: 'BendStep', url: '/kernel/reference/schema/path#bend' },
  // 注：arc / circlePath / ellipsePath 这里登记的是 superRefine 产物，
  // StepSchema 联合内部用的是未导出的 Base 实例，identity 不同；ZodSchema 走 StepSchema
  // 联合时这三项不会命中 lookupSchema、会整段内联展开（链接仍可单独命中本条目）。
  // 彻底链接需 core 导出 Base 实例或 walker 加 Base→注册项映射。
  ArcStepSchema: { schema: IR.ArcStepSchema, label: 'ArcStep', url: '/kernel/reference/schema/path#arc' },
  CirclePathStepSchema: {
    schema: IR.CirclePathStepSchema,
    label: 'CirclePathStep',
    url: '/kernel/reference/schema/path#circlepath',
  },
  EllipsePathStepSchema: {
    schema: IR.EllipsePathStepSchema,
    label: 'EllipsePathStep',
    url: '/kernel/reference/schema/path#ellipsepath',
  },
  RectangleStepSchema: {
    schema: IR.RectangleStepSchema,
    label: 'RectangleStep',
    url: '/kernel/reference/schema/path#rectangle',
  },
  GeneratorStepSchema: {
    schema: IR.GeneratorStepSchema,
    label: 'GeneratorStep',
    url: '/kernel/reference/schema/path#generator',
  },

  // Target 2 变体（同页 #anchor）
  RelativeTargetSchema: {
    schema: IR.RelativeTargetSchema,
    label: 'RelativeTarget',
    url: '/kernel/reference/schema/path#relative',
  },
  RelativeAccumulateTargetSchema: {
    schema: IR.RelativeAccumulateTargetSchema,
    label: 'RelativeAccumulateTarget',
    url: '/kernel/reference/schema/path#relativeaccumulate',
  },

  // Arrow detail（path-level 箭头视觉规格）
  ArrowDetailSchema: {
    schema: IR.ArrowDetailSchema,
    label: 'ArrowDetail',
    url: '/kernel/reference/schema/path#arrowdetail',
  },
  ArrowEndDetailSchema: {
    schema: IR.ArrowEndDetailSchema,
    label: 'ArrowEndDetail',
    url: '/kernel/reference/schema/path#arrowenddetail',
  },
};

/** 按 identity 反查注册表项（同一 Zod schema 实例必命中同一条目） */
export function lookupSchema(schema: core.$ZodType): SchemaRegistryEntry | undefined {
  return Object.values(SCHEMA_REGISTRY).find(e => e.schema === schema);
}
