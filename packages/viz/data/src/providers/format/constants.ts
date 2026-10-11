import { BuiltinDataFieldFormat } from '../../schemas';

/** 内置格式名只读集合；供公开诊断与 `isBuiltinFieldFormat` 查询 */
export const BUILTIN_FIELD_FORMATS: ReadonlySet<string> = new Set(Object.values(BuiltinDataFieldFormat));
