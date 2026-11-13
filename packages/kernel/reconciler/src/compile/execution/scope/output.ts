import type { CanonicalScope, CompiledScope, CompileWarning, ScopeCompileContext } from '@retikz/core';
import { compileScope, resolveAnimations } from '@retikz/core';
import { jsonStructuralEquals } from '@retikz/foundation';

import { shouldEmitScopeGroup } from './group';

/** 按最终子输出绑定分组动画；布局与裁剪继续使用已完成的 Core 产物 */
export const bindScopeOutputAnimations = (
  canon: CanonicalScope,
  compiled: CompiledScope,
  childCount: number,
  context: ScopeCompileContext,
): { compiled: CompiledScope; diagnostics: Array<CompileWarning> } => {
  const diagnostics: Array<CompileWarning> = [];
  const animations = shouldEmitScopeGroup(
    childCount,
    compiled.layout.overall.transforms,
    compiled.emit.overall.id,
    compiled.emit.overall.clipRef !== undefined,
  )
    ? (resolveAnimations(canon.animations, {
        target: 'element',
        irPath: context.irPath,
        onWarn: warning => diagnostics.push(warning),
      }) ?? [])
    : [];
  return {
    compiled: jsonStructuralEquals(compiled.emit.overall.animations ?? [], animations)
      ? compiled
      : compileScope(
          canon,
          { ...context, animations },
          { layout: compiled.layout, emit: { clip: compiled.emit.clip ?? { clipRef: compiled.emit.overall.clipRef } } },
        ),
    diagnostics,
  };
};
