import type { CompiledSceneFragment } from '../../contract';
import type { IRChild } from '../../schemas';
import type { CompileContext } from './context';
import type { PendingCompileObservation } from './types';

import { safeErrorMessage } from '../../resolve/diagnostics';
import { CompileWarningCode } from '../constants';
import { createClipRegistry, createPaintRegistry } from '../resource';
import { assertFiniteLayout, computeLayoutFromBounds } from '../scene';
import { orderCompileWarnings } from './diagnostics';
import { compileChildrenToPrimitives } from './traversal';

/** 辅助片段中必须提升为隔离编译失败的引用与 provider warning */
const fatalFragmentWarningCodes = new Set<string>([
  CompileWarningCode.CompositeNotRegistered,
  CompileWarningCode.UnresolvedNodeReference,
  CompileWarningCode.OffsetBaseUnresolved,
  CompileWarningCode.PolarOriginUnresolved,
  CompileWarningCode.AtTargetUnresolved,
]);

/** 编译一个不回写 primary 的 occurrence-local IR 片段 */
export const compileObservedFragment = (
  entry: PendingCompileObservation,
  children: IRChild | ReadonlyArray<IRChild>,
  context: CompileContext,
): CompiledSceneFragment => {
  const values = Array.isArray(children) ? children : [children];
  const warnings: Array<Parameters<CompileContext['onWarn']>[0]> = [];
  const paint = createPaintRegistry(context.round);
  const clip = createClipRegistry(context.round, context.clips, context.maxClipDepth);
  const sandbox: CompileContext = {
    ...context,
    observation: undefined,
    trace: undefined,
    paint,
    clip,
    onWarn: warning => {
      if (fatalFragmentWarningCodes.has(warning.code)) {
        throw new Error(`${warning.code} at ${warning.path}: ${warning.message}`);
      }
      warnings.push({
        ...warning,
        origin: {
          kind: 'observation',
          owner: entry.owner,
          occurrence: entry.occurrence,
          stage: 'fragment',
        },
      });
    },
  };

  try {
    const compiled = compileChildrenToPrimitives(values, sandbox, {
      styleStack: entry.styleStack,
      theme: entry.theme,
      generated: true,
    });
    const resources = [...paint.resources(), ...clip.resources()];
    const scene = {
      primitives: compiled.primitives,
      layout: assertFiniteLayout(computeLayoutFromBounds(compiled.layoutBounds, 0, context.round)),
      ...(resources.length === 0 ? {} : { resources }),
    };
    return Object.freeze({
      scene,
      artifacts: Object.freeze(compiled.artifacts),
      diagnostics: Object.freeze(orderCompileWarnings(warnings)),
    });
  } catch (cause) {
    throw new Error(
      `Observation fragment failed for ${entry.owner.kind} at ${entry.occurrence.sourcePath}: ${safeErrorMessage(cause, 'fragment compile failed')}`,
      { cause },
    );
  }
};
