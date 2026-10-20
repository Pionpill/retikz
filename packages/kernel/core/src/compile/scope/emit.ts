import type { ScenePrimitive } from '../../contract';
import type { EffectiveScopeDefaults } from '../../resolve';
import { resolveScopeFrame } from '../../resolve';
import type { ResolvedTheme } from '../../shared';
import type { CompileEnvironment } from '../environment';
import type { NodeLayout } from '../node';
import { emitNodePrimitives } from '../node';
import type { PaintResolver } from '../resource';
import type { ScopeCompileInput } from './compile';

/** 输出 Scope 自身外框，不加入可引用包络 */
export const emitScopeFrame = (
  child: ScopeCompileInput,
  intrinsicLayout: NodeLayout,
  scopeDefaults: EffectiveScopeDefaults,
  mode: ResolvedTheme['mode'],
  environment: Pick<CompileEnvironment, 'patterns' | 'round'>,
  resolvePaint: PaintResolver,
  irPath: string,
): Array<ScenePrimitive> => {
  if (child.frame === undefined) return [];
  const appearance = resolveScopeFrame(child.frame, scopeDefaults, {
    mode,
    patterns: environment.patterns,
    round: environment.round,
    irPath: `${irPath}.frame`,
  });
  const { padding, fill, stroke, ...style } = appearance;
  const frameLayout: NodeLayout = {
    ...intrinsicLayout,
    node: { ...intrinsicLayout.node, ...style, id: undefined, fill, stroke },
    geometry: {
      ...intrinsicLayout.geometry,
      rect: {
        ...intrinsicLayout.geometry.rect,
        width: intrinsicLayout.geometry.rect.width + 2 * padding,
        height: intrinsicLayout.geometry.rect.height + 2 * padding,
      },
    },
  };
  return emitNodePrimitives(frameLayout, environment.round, resolvePaint).map(primitive => ({
    ...primitive,
    hitTest: false,
  }));
};
