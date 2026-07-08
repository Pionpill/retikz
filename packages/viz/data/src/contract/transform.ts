import { z } from 'zod';

import type { AnyRowSelectorDefinition, AnyStatisticsReducerDefinition } from './statistics';

import { type ExternalRow, type TransformOperation } from '../schemas';

/**
 * transform apply 上下文。
 * @description 自定义 transform 用它读取 / 写入数据来源标记：保行数 transform 通常透传行对象即可保留 sourceIndex；
 *   改行数 transform 若输出行代表一组源行，必须用 groupProvenance 给输出行挂 sourceIndices，避免 locator / datum meta 丢失组级来源；
 *   生成行没有源行时可自然降级。
 */
export type TransformContext = {
  /** 读单行源序标记；未开启 provenance 或行未打标记时返回 undefined。 */
  readSourceIndex: (row: ExternalRow) => number | undefined;
  /** 读组级源序标记；bin / summarize 或自定义改行数 transform 输出行可能携带。 */
  readSourceIndices: (row: ExternalRow) => Array<number> | undefined;
  /** 给一个改行数输出行打组级源序标记；成员行无标记时原样返回。 */
  groupProvenance: (out: ExternalRow, members: Array<ExternalRow>) => ExternalRow;
  /** 统计 reducer registry；缺省时使用内置 reducer。 */
  statisticsReducerRegistry?: ReadonlyMap<string, AnyStatisticsReducerDefinition>;
  /** row selector registry；缺省时使用内置 selector。 */
  rowSelectorRegistry?: ReadonlyMap<string, AnyRowSelectorDefinition>;
};

/**
 * transform runtime definition。
 * @description definition 是运行时对象，不进入 JSON IR；IR 只保存 `{ kind, ...config }` 形态的 TransformOperation。
 */
export type TransformDefinition<TTransformOperation extends TransformOperation = TransformOperation> = {
  /** 完整 transform operation schema；必须含非空 z.literal('kind') 供 registry 提取注册键。 */
  schema: z.ZodType<TTransformOperation>;
  /** 该 transform 消费的源字段名；参与 data.model strict 校验。 */
  inputFields?: (operation: TTransformOperation, context: TransformContext) => Array<string>;
  /** 该 transform 产出的派生字段名；从 data.model strict 校验的源字段集中排除。 */
  outputFields?: (operation: TTransformOperation, context: TransformContext) => Array<string>;
  /** 执行 transform；必须纯且确定；改行数且代表源行集合时要用 context.groupProvenance 保留 provenance。 */
  apply: (rows: Array<ExternalRow>, operation: TTransformOperation, context: TransformContext) => Array<ExternalRow>;
};

/**
 * 定义一个 transform definition。
 * @description 保留 schema / inputFields / outputFields / apply 之间的泛型关联；内置与自定义 transform 都经同一 registry 入口分派。
 * @remarks 该入口是 typed identity：在保持定义对象原样的同时，为后续运行时校验、默认值归一或泛型收敛预留稳定 contract hook。
 */
export const defineTransform = <TTransformOperation extends TransformOperation>(
  def: TransformDefinition<TTransformOperation>,
): TransformDefinition<TTransformOperation> => def;

/**
 * registry 内部使用的宽类型。
 * @description registry 需要存放不同 operation 泛型的 definition；真正调用前必须用对应 schema parse 收窄。
 */
export type AnyTransformDefinition = Omit<
  TransformDefinition<TransformOperation>,
  'schema' | 'inputFields' | 'outputFields' | 'apply'
> & {
  /** 不同 definition 的 schema 泛型不同，registry 只关心能从中提取 kind 并执行 parse。 */
  schema: z.ZodType;
  /** 内部宽类型占位；真正调用前必须用该 definition.schema 解析 operation。 */
  inputFields?: (operation: never, context: TransformContext) => Array<string>;
  /** 内部宽类型占位；真正调用前必须用该 definition.schema 解析 operation。 */
  outputFields?: (operation: never, context: TransformContext) => Array<string>;
  /** 内部宽类型占位；真正调用前必须用该 definition.schema 解析 operation。 */
  apply: (rows: Array<ExternalRow>, operation: never, context: TransformContext) => Array<ExternalRow>;
};

/**
 * 从 transform definition schema 中提取 registry key。
 * @description definition schema 必须是包含 `kind: z.literal('<transform-kind>')` 的 ZodObject；该 literal 值就是 registry 唯一键。
 */
export const extractTransformKind = (schema: z.ZodType): string => {
  if (!(schema instanceof z.ZodObject)) {
    throw new Error('data: transform registration schema must be a ZodObject with a literal kind field');
  }
  const kindSchema = schema.shape.kind;
  if (!(kindSchema instanceof z.ZodLiteral) || typeof kindSchema.value !== 'string' || kindSchema.value.length === 0) {
    throw new Error('data: transform registration schema must declare kind as a non-empty z.literal string');
  }
  return kindSchema.value;
};
