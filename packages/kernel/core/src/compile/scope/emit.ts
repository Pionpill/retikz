import type { PropertyPath } from '@retikz/foundation';

import type { GroupPrimitive, SceneClipPath, Transform } from '../../contract';
import { resolveClip } from '../../resolve';
import type { ClipResolveContext } from '../../resolve';
import type { ClipRegistry } from '../resource';
import type { InputScopeCompile } from './types';

/** Scope 自身分组属性所需的裁剪能力 */
export type ScopeEmitContext = Readonly<{
  /** 裁剪定义解析 */
  clipRegistry: ClipResolveContext['clipRegistry'];
  /** 登记已确定的裁剪 */
  registerClip: ClipRegistry['register'];
  /** 登记预解析的裁剪路径 */
  registerClipPath: ClipRegistry['registerPath'];
}>;

/** 生成 Scope 自身的绘制属性，子图元与名称发布由调用方组织 */
export const createScopeGroup = (
  input: Pick<InputScopeCompile, 'id' | 'meta' | 'clip'>,
  transforms: ReadonlyArray<Transform>,
  context: ScopeEmitContext,
  irPath: PropertyPath,
  resolvedClipPath?: SceneClipPath,
): Omit<GroupPrimitive, 'children' | 'animations'> => {
  const group: Omit<GroupPrimitive, 'children' | 'animations'> = { type: 'group' };
  if (input.id !== undefined) group.id = input.id;
  if (input.meta !== undefined) group.meta = input.meta;
  if (transforms.length > 0) group.transforms = [...transforms];
  if (resolvedClipPath !== undefined) {
    group.clipRef = context.registerClipPath(resolvedClipPath);
  } else if (input.clip !== undefined) {
    group.clipRef = context.registerClip(
      resolveClip(input.clip, {
        clipRegistry: context.clipRegistry,
        irPath: [...irPath, 'clip'],
      }),
    );
  }
  return group;
};
