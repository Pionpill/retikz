import type { FieldFormatDefinition } from './types';

/**
 * 定义一个字段解析格式 definition。
 * @description 内置与自定义格式经同一 registry 入口分派；spec 里仍只写 `{ name, format }` JSON。
 * @remarks 当前 helper 只做 `FieldFormatDefinition` 类型约束并原样返回定义对象；保留稳定入口是为了与其它 registry API 对齐，并为未来运行时校验、默认值归一或泛型收敛预留空间。
 */
export const defineFieldFormat = (def: FieldFormatDefinition): FieldFormatDefinition => def;
