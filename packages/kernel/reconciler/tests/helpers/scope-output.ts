import type { GroupPrimitive, ScenePrimitive, IRScope, CompileOutput, CompileWarning } from '@retikz/core';
import { resolveAnimations, projectScopeOutputBounds, calculateBoundsOfPrimitives } from '@retikz/core';
import type { PropertyPath } from '@retikz/foundation';
import type { CompileOwnerKey } from '@retikz/reconciler';

import type { CompileOutputContext, CompileProvenanceTracker } from '../../src/compile';
import { assembleCompileOutputs } from '../../src/compile';
import { shouldEmitScopeGroup } from '../../src/compile/tree/scope/group';

/** Scope 绘制阶段产物，与几何阶段结果分别保存 */
export type ScopeOutput = {
  /** 不含后代的分组包装属性 */
  group: Omit<GroupPrimitive, 'children' | 'animations'>;
  /** 自身图元、资源及绘制顺序 */
  output: CompileOutput;
};

/** Scope 组装所需的资源能力及诊断出口 */
export type ScopeOutputContext = CompileOutputContext & {
  /** 接收本次输出诊断 */
  onWarn: (warning: CompileWarning) => void;
};

/** 用已编译 Scope 包装有序子输出，不在缓存状态中保存重复子树 */
export const assembleScopeOutput = (
  scope: ScopeOutput,
  children: ReadonlyArray<CompileOutput>,
  context: ScopeOutputContext,
  input: Pick<IRScope, 'animations'>,
  irPath: PropertyPath = [],
  provenance?: CompileProvenanceTracker,
  owner?: CompileOwnerKey,
): CompileOutput => {
  const ownGroup = { ...scope.group, children: scope.output.primitives };
  const childOutput = assembleCompileOutputs(children, context);
  const merged = assembleCompileOutputs(
    [childOutput, { ...scope.output, zIndex: undefined, primitives: [ownGroup] }],
    context,
  );
  const group = merged.primitives[merged.primitives.length - 1] as typeof ownGroup;
  const frame = group.children;
  const nested = merged.primitives.slice(0, -1);
  const animations = resolveAnimations(input.animations, { target: 'element', onWarn: context.onWarn, irPath });
  const primitive = shouldEmitScopeGroup(
    frame.length + nested.length,
    group.transforms ?? [],
    group.id,
    group.clipRef !== undefined,
  )
    ? { ...group, animations, children: [...frame, ...nested] }
    : undefined;
  const primitives: Array<ScenePrimitive> = primitive === undefined ? [] : [primitive];
  if (owner !== undefined) provenance?.recordPrimitives(primitives, owner, 'scope');
  const bounds = projectScopeOutputBounds(
    children.flatMap(child => child.bounds),
    group,
    merged.resources,
  );
  const decoration = calculateBoundsOfPrimitives([{ ...group, children: frame }], merged.resources);
  if (decoration !== undefined) {
    const { x, y, width, height } = decoration;
    bounds.push({
      decoration: true,
      boundsPoints: [
        [x, y],
        [x + width, y],
        [x, y + height],
        [x + width, y + height],
      ],
    });
  }
  return Object.freeze({
    primitives,
    resources: merged.resources,
    bounds,
    zIndex: scope.output.zIndex,
  });
};
