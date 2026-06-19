import { z } from 'zod';
import type { ExternalRow, TransformOperation } from '../ir';
import { readSourceIndex, readSourceIndices, withGroupProvenance } from '../lower/provenance';
import { type AggregateTransform, AggregateTransformSchema, type BinTransform, BinTransformSchema, type DeriveIntervalTransform, DeriveIntervalTransformSchema, type JitterTransform, JitterTransformSchema, type NormalizeTransform, NormalizeTransformSchema, type SortTransform, SortTransformSchema, type StackTransform, StackTransformSchema } from '../ir/transform';
import { aggregateOutputField, applyAggregate, applyBin, binOutputFields } from './group';
import { DEFAULT_DERIVE_END_FIELD, DEFAULT_DERIVE_START_FIELD, DEFAULT_END_FIELD, DEFAULT_JITTER_X_FIELD, DEFAULT_JITTER_Y_FIELD, DEFAULT_START_FIELD, applyDeriveInterval, applyJitter, applyNormalize, applySort, applyStack } from './row';

/**
 * transform apply 上下文。
 * @description 自定义 transform 用它读取 / 写入数据来源标记：保行数 transform 通常透传行对象即可保留 sourceIndex；
 *   改行数 transform 若输出行代表一组源行，必须用 groupProvenance 给输出行挂 sourceIndices，避免 locator / datum meta 丢失组级来源；
 *   生成行没有源行时可自然降级。
 */
export type TransformContext = {
  /** 读单行源序标记；未开启 provenance 或行未打标记时返回 undefined。 */
  readSourceIndex: (row: ExternalRow) => number | undefined;
  /** 读组级源序标记；bin / aggregate 或自定义改行数 transform 输出行可能携带。 */
  readSourceIndices: (row: ExternalRow) => Array<number> | undefined;
  /** 给一个改行数输出行打组级源序标记；成员行无标记时原样返回。 */
  groupProvenance: (out: ExternalRow, members: Array<ExternalRow>) => ExternalRow;
};

/** 默认 transform 上下文：使用 plot provenance symbol 标记，不把来源信息写进 JSON IR。 */
export const DEFAULT_TRANSFORM_CONTEXT: TransformContext = {
  readSourceIndex,
  readSourceIndices,
  groupProvenance: withGroupProvenance,
};

/**
 * transform runtime definition。
 * @description definition 是运行时对象，不进入 JSON IR；IR 只保存 `{ kind, ...config }` 形态的 TransformOperation。
 */
export type TransformDefinition<TTransformOperation extends TransformOperation = TransformOperation> = {
  /** 完整 transform operation schema；必须含非空 z.literal('kind') 供 registry 提取注册键。 */
  schema: z.ZodType<TTransformOperation>;
  /** 该 transform 消费的源字段名；参与 data.model strict 校验。 */
  inputFields?: (operation: TTransformOperation) => Array<string>;
  /** 该 transform 产出的派生字段名；从 data.model strict 校验的源字段集中排除。 */
  outputFields?: (operation: TTransformOperation) => Array<string>;
  /** 执行 transform；必须纯且确定；改行数且代表源行集合时要用 context.groupProvenance 保留 provenance。 */
  apply: (rows: Array<ExternalRow>, operation: TTransformOperation, context: TransformContext) => Array<ExternalRow>;
};

/**
 * 定义一个 transform definition。
 * @description 保留 schema / inputFields / outputFields / apply 之间的泛型关联；内置与自定义 transform 都经同一 registry 入口分派。
 */
export const defineTransform = <TTransformOperation extends TransformOperation>(
  def: TransformDefinition<TTransformOperation>,
): TransformDefinition<TTransformOperation> => def;

/**
 * registry 内部使用的宽类型。
 * @description registry 需要存放不同 operation 泛型的 definition；真正调用前必须用对应 schema parse 收窄。
 */
export type AnyTransformDefinition = Omit<TransformDefinition<TransformOperation>, 'schema' | 'inputFields' | 'outputFields' | 'apply'> & {
  /** 不同 definition 的 schema 泛型不同，registry 只关心能从中提取 kind 并执行 parse。 */
  schema: z.ZodType;
  /** 内部宽类型占位；真正调用前必须用该 definition.schema 解析 operation。 */
  inputFields?: (operation: never) => Array<string>;
  /** 内部宽类型占位；真正调用前必须用该 definition.schema 解析 operation。 */
  outputFields?: (operation: never) => Array<string>;
  /** 内部宽类型占位；真正调用前必须用该 definition.schema 解析 operation。 */
  apply: (rows: Array<ExternalRow>, operation: never, context: TransformContext) => Array<ExternalRow>;
};

/**
 * 从 transform definition schema 中提取 registry key。
 * @description definition schema 必须是包含 `kind: z.literal('<transform-kind>')` 的 ZodObject；该 literal 值就是 registry 唯一键。
 */
