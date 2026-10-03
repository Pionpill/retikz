import type { ValueOf } from '@retikz/foundation';
import type { ZodType } from 'zod';
import { ZodLiteral, ZodObject } from 'zod';

import { RetikzDataError } from '../error';
import type { DataFieldTypeValue, IRDataTransform } from '../schemas';
import type { ExternalRow } from '../shared';
import type { DataTransformDependency, DataTransformModel } from './execution';
import type { DataLineageRecorder } from './lineage';
import type { AnyRegressionDefinition, AnySynchronousRegressionImplementation } from './regression';
import type {
  AnyRowSelectorDefinition,
  AnyStatisticsReducerDefinition,
  AnySynchronousStatisticsReducerImplementation,
  AnySynchronousRowSelectorImplementation,
} from './statistics';

/** transform的闭合调度阶段 */
export const DataTransformPhase = {
  /** 改变行shape或粒度 */
  RowShape: 'row-shape',
  /** 从现有字段派生新字段 */
  FieldDerive: 'field-derive',
  /** 只改变行顺序 */
  RowOrder: 'row-order',
  /** 依赖前序行或分组累计状态派生字段 */
  CumulativeDerive: 'cumulative-derive',
  /** 对已绑定位置字段做最终调整 */
  FieldAdjust: 'field-adjust',
} as const;

/** transform调度阶段取值 */
export type DataTransformPhaseValue = ValueOf<typeof DataTransformPhase>;

/** transform调度允许绑定的结构类别 */
export const DataTransformBindingClass = {
  /** 产生或覆盖一个字段binding */
  Field: 'field',
  /** 只表达有序consumer */
  Order: 'order',
} as const;

/** transform调度结构类别取值 */
export type DataTransformBindingClassValue = ValueOf<typeof DataTransformBindingClass>;

/** transform调度对行和字段结构的闭合影响 */
export const DataTransformFieldEffect = {
  /** 保留现有行和字段并增加或覆盖字段 */
  Preserve: 'preserve',
  /** 替换现有行shape与字段集合 */
  Replace: 'replace',
  /** 只重排行 */
  Reorder: 'reorder',
} as const;

/** transform调度字段影响取值 */
export type DataTransformFieldEffectValue = ValueOf<typeof DataTransformFieldEffect>;

/** Definition声明的闭合调度描述 */
export type DataTransformSchedule = Readonly<{
  /** 固定调度阶段 */
  phase: DataTransformPhaseValue;
  /** 当前Definition允许的mapping binding类别 */
  bindingClass: DataTransformBindingClassValue;
  /** operation对行和字段结构的影响 */
  fieldEffect: DataTransformFieldEffectValue;
}>;

/** transform输出字段的运行时类型描述 */
export type DataTransformOutputDescriptor = Readonly<{
  /** operation输出的逻辑字段名 */
  field: string;
  /** 固定字段类型，或复用当前DataView中另一个字段的类型 */
  type?: DataFieldTypeValue | Readonly<{ from: string }>;
}>;

/** transform对字段类型图的完整影响 */
export type DataTransformOutputModel =
  | Readonly<{
      /** 保留当前字段类型图并增加或覆盖outputs */
      kind: 'preserve';
      /** operation产生的已类型化字段 */
      outputs: Array<DataTransformOutputDescriptor>;
    }>
  | Readonly<{
      /** 丢弃当前字段类型图并由fields完整重建 */
      kind: 'replace';
      /** operation之后仍存在的全部已类型化字段 */
      fields: Array<DataTransformOutputDescriptor>;
    }>;

/**
 * transform apply 上下文。
 * @description 自定义 transform 用它读取 / 写入数据来源标记：保行数 transform 通常透传行对象即可保留 sourceIndex；
 *   改行数 transform 若输出行代表一组源行，必须用 groupProvenance 给输出行挂 sourceIndices，避免 locator / datum meta 丢失组级来源；
 *   生成行没有源行时可自然降级
 */
export type TransformContext = {
  /** 读单行源序标记；未开启 provenance 或行未打标记时返回 undefined */
  readSourceIndex: (row: ExternalRow) => number | undefined;
  /** 读组级源序标记；bin / summarize 或自定义改行数 transform 输出行可能携带 */
  readSourceIndices: (row: ExternalRow) => Array<number> | undefined;
  /** 给一个改行数输出行打组级源序标记；成员行无标记时原样返回 */
  groupProvenance: (out: ExternalRow, members: Array<ExternalRow>) => ExternalRow;
  /** 当前运行的拟合方法 registry */
  regressionRegistry?: ReadonlyMap<string, AnyRegressionDefinition>;
  /** 统计 reducer registry；缺省时使用内置 reducer */
  statisticsReducerRegistry?: ReadonlyMap<string, AnyStatisticsReducerDefinition>;
  /** row selector registry；缺省时使用内置 selector */
  rowSelectorRegistry?: ReadonlyMap<string, AnyRowSelectorDefinition>;
  /** data lineage recorder；缺省时不记录 transform / reducer / selector 事件 */
  lineage?: DataLineageRecorder;
  /** 本次明确注册的同步 transform 计算实现 */
  transformImplementationRegistry?: ReadonlyMap<string, AnySynchronousTransformImplementation>;
  /** 本次同步统计实现 */
  statisticsReducerImplementationRegistry?: ReadonlyMap<string, AnySynchronousStatisticsReducerImplementation>;
  /** 本次同步选择实现 */
  rowSelectorImplementationRegistry?: ReadonlyMap<string, AnySynchronousRowSelectorImplementation>;
  /** 本次同步拟合实现 */
  regressionImplementationRegistry?: ReadonlyMap<string, AnySynchronousRegressionImplementation>;
};

