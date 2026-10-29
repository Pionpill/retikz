import type { InputAnyInspectorDefinition } from '../contract';
import { CLIP_INSPECTOR } from './clip';
import { GROUP_INSPECTOR } from './group';
import { PATH_INSPECTOR } from './path';

/** 内置与第三方共用的默认定义集合 */
export const BUILTIN_INSPECTORS: ReadonlyArray<InputAnyInspectorDefinition> = Object.freeze([
  PATH_INSPECTOR,
  GROUP_INSPECTOR,
  CLIP_INSPECTOR,
]);
