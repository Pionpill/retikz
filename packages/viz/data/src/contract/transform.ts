import type { ValueOf } from '@retikz/foundation';
import type { ZodType } from 'zod';

import { ZodLiteral, ZodObject } from 'zod';

import type { DataFieldTypeValue, IRDataTransform } from '../schemas';
import type { ExternalRow } from '../shared';
import type { DataLineageRecorder } from './lineage';
import type { AnyRowSelectorDefinition, AnyStatisticsReducerDefinition } from './statistics';

import { RetikzDataError } from '../error';

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
  type: DataFieldTypeValue | Readonly<{ from: string }>;
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
  /** 统计 reducer registry；缺省时使用内置 reducer */
  statisticsReducerRegistry?: ReadonlyMap<string, AnyStatisticsReducerDefinition>;
  /** row selector registry；缺省时使用内置 selector */
  rowSelectorRegistry?: ReadonlyMap<string, AnyRowSelectorDefinition>;
  /** data lineage recorder；缺省时不记录 transform / reducer / selector 事件 */
  lineage?: DataLineageRecorder;
};

/**
 * transform runtime definition。
 * @description definition 是运行时对象，不进入 JSON IR；IR 只保存 `{ kind, ...config }` 形态的 IRDataTransform
 */
export type TransformDefinition<TTransform extends IRDataTransform = IRDataTransform> = {
  /** 完整 transform operation schema；必须含非空 z.literal('kind') 供 registry 提取注册键 */
  schema: ZodType<TTransform>;
  /** 该 transform 消费的源字段名；参与 data.model strict 校验 */
  inputFields?: (operation: TTransform, context: TransformContext) => Array<string>;
  /** 该 transform 产出的派生字段名；从 data.model strict 校验的源字段集中排除 */
  outputFields?: (operation: TTransform, context: TransformContext) => Array<string>;
  /** 该transform对字段类型图的影响；省略时下游不得保留旧类型证据 */
  outputModel?: (operation: TTransform, context: TransformContext) => DataTransformOutputModel | undefined;
  /** 允许上层宿主闭合调度该Definition的固定描述 */
  schedule?: DataTransformSchedule;
  /** 执行 transform；必须纯且确定；改行数且代表源行集合时要用 context.groupProvenance 保留 provenance */
  apply: (rows: Array<ExternalRow>, operation: TTransform, context: TransformContext) => Array<ExternalRow>;
};

/**
 * 定义一个 transform definition。
 * @description 保留 schema / inputFields / outputFields / apply 之间的泛型关联；内置与自定义 transform 都经同一 registry 入口分派。
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
  'schema' | 'inputFields' | 'outputFields' | 'outputModel' | 'apply'
> & {
  /** 不同 definition 的 schema 泛型不同，registry 只关心能从中提取 kind 并执行 parse */
  schema: ZodType;
  /** 内部宽类型占位；真正调用前必须用该 definition.schema 解析 operation */
  inputFields?: (operation: never, context: TransformContext) => Array<string>;
  /** 内部宽类型占位；真正调用前必须用该 definition.schema 解析 operation */
  outputFields?: (operation: never, context: TransformContext) => Array<string>;
  /** 内部宽类型占位；真正调用前必须用该definition.schema解析operation */
  outputModel?: (operation: never, context: TransformContext) => DataTransformOutputModel | undefined;
  /** 内部宽类型占位；真正调用前必须用该 definition.schema 解析 operation */
  apply: (rows: Array<ExternalRow>, operation: never, context: TransformContext) => Array<ExternalRow>;
};

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