/** 不读取行、不计算统计量的语义上下文 */
export type TransformSemanticContext = Readonly<{
  /** 当前阶段的完整字段模型 */
  model: DataTransformModel;
  /** 统计语义 registry */
  statisticsReducerRegistry?: ReadonlyMap<string, AnyStatisticsReducerDefinition>;
  /** 选择语义 registry */
  rowSelectorRegistry?: ReadonlyMap<string, AnyRowSelectorDefinition>;
  /** 拟合语义 registry */
  regressionRegistry?: ReadonlyMap<string, AnyRegressionDefinition>;
}>;

/**
 * transform runtime definition。
 * @description definition 是运行时对象，不进入 JSON IR；IR 只保存 `{ kind, ...config }` 形态的 IRDataTransform
 */
export type TransformDefinition<TTransform extends IRDataTransform = IRDataTransform> = {
  /** 完整 transform operation schema；必须含非空 z.literal('kind') 供 registry 提取注册键 */
  schema: ZodType<TTransform>;
  /** 该 transform 消费的源字段名；参与 data.model strict 校验 */
  inputFields?: (operation: TTransform, context: TransformSemanticContext) => Array<string>;
  /** 完整字段影响；没有类型证据的输出只声明字段名 */
  outputModel: (operation: TTransform, context: TransformSemanticContext) => DataTransformOutputModel;
  /** 模型和参数的领域不变量 */
  validate?: (operation: TTransform, context: TransformSemanticContext) => void;
  /** 当前 operation 的全部精确统计依赖 */
  dependencies?: (operation: TTransform, context: TransformSemanticContext) => Array<DataTransformDependency>;
  /** 允许上层宿主闭合调度该Definition的固定描述 */
  schedule?: DataTransformSchedule;
};

/**
 * 定义一个 transform definition。
 * @description 保留 schema、字段影响与依赖声明之间的泛型关联；内置与自定义 transform 都经同一 registry 入口解析
 * @remarks 该入口是 typed identity：在保持定义对象原样的同时，为后续运行时校验、默认值归一或泛型收敛预留稳定 contract hook
 */
export const defineTransform = <TTransform extends IRDataTransform>(
  def: TransformDefinition<TTransform>,
): TransformDefinition<TTransform> => def;

/**
 * registry 内部使用的宽类型。
 * @description registry 需要存放不同 operation 泛型的 definition；真正调用前必须用对应 schema parse 收窄
 */
export type AnyTransformDefinition = Omit<
  TransformDefinition<IRDataTransform>,
  'schema' | 'inputFields' | 'outputModel' | 'validate' | 'dependencies'
> & {
  /** 不同 definition 的 schema 泛型不同，registry 只关心能从中提取 kind 并执行 parse */
  schema: ZodType<IRDataTransform>;
  /** 内部宽类型占位；真正调用前必须用该 definition.schema 解析 operation */
  inputFields?: (operation: never, context: TransformSemanticContext) => Array<string>;
  /** 内部宽类型占位；真正调用前必须用该definition.schema解析operation */
  outputModel: (operation: never, context: TransformSemanticContext) => DataTransformOutputModel;
  /** 解析完成后的领域不变量 */
  validate?: (operation: never, context: TransformSemanticContext) => void;
  /** 完整统计依赖 */
  dependencies?: (operation: never, context: TransformSemanticContext) => Array<DataTransformDependency>;
};

/** 引用唯一语义 Definition 的独立计算实现 */
export type TransformImplementation<
  TTransform extends IRDataTransform = IRDataTransform,
  TResult extends Array<ExternalRow> | Promise<Array<ExternalRow>> = Array<ExternalRow> | Promise<Array<ExternalRow>>,
> = Readonly<{
  /** 计算遵守的语义身份 */
  definition: TransformDefinition<TTransform>;
  /** 计算规范行，不修改声明 */
  apply: (rows: Array<ExternalRow>, operation: TTransform, context: TransformContext) => TResult;
}>;

/** 保留语义定义与实际计算参数之间的泛型关联 */
export const defineTransformImplementation = <
  TTransform extends IRDataTransform,
  TResult extends Array<ExternalRow> | Promise<Array<ExternalRow>>,
>(
  implementation: TransformImplementation<TTransform, TResult>,
): TransformImplementation<TTransform, TResult> => implementation;

/** 异构实现注册表中的计算入口 */
export type AnyTransformImplementation = Readonly<{
  /** 本次 registry 中相同的语义 Definition */
  definition: AnyTransformDefinition;
  /** 精确解析后才能调用的计算入口 */
  apply: (
    rows: Array<ExternalRow>,
    operation: never,
    context: TransformContext,
  ) => Array<ExternalRow> | Promise<Array<ExternalRow>>;
}>;

/** 同步入口只接受不会返回 Promise 的计算实现 */
export type AnySynchronousTransformImplementation = Readonly<Omit<AnyTransformImplementation, 'apply'>> &
  Readonly<{
    /** 同步计算，不探测或启动异步任务 */
    apply: (rows: Array<ExternalRow>, operation: never, context: TransformContext) => Array<ExternalRow>;
  }>;

/**
 * 从 transform definition schema 中提取 registry key。
 * @description definition schema 必须是包含 `kind: z.literal('<transform-kind>')` 的 ZodObject；该 literal 值就是 registry 唯一键
 */
export const extractTransformKind = (schema: ZodType): string => {
  if (!(schema instanceof ZodObject)) {
    throw new RetikzDataError('data: transform registration schema must be a ZodObject with a literal kind field');
  }
  const kindSchema = schema.shape.kind;
  if (!(kindSchema instanceof ZodLiteral) || typeof kindSchema.value !== 'string' || kindSchema.value.length === 0) {
    throw new RetikzDataError('data: transform registration schema must declare kind as a non-empty z.literal string');
  }
  return kindSchema.value;
};
