import type { z } from 'zod';

import type { DataFieldTypeValue } from './constants';
import type { DataModelSchema, DataRefSchema, FieldDefSchema, FieldFormatSchema, ScalarValueSchema } from './schema';

/** 字段解析格式：内置关键字或自定义注册名（求值期解析为 parser）。 */
export type FieldFormatValue = z.infer<typeof FieldFormatSchema>;

/** 字段声明：名 + 测量类型 */
export type FieldDef = z.infer<typeof FieldDefSchema>;
/** 数据模型：字段声明数组（可选进 IR） */
export type DataModel = z.infer<typeof DataModelSchema>;
/** IR 数据槽位：具名引用 + 可选模型，无数据值 */
export type DataRef = z.infer<typeof DataRefSchema>;
/** 标量值：scale 映射输入、channel 常量字面量 */
export type ScalarValue = z.infer<typeof ScalarValueSchema>;

/** 逻辑字段名到字段测量类型的运行时映射；由 data.model / 自动推断 / resolver 合成，不进入 IR。 */
export type DataFieldTypeMap = Map<string, DataFieldTypeValue>;

/**
 * 外部数据行（不进 IR）
 * @description 运行时由宿主 lowering pipeline 注入的任意 JS 记录（可嵌套）；field 路径对其解析、结果须为标量。
 */
export type ExternalRow = Record<string, unknown>;
/**
 * 外部数据集表（不进 IR）
 * @description 数据集名 -> 行数组；data.reference 按名查此表。
 */
export type ExternalDatasets = Record<string, Array<ExternalRow>>;