export const extractTransformKind = (schema: z.ZodType): string => {
  if (!(schema instanceof z.ZodObject)) {
    throw new Error('lowerPlots: transform registration schema must be a ZodObject with a literal kind field');
  }
  const kindSchema = schema.shape.kind;
  if (!(kindSchema instanceof z.ZodLiteral) || typeof kindSchema.value !== 'string' || kindSchema.value.length === 0) {
    throw new Error('lowerPlots: transform registration schema must declare kind as a non-empty z.literal string');
  }
  return kindSchema.value;
};

const sortTransformDefinition = defineTransform<SortTransform>({
  schema: SortTransformSchema,
  inputFields: operation => [operation.field],
  apply: (rows, operation) => applySort(rows, operation),
});

const stackTransformDefinition = defineTransform<StackTransform>({
  schema: StackTransformSchema,
  inputFields: operation => [operation.y, ...(operation.x !== undefined ? [operation.x] : []), ...(operation.groupBy !== undefined ? [operation.groupBy] : [])],
  outputFields: operation => [operation.startField ?? DEFAULT_START_FIELD, operation.endField ?? DEFAULT_END_FIELD],
  apply: (rows, operation) => applyStack(rows, operation),
});

const binTransformDefinition = defineTransform<BinTransform>({
  schema: BinTransformSchema,
  inputFields: operation => [operation.field, ...(operation.reduceField !== undefined ? [operation.reduceField] : [])],
  outputFields: operation => {
    const out = binOutputFields(operation);
    return [out.startField, out.endField, out.valueField];
  },
  apply: (rows, operation, context) => applyBin(rows, operation, context),
});

const aggregateTransformDefinition = defineTransform<AggregateTransform>({
  schema: AggregateTransformSchema,
  inputFields: operation => [...operation.groupBy, ...(operation.field !== undefined ? [operation.field] : [])],
  outputFields: operation => [aggregateOutputField(operation)],
  apply: (rows, operation, context) => applyAggregate(rows, operation, context),
});

const normalizeTransformDefinition = defineTransform<NormalizeTransform>({
  schema: NormalizeTransformSchema,
  inputFields: operation => [operation.field, ...(operation.groupBy ?? [])],
  outputFields: operation => (operation.as !== undefined ? [operation.as] : []),
  apply: (rows, operation) => applyNormalize(rows, operation),
});

const deriveIntervalTransformDefinition = defineTransform<DeriveIntervalTransform>({
  schema: DeriveIntervalTransformSchema,
  inputFields: operation => [operation.from, operation.startFrom, operation.endFrom].filter((field): field is string => field !== undefined),
  outputFields: operation => [operation.startField ?? DEFAULT_DERIVE_START_FIELD, operation.endField ?? DEFAULT_DERIVE_END_FIELD],
  apply: (rows, operation) => applyDeriveInterval(rows, operation),
});

const jitterTransformDefinition = defineTransform<JitterTransform>({
  schema: JitterTransformSchema,
  inputFields: operation => {
    const axis = operation.axis ?? 'x';
    return [
      axis === 'x' || axis === 'both' ? operation.xField ?? DEFAULT_JITTER_X_FIELD : undefined,
      axis === 'y' || axis === 'both' ? operation.yField ?? DEFAULT_JITTER_Y_FIELD : undefined,
    ].filter((field): field is string => field !== undefined);
  },
  apply: (rows, operation) => applyJitter(rows, operation),
});

/** 内置 transform definition 列表；内置 7 个与自定义 transform 共享同一 registry 分派流程。 */
export const BUILTIN_TRANSFORMS: ReadonlyArray<AnyTransformDefinition> = [
  sortTransformDefinition,
  stackTransformDefinition,
  binTransformDefinition,
  aggregateTransformDefinition,
  normalizeTransformDefinition,
  deriveIntervalTransformDefinition,
  jitterTransformDefinition,
] as ReadonlyArray<AnyTransformDefinition>;

/**
 * 按 kind 索引的内置 transform definition。
 * @description 主要供诊断与测试确认内置覆盖；自定义 definition 不写入此表，而是在每次 lowering 时合并。
 */
export const BUILTIN_TRANSFORM_DEFINITIONS_BY_KIND: ReadonlyMap<string, AnyTransformDefinition> = new Map(
  BUILTIN_TRANSFORMS.map(def => [extractTransformKind(def.schema), def] as const),
);

/**
 * 解析 transform registry。
 * @description 内置 transform 总是先注册；用户自定义 definition 不能覆盖内置 kind，也不能彼此重复。
 */
export const resolveTransformRegistry = (custom?: ReadonlyArray<AnyTransformDefinition>): Map<string, AnyTransformDefinition> => {
  const registry = new Map<string, AnyTransformDefinition>();
  for (const def of BUILTIN_TRANSFORMS) {
    registry.set(extractTransformKind(def.schema), def);
  }
  for (const def of custom ?? []) {
    const kind = extractTransformKind(def.schema);
    if (registry.has(kind)) {
      throw new Error(`lowerPlots: duplicate transform registration: "${kind}"`);
    }
    registry.set(kind, def);
  }
  return registry;
};
