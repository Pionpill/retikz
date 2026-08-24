import { DataFieldFormat } from '../../schemas';
import { createReadonlySet } from '../../shared/collections';

/** 内置格式名只读集合；供公开诊断与 `isBuiltinFieldFormat` 查询 */
export const BUILTIN_FIELD_FORMATS: ReadonlySet<string> = createReadonlySet(Object.values(DataFieldFormat));
