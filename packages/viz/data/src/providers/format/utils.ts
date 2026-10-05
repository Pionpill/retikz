import type { DataFieldFormat } from '../../schemas';
import { BUILTIN_FIELD_FORMATS } from './constants';

/** 是否内置格式名（收窄到 DataFieldFormat） */
export const isBuiltinFieldFormat = (format: string): format is DataFieldFormat => BUILTIN_FIELD_FORMATS.has(format);
