import type { AnyCellPresentationDefinition } from '../../contract';

import { TEXT_CELL_PRESENTATION } from './text';

/** 内置 Cell presentation definitions */
export const BUILTIN_CELL_PRESENTATIONS: ReadonlyArray<AnyCellPresentationDefinition> = [TEXT_CELL_PRESENTATION];
