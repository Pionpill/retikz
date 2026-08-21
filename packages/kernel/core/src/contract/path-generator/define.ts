import { assertNonEmptyString } from '@retikz/foundation';

import type { PathGeneratorDefinition } from './types';

/**
 * 定义 path generator 注册项
 * @remarks generator 输出的 JSON-safe 校验仍由 compile 阶段负责
 * @throws 当 name 为空时
 */
export const definePathGenerator = (def: PathGeneratorDefinition): PathGeneratorDefinition => {
  assertNonEmptyString(def.name, 'definePathGenerator: name');
  return def;
};
