import type { AnyInspectorDefinition } from '../../contract';

import { STROKE_PATH_INSPECTOR } from './stroke-path';

/** 默认 registry 使用的内置 Inspector definitions */
export const BUILTIN_INSPECTORS: ReadonlyArray<AnyInspectorDefinition> = Object.freeze([STROKE_PATH_INSPECTOR]);
