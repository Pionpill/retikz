import type { AnyInspectorDefinitionInput } from '../contract';
import { CLIP_INSPECTOR } from './clip';
import { COORDINATE_INSPECTOR } from './coordinate';
import { NODE_INSPECTOR } from './node';
import { PATH_INSPECTOR } from './path';
import { SCOPE_INSPECTOR } from './scope';

/** 默认 registry 使用的内置 Inspector definitions */
export const BUILTIN_INSPECTORS: ReadonlyArray<AnyInspectorDefinitionInput> = Object.freeze([
  PATH_INSPECTOR,
  NODE_INSPECTOR,
  CLIP_INSPECTOR,
  SCOPE_INSPECTOR,
  COORDINATE_INSPECTOR,
]);
