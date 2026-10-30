import type { PropertyPath } from '@retikz/foundation';

import type { GroupPrimitive, SceneClipPath, Transform } from '../../contract';
import { resolveClip } from '../../resolve/resource';
import { filterAnimations } from '../animation';
import type { SharedCompileContext, WorkspaceCompileContext } from '../context';
import type { InputScopeCompile } from './geometry';

/** 生成 Scope 自身的绘制属性，子图元与名称发布由调用方组织 */
export const createScopeGroup = (
  input: InputScopeCompile,
  transforms: ReadonlyArray<Transform>,
  shared: SharedCompileContext,
  workspace: WorkspaceCompileContext,
  irPath: PropertyPath,
  resolvedClipPath?: SceneClipPath,
): Omit<GroupPrimitive, 'children'> => {
  const group: Omit<GroupPrimitive, 'children'> = { type: 'group' };
  if (input.id !== undefined) group.id = input.id;
  if (input.meta !== undefined) group.meta = input.meta;
  if (transforms.length > 0) group.transforms = [...transforms];
  const animations = filterAnimations(input.animations, {
    target: 'element',
    onWarn: workspace.diagnostics.collect,
    irPath,
  });
  if (animations !== undefined) group.animations = animations;
  if (resolvedClipPath !== undefined) {
    group.clipRef = workspace.clipRegistry.importPath(resolvedClipPath);
  } else if (input.clip !== undefined) {
    group.clipRef = workspace.clipRegistry.register(
      resolveClip(input.clip, {
        clipRegistry: shared.registries.clipRegistry,
        irPath: [...irPath, 'clip'],
      }),
    );
  }
  return group;
};
