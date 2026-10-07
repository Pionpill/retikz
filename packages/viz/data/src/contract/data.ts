import type { DataFieldType } from '../schemas';
import type { ExternalRow } from '../shared';
import type { DataTransformModel } from './execution';

/** 逻辑字段名到字段测量类型的运行时映射；由 data.model、自动推断和 resolver 合成，不进入 IR */
export type DataFieldTypeMap = Map<string, DataFieldType>;

/** 一次数据处理阶段的完整逻辑模型与规范行 */
export type DataView = Readonly<{
  /** 当前阶段实际输出的行 */
  rows: Array<ExternalRow>;
  /** 唯一字段事实源；未定类型字段仍存在，分类顺序随作用域保留 */
  model: DataTransformModel;
}>;

/** 运行时字段规范值；不含 boolean / null，是 `coerceValue` 与自定义 `parse` 的输出域 */
export type ParsedFieldValue = string | number | undefined;

/**
 * 单字段解析结果，运行时使用，不进 IR
 * @description `type` 覆盖最终字段测量类型；`parse` 覆盖内置 coercion，返回 undefined 表示该值不可用
 */
export type FieldResolution = {
  /** 覆盖最终字段类型；省略则用 model 声明 / 自动推断 */
  type?: DataFieldType;
  /** 覆盖内置 coercion：原始值 -> 运行时字段规范值；返回 undefined 跳过该值 */
  parse?: (raw: unknown) => ParsedFieldValue;
};

/**
 * 程序化字段解析逃生舱，运行时函数，不进 IR
 * @description 按字段名返回类型覆盖与可选自定义解析；返回 undefined 时保留已有的模型或格式解析结果
 * @param field 当前逻辑字段名
 * @param context 数据集名称、映射后的物理路径及模型显式声明的类型
 * @returns 字段覆盖；返回 undefined 不作覆盖。提供 parse 时必须同时返回 type 或在模型中显式声明类型
 */
export type ResolveField = (
  field: string,
  context: { dataReference: string; physicalPath: string; declaredType?: DataFieldType },
) => FieldResolution | undefined;

/** transform/source-field 收集器；只承载 data 层字段名，不理解宿主 channel 结构 */
export type FieldCollector = {
  /** 登记单个字段名；undefined 会被调用方忽略 */
  addField: (field: string | undefined) => void;
  /** 批量登记字段名；undefined 会被调用方忽略 */
  addFields: (...fields: Array<string | undefined>) => void;
};
