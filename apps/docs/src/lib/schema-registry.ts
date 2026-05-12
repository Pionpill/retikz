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
  // 6 个一级页面
  SceneSchema:         { schema: IR.SceneSchema,         label: 'Scene',         url: '/core/reference/schema/scene' },
  NodeSchema:          { schema: IR.NodeSchema,          label: 'Node',          url: '/core/reference/schema/entity#node' },
  CoordinateSchema:    { schema: IR.CoordinateSchema,    label: 'Coordinate',    url: '/core/reference/schema/entity#coordinate' },
  PathSchema:          { schema: IR.PathSchema,          label: 'Path',          url: '/core/reference/schema/path#path' },
  StepSchema:          { schema: IR.StepSchema,          label: 'Step',          url: '/core/reference/schema/path#step' },
  TargetSchema:        { schema: IR.TargetSchema,        label: 'Target',        url: '/core/reference/schema/target' },
  PositionSchema:      { schema: IR.PositionSchema,      label: 'Position',      url: '/core/reference/schema/placement#position' },
  PolarPositionSchema: { schema: IR.PolarPositionSchema, label: 'PolarPosition', url: '/core/reference/schema/placement#polarposition' },
  AtPositionSchema:    { schema: IR.AtPositionSchema,    label: 'AtPosition',    url: '/core/reference/schema/placement#atposition' },

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
  RelTargetSchema:           { schema: IR.RelTargetSchema,           label: 'RelTarget',           url: '/core/reference/schema/target#rel' },
  RelAccumulateTargetSchema: { schema: IR.RelAccumulateTargetSchema, label: 'RelAccumulateTarget', url: '/core/reference/schema/target#relaccumulate' },
};

/** 按 identity 反查注册表项（同一 Zod schema 实例必命中同一条目） */
export function lookupSchema(schema: ZodTypeAny): SchemaRegistryEntry | undefined {
  return Object.values(SCHEMA_REGISTRY).find(e => e.schema === schema);
}
