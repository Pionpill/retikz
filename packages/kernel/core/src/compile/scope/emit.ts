import type { GroupPrimitive } from '../../contract';
import type { ClipRegistry } from '../resource';
import type { CompiledScope } from './types';

/** Scope 编译时登记最终裁剪资源的能力 */
export type ScopeEmitContext = Readonly<{
  /** 登记已绑定的裁剪 */
  registerClip: ClipRegistry['register'];
  /** 登记已生成的裁剪路径 */
  registerClipPath: ClipRegistry['registerPath'];
}>;

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
