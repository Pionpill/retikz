import type { GroupPrimitive } from '../../contract';
import type { CompiledScope } from './types';

/** 从最终编译结果生成 Scope 分组属性 */
export const createScopeGroup = (compiled: CompiledScope): Omit<GroupPrimitive, 'children'> => {
  const { style, clip, animations, transforms } = compiled;
  return {
    type: 'group',
    ...(style.id === undefined ? {} : { id: style.id }),
    ...(style.meta === undefined ? {} : { meta: style.meta }),
    ...(transforms.length === 0 ? {} : { transforms }),
    ...(clip === undefined ? {} : { clipRef: clip }),
    ...(animations.length === 0 ? {} : { animations }),
  };
};
