import { assertNonEmptyString } from '@retikz/foundation';

import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import type { PathGeneratorDefinition } from './types';

/**
 * 定义 path generator 注册项
 * @param def 路径生成器名称、参数 schema 及命令生成函数组成的定义
 * @returns 校验名称后的原定义对象，不复制或修改输入
 * @remarks generator 输出的 JSON-safe 校验仍由 compile 阶段负责
 * @throws RetikzCoreError 当 name 为空或仅含空白字符时
 */
export const definePathGenerator = (def: PathGeneratorDefinition): PathGeneratorDefinition => {
  assertNonEmptyString(
    def.name,
    'definePathGenerator: name',
    new RetikzCoreError(RetikzCoreErrorCode.Contract, 'definePathGenerator: name must be a non-empty string.'),
  );
  return def;
};
