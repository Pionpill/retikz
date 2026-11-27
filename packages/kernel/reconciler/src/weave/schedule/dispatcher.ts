import type { CompileOccurrenceLocator } from '@retikz/core';
import { jsonStructuralEquals } from '@retikz/foundation';

import type { CompositeElementDispatcher } from '../../compile/execution/shared';
import { captureWeaveContribution, materializeWeaveContribution } from '../contribution';
import {
  executeWeaveNode,
  executeWeaveCoordinate,
  executeWeavePath,
  executeWeaveScope,
  resolveWeaveScope,
} from '../element';
import type { WeaveCompositeStage } from '../shared';
import { createWeaveOutputState, appendWeaveOutput } from './output';

/** 创建本轮的生成输出缓存，不修改已提交阶段 */
export const createWeaveCompositeStage = (): WeaveCompositeStage => ({
  scopeBlocks: new Map(),
  probes: new Map(),
  nodes: new Map(),
  paths: new Map(),
  coordinates: new Map(),
  scopes: new Map(),
});

/** 将生成元素对接到作者元素的阶段，隔离试算和变换后重放的同一位置 */
export const createCompositeElementDispatcher = (
  current: WeaveCompositeStage | undefined,
  next: WeaveCompositeStage,
  inProbe = false,
): CompositeElementDispatcher => {
  // 出现位置只用于找到旧记录；能否复用仍由各阶段核对输入、上下文与依赖
  const keyOf = (occurrence: CompileOccurrenceLocator) => JSON.stringify(occurrence);
  return {
    block: inProbe
      ? undefined
      : (runtime, output, frame, occurrence, input, layouts, compile) => {
          const key = keyOf(occurrence);
          const prior = current?.scopeBlocks.get(key);
          const { namespaceStack } = runtime.state.execution;
          const { workspace } = runtime.state;
          const context = [
            frame.context.transformChains,
            frame.context.inheritance,
            frame.context.layout,
            frame.context.pathPrefix,
            frame.context.skipGeometries === true,
          ];
          let result;
          if (
            prior &&
            prior.layouts.length === layouts.length &&
            layouts.every((layout, i) => layout === prior.layouts[i]) &&
            jsonStructuralEquals(prior.input, input) &&
            jsonStructuralEquals(prior.context, context) &&
            !prior.contribution.bindings.some(binding => namespaceStack.hasLocalName(binding.id))
          ) {
            result = materializeWeaveContribution(runtime, output, prior.contribution);
            next.scopeBlocks.set(key, prior);
          } else {
            const state = createWeaveOutputState();
            const warnings = workspace.diagnosticCollector.warnings.length;
            const observed = { reference: false };
            const bindings = namespaceStack.captureFrameChanges(() =>
              namespaceStack.observeReferences(
                () => {
                  observed.reference = true;
                },
                () => compile({ context: frame.context, state }),
              ),
            );
            const resources = {
              paints: workspace.paintRegistry.getResources(),
              clips: workspace.clipRegistry.getResources(),
            };
            if (
              !observed.reference &&
              !state.artifacts.length &&
              warnings === workspace.diagnosticCollector.warnings.length &&
              !resources.paints.length &&
              !resources.clips.length
            ) {
              const contribution = captureWeaveContribution(
                runtime,
                output,
                state,
                bindings,
                resources,
                occurrence,
                false,
              );
              next.scopeBlocks.set(key, { input, layouts, context, contribution });
            }
            result = state;
          }
          appendWeaveOutput(frame.state, result);
        },
    probe(occurrence, replay) {
      const address = keyOf(occurrence);
      const key = (replay ? 'replay:' : 'probe:') + address;
      // 整块命中时不再执行重放；保留对应阶段供下轮发生位移时重新核对
      const replayKey = 'replay:' + address;
      const priorReplay = !replay && current?.probes.get(replayKey);
      if (priorReplay) next.probes.set(replayKey, priorReplay);
      const prior = current?.probes.get(key);
      const record = { elements: prior?.elements ?? createWeaveCompositeStage(), output: prior?.output };
      next.probes.set(key, record);
      return {
        current: prior?.output,
        begin: () => {
          if (prior) record.elements = createWeaveCompositeStage();
          record.output = undefined;
          return createCompositeElementDispatcher(prior?.elements, record.elements, true);
        },
        store: output => {
          record.output = output;
        },
      };
    },
    node(local, occurrence, ir, irPath, frame) {
      const key = keyOf(occurrence);
      const result = executeWeaveNode(local, ir, irPath, frame, current?.nodes.get(key));
      next.nodes.set(key, result);
      return result.compile.value;
    },
    coordinate(local, occurrence, ir, frame) {
      const key = keyOf(occurrence);
      const result = executeWeaveCoordinate(local, ir, frame, current?.coordinates.get(key));
      next.coordinates.set(key, result);
      return result.compile.value;
    },
    path(local, pendingPath) {
      const key = keyOf(pendingPath.occurrence);
      const result = executeWeavePath(local, pendingPath, current?.paths.get(key));
      next.paths.set(key, result);
      return result.compile.value;
    },
    resolveScope(local, occurrence, { children: _children, ...props }, irPath, frame, themePath) {
      return resolveWeaveScope(local, props, irPath, frame, current?.scopes.get(keyOf(occurrence)), themePath);
    },
    compileScope(local, occurrence, { children: _children, ...props }, frame, steps, diagnostics) {
      const key = keyOf(occurrence);
      const result = executeWeaveScope(local, props, frame, steps, diagnostics, [], current?.scopes.get(key));
      next.scopes.set(key, result);
      return result.compile.value;
    },
  };
};
