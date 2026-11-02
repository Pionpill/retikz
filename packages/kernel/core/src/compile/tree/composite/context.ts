import type { PropertyPath } from '@retikz/foundation';
import { formatPropertyPath } from '@retikz/foundation';

import type { CompositeBoundChild, CompositeCompileContext, CompositeRuntimeInputContext } from '../../../contract';
import { naturalLayoutProposal, captureCompositeInputScope, selectCompositeInputScope } from '../../../contract';
import { resolveTheme } from '../../../resolve';
import type { IRChild } from '../../../schemas';
import type { TreeCompileFrame } from '../frame';
import { raiseLayoutChildFailure } from './failure';
import { createCompositeBoundChild, createCompositeReplayChild, createCompositeScopeChild } from './handle';
import { createCompositeMeasurementMethods } from './measurement';
import type { CompositeProbeSequence } from './measurement';
import type { CompositeProbeContext } from './probe';
import { cloneLayoutProposal } from './proposal';
import { createCompositeTargetQuery } from './target-query';

/** 装配一次 Composite 作者回调的环境，派生主题共享句柄与探测序号 */
export const createCompositeCallbackContext = (
  child: Extract<IRChild, { namespace: string }>,
  frame: TreeCompileFrame,
  compositeIrPath: PropertyPath,
  probeContext: CompositeProbeContext,
  evaluation: CompositeCompileContext['evaluation'],
) => {
  const { context, owner, key, occurrence } = probeContext;
  const sourceInputs = frame.runtimeInputs ?? { source: child, bindings: [] };
  const authoredChildren = new Map<string, CompositeBoundChild>();
  const runtimeInputContext: CompositeRuntimeInputContext = Object.freeze({
    runtimeInput: sourceInputs.bindings.find(input => input.path.length === 0)?.input,
    selectSourceChild: path => {
      const pathKey = JSON.stringify(path);
      const existing = authoredChildren.get(pathKey);
      if (existing !== undefined) return existing;

      const selected = createCompositeBoundChild(context.session, owner, selectCompositeInputScope(sourceInputs, path));
      authoredChildren.set(pathKey, selected);

      return selected;
    },
    bindChild: (nextChild, inputs) =>
      createCompositeBoundChild(context.session, owner, captureCompositeInputScope(nextChild, inputs)),
  });

  /** 当前作者回调的探测序号，所有派生主题共用 */
  const probeSequence: CompositeProbeSequence = { index: 0 };
  const targetQuery = createCompositeTargetQuery(probeContext, frame, probeSequence);
  /** 装配继承指定主题的作者能力视图 */
  const createLayoutContext = (theme: TreeCompileFrame['theme']): CompositeCompileContext => ({
    ...runtimeInputContext,
    theme,
    withTheme: override =>
      createLayoutContext(
        resolveTheme(
          theme,
          override,
          formatPropertyPath([...compositeIrPath, 'theme']),
          context.shared.registries.themeRegistry,
        ),
      ),
    proposal: cloneLayoutProposal(frame.childProposal ?? naturalLayoutProposal, key, occurrence),
    evaluation: { ...evaluation },
    ...createCompositeMeasurementMethods(probeContext, frame, probeSequence, theme),
    resolvePathTargets: query => targetQuery.resolve(theme, query),
    warn: (code, message, subPath) =>
      context.workspace.diagnostics.collect({
        code,
        message,
        path: subPath === undefined || subPath.length === 0 ? compositeIrPath : [...compositeIrPath, ...subPath],
      }),
    replay: (layoutResult, wrapper) => createCompositeReplayChild(context.session, owner, layoutResult, wrapper),
    raise: failure => raiseLayoutChildFailure(context.session.failures, owner, failure),
    createScope: (props, children) => createCompositeScopeChild(context.session, owner, props, children),
  });
  return { createContext: createLayoutContext, dispose: targetQuery.clear };
};
