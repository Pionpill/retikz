import type { DataFieldFormatValue } from '../../schemas';

import { BUILTIN_FIELD_FORMATS } from './constants';

/** 是否内置格式名（收窄到 DataFieldFormatValue） */
export const isBuiltinFieldFormat = (format: string): format is DataFieldFormatValue =>
  BUILTIN_FIELD_FORMATS.has(format);
