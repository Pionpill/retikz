import type { BuiltinDataFieldFormat } from '../../schemas';
import { BUILTIN_FIELD_FORMATS } from './constants';

/** 是否内置格式名（收窄到 BuiltinDataFieldFormat） */
export const isBuiltinFieldFormat = (format: string): format is BuiltinDataFieldFormat =>
  BUILTIN_FIELD_FORMATS.has(format);
