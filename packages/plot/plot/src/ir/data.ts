import { z } from 'zod';
import type { ValueOf } from '@retikz/core';

/**
 * 字段类型关键字（暴露给用户；成员值即字段类型串，裸字面量 `'quantitative'` 同样可用）
 * @description grammar-of-graphics 标准字段类型；驱动 lowering 的缺省推断、type-driven scale 选型与 guide 格式化
 */
export const PlotFieldType = {
  /** 定量：连续可度量、间距有意义的数值（销量 / 温度 / 价格），默认 linear scale */
  Quantitative: 'quantitative',
  /** 名义：无序分类标签（国家 / 颜色名），只判等无大小 */
  Nominal: 'nominal',
  /** 有序分类：有序但间距无意义的类别（低 / 中 / 高、评级），保序离散映射 */
  Ordinal: 'ordinal',
  /** 时间：日期 / 时间戳，走 time scale */
  Temporal: 'temporal',
  /** 归一比例：[0,1] 区间的占比（pie value / ternary 分量），走 linear scale（domain 默认 [0,1]） */
  Proportion: 'proportion',
} as const;

/** 字段测量类型 */
export type FieldType = ValueOf<typeof PlotFieldType>;

export const FieldDefSchema = z
  .object({
    name: z
      .string()
      .min(1)
      .describe('Field name as referenced by encoding channels (a path accessor like "a.b.c")'),
    type: z
      .nativeEnum(PlotFieldType)
      .describe('Field measurement type; drives default type inference, type-driven scale selection and guide formatting at lowering'),
  })
  .describe('One field declaration: a field name plus its measurement type');

export const DataModelSchema = z
  .array(FieldDefSchema)
  .describe(
    'Optional declaration of the external data fields and their types; enables encoding validation and scale-type inference without seeing the data. Omit to infer from the bound dataset at lowering.',
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
