import type { z } from 'zod';

import type { IRChild } from './scene/types';

import { RetikzCoreError, RetikzCoreErrorCode } from '../error';

let recursiveChildSchema: z.ZodType<IRChild> | null = null;

/**
 * 注册 scope.children 使用的完整递归 child schema
 * @description 仅供 schemas owner 内部装配 Scene 与 Scope 的双向递归关系，不通过公共 barrel 导出
 */
export const registerRecursiveChildSchema = (schema: z.ZodType<IRChild>): void => {
  recursiveChildSchema = schema;
};

/**
 * 读取已注册的递归 child schema
 * @description 由 ScopeSchema 的 lazy 分支在实际解析 children 时调用
 */
export const getRecursiveChildSchema = (): z.ZodType<IRChild> => {
  if (!recursiveChildSchema) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Schema,
      'ScopeSchema: ChildSchema not registered yet; ensure scene schema is loaded',
    );
  }

  return recursiveChildSchema;
};
