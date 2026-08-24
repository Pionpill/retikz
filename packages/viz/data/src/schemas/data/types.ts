import type { ValueOf } from '@retikz/foundation';
import type { infer as ZodInfer } from 'zod';

import type { DataFieldFormat, DataFieldType, FieldOrderMode } from './constants';
import type {
  DataModelSchema,
  DataReferenceSchema,
  FieldDefinitionSchema,
  FieldFormatSchema,
  ScalarValueSchema,
} from './schema';

/** 字段测量类型取值 */
export type DataFieldTypeValue = ValueOf<typeof DataFieldType>;

/** 分类字段顺序策略取值 */
export type FieldOrderModeValue = ValueOf<typeof FieldOrderMode>;

/** 内置字段值解析格式名取值 */
export type DataFieldFormatValue = ValueOf<typeof DataFieldFormat>;

/** 字段解析格式名：内置关键字或自定义注册名，运行时由 format registry 解析为 parser */
export type FieldFormatValue = ZodInfer<typeof FieldFormatSchema>;

/** 字段声明：逻辑字段名、可选测量类型、可选解析格式和可选分类顺序 */
export type IRDataFieldDefinition = ZodInfer<typeof FieldDefinitionSchema>;

/** 数据模型：IR 内可选字段声明数组，用于 strict 引用校验与 type-driven 推断 */
export type IRDataModel = ZodInfer<typeof DataModelSchema>;

/** IR 数据槽位：具名数据集引用与可选模型；真实数据值由宿主运行时注入 */
export type IRDataReference = ZodInfer<typeof DataReferenceSchema>;

/** 标量值：字段路径解析叶子、scale 映射输入和 channel 常量字面量的共同 JSON 域 */
export type IRDataScalarValue = ZodInfer<typeof ScalarValueSchema>;
