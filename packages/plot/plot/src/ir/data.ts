import { z } from 'zod';
import type { ValueOf } from '@retikz/core';

/**
 * 字段类型关键字（暴露给用户；成员值即字段类型串，裸字面量 `'continuous'` 同样可用）
 * @description 字段测量种类；驱动 lowering 的缺省推断、type-driven scale 选型与 guide 格式化
 */
export const PlotFieldType = {
  /** 连续：可度量、间距有意义的数值（销量 / 温度 / 价格 / 占比），默认 linear scale */
  Continuous: 'continuous',
  /** 分类：离散类别标签（国家 / 颜色名 / 评级），只判等不取间距，默认 band scale */
  Categorical: 'categorical',
  /** 时间：日期 / 时间戳，走 time scale */
  Temporal: 'temporal',
} as const;

/** 字段测量类型 */
export type FieldType = ValueOf<typeof PlotFieldType>;

/**
 * 字段值解析格式关键字（暴露给用户；成员值即格式串，裸字面量 `'percent'` 同样可用）
 * @description 声明式（进 IR、可序列化）的内置解析覆盖；每个格式唯一绑定一个 type（temporal / continuous），
 *   省略 type 时由格式蕴含 type；解析优先级 resolveField.parse > FieldDef.format > 内置默认 coerce
 */
export const PlotFieldFormat = {
  /** temporal：严格 ISO（默认，等价不写 format） */
  Iso: 'iso',
  /** temporal：数值 / 数值串按 epoch 秒 → 毫秒（*1000） */
  EpochSeconds: 'epochSeconds',
  /** temporal：数值 / 数值串按 epoch 毫秒 */
  EpochMillis: 'epochMillis',
  /** temporal：严格 YYYY/MM/DD 斜杠日期，按 UTC 零点转 epoch ms（不收 D/M/Y、M/D/Y 等地区歧义布局） */
  SlashDate: 'slashDate',
  /** continuous：宽松数字串（容前后空白 / 千分位逗号），默认仅严格数字串 */
  NumberString: 'numberString',
  /** continuous：百分比串 '50%' → 0.5 */
  Percent: 'percent',
} as const;

/** 字段值解析格式 */
export type FieldFormat = ValueOf<typeof PlotFieldFormat>;

export const FieldDefSchema = z
  .object({
    name: z
      .string()
      .min(1)
      .describe('Field name as referenced by encoding channels (a path accessor like "a.b.c")'),
    type: z
      .nativeEnum(PlotFieldType)
      .optional()
      .describe('Field measurement type; omit to infer from the bound dataset at lowering. When given, drives type-driven scale selection and guide formatting without seeing the data'),
    format: z
      .nativeEnum(PlotFieldFormat)
      .optional()
      .describe('Declarative built-in value-parsing format; each format binds to one measurement type and must be compatible with type (it also implies type when type is omitted). Omit for the built-in default coercion'),
    order: z
      .union([z.enum(['data', 'ascending', 'descending']), z.array(z.union([z.string(), z.number()])).min(1)])
      .optional()
      .describe(
        "Category order for a categorical field: data appearance (default), ascending/descending sort, or an explicit value list. A non-default order marks the field as ordered. Drives the categorical domain for both band/point position and ordinal color, keeping position and color in the same order. Only valid on categorical fields; values present in the data but absent from an explicit list are appended at the end",
      ),
  })
  .describe('One field declaration: a field name, optionally its measurement type (inferred from data when omitted) and a declarative value-parsing format');

export const DataModelSchema = z
  .array(FieldDefSchema)
  .describe(
    'Optional declaration of the external data fields. Listing a field name enables strict reference checking and portable field binding; a given field type also validates and selects scales without seeing the data, while fields with the type omitted are inferred from the bound dataset at lowering. Omit the whole model to infer everything.',
  );

export const DataRefSchema = z
  .object({
    reference: z
      .string()
      .min(1)
      .describe(
        'Name of an externally-supplied dataset; resolved against lowerPlots(datasets) at compile time. The dataset values never enter the IR.',
      ),
    model: DataModelSchema.optional().describe('Optional data model (field declarations)'),
  })
  .describe('Data binding stored in the IR: a named dataset reference plus an optional model. Carries no data values.');

export const ScalarValueSchema = z
  .union([z.string(), z.number(), z.boolean(), z.null()])
  .describe(
    'A single scalar value: string / number / boolean / null. The leaf a field path must resolve to, and the literal type of a constant channel.',
  );

/** 字段声明：名 + 测量类型 */
export type FieldDef = z.infer<typeof FieldDefSchema>;
/** 数据模型：字段声明数组（可选进 IR） */
export type DataModel = z.infer<typeof DataModelSchema>;
/** IR 数据槽位：具名引用 + 可选模型，无数据值 */
export type DataRef = z.infer<typeof DataRefSchema>;
/** 标量值：scale 映射输入、channel 常量字面量 */
export type ScalarValue = z.infer<typeof ScalarValueSchema>;

/**
 * 外部数据行（不进 IR）
 * @description 运行时经 lowerPlots 注入的任意 JS 记录（可嵌套）；encoding 的 field 路径对其解析、结果须为标量
 */
export type ExternalRow = Record<string, unknown>;
/**
 * 外部数据集表（不进 IR）
 * @description 数据集名 → 行数组；data.reference 按名查此表
 */
export type ExternalDatasets = Record<string, Array<ExternalRow>>;
