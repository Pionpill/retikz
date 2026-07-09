import type { ValueOf } from '@retikz/core';
import type { z } from 'zod';

import type { DataFieldType, FieldOrderMode } from './constants';
import type {
  DataModelSchema,
  DataReferenceSchema,
  FieldDefinitionSchema,
  FieldFormatSchema,
  ScalarValueSchema,
} from './schema';

/** 字段测量类型取值。 */
export type DataFieldTypeValue = ValueOf<typeof DataFieldType>;

/** 分类字段顺序策略取值。 */
export type FieldOrderModeValue = ValueOf<typeof FieldOrderMode>;

/** 字段解析格式名：内置关键字或自定义注册名，运行时由 format registry 解析为 parser。 */
export type FieldFormatValue = z.infer<typeof FieldFormatSchema>;

/** 字段声明：逻辑字段名、可选测量类型、可选解析格式和可选分类顺序。 */
export type FieldDef = z.infer<typeof FieldDefinitionSchema>;

/** 数据模型：IR 内可选字段声明数组，用于 strict 引用校验与 type-driven 推断。 */
export type DataModel = z.infer<typeof DataModelSchema>;

/** IR 数据槽位：具名数据集引用与可选模型；真实数据值由宿主运行时注入。 */
export type DataRef = z.infer<typeof DataReferenceSchema>;

/** 标量值：字段路径解析叶子、scale 映射输入和 channel 常量字面量的共同 JSON 域。 */
export type ScalarValue = z.infer<typeof ScalarValueSchema>;

/** 逻辑字段名到字段测量类型的运行时映射；由 data.model、自动推断和 resolver 合成，不进入 IR。 */
export type DataFieldTypeMap = Map<string, DataFieldTypeValue>;

/**
 * 外部数据行。
 * @description 运行时由宿主 lowering pipeline 注入的任意 JS 记录（可嵌套）；field 路径对其解析、结果须为标量。
 */
export type ExternalRow = Record<string, unknown>;

/**
 * 外部数据集表。
 * @description 数据集名 -> 行数组；data.reference 按名查此表。
 */
export type ExternalDatasets = Record<string, Array<ExternalRow>>;
