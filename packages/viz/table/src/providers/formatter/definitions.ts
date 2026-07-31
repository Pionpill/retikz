import type { AnyCellFormatterDefinition } from '../../contract';

import { BOOLEAN_CELL_FORMATTER } from './boolean';
import { IDENTITY_CELL_FORMATTER } from './identity';
import { NUMBER_CELL_FORMATTER } from './number';

/** 内置 Cell formatter definitions */
export const BUILTIN_CELL_FORMATTERS: ReadonlyArray<AnyCellFormatterDefinition> = [
  IDENTITY_CELL_FORMATTER,
  NUMBER_CELL_FORMATTER,
  BOOLEAN_CELL_FORMATTER,
];
