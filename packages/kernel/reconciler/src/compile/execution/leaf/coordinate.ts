import { resolveCoordinate, compileCoordinate } from '@retikz/core';
import type { IRCoordinate, CompiledCoordinate } from '@retikz/core';
import type { PropertyPath } from '@retikz/foundation';

import { createCompileObservation } from '../../runtime';
import type { CompileRuntime } from '../../runtime';
import { createCompileChildPath } from '../../shared';
import { createTreePositionContext } from '../shared';
import type { SubtreeCompileRuntime } from '../subtree';

/** 编译坐标并直接发布位置，供后续命名引用与 Scope 包络使用 */
export const visitCoordinate = (
  runtime: CompileRuntime,
  child: IRCoordinate,
  index: number,
  frame: SubtreeCompileRuntime,
): void => {
  const path = createCompileChildPath(frame.context.pathPrefix, index);
  const observation = runtime.onCompiled === undefined ? undefined : createCompileObservation(runtime);
  const canon = resolveCoordinate(child, runtime.context.layout);
  const context = createTreePositionContext(runtime, frame.context.transformChains);
  const compiled =
    observation === undefined
      ? compileCoordinate(canon, context)
      : runtime.state.execution.namespaceStack.observeReferences(observation.read, () =>
          compileCoordinate(canon, context),
        );
  runtime.onCompiled?.(path, frame.context, { kind: 'coordinate', canon, compiled }, observation!.facts());
  assembleCoordinateOutput(runtime, child, path, frame, compiled);
};

/** 发布已完成的坐标，不重新计算 */
export const assembleCoordinateOutput = (
  runtime: CompileRuntime,
  child: IRCoordinate,
  coordinateIrPath: PropertyPath,
  frame: SubtreeCompileRuntime,
  compiled: CompiledCoordinate,
): void => {
  const {
    context: { transformChains: scopeChain, layout },
    state: { geometries: layouts, publications, allocations },
  } = frame;
  const localCenter = compiled.position;

  const globalCenter =
    scopeChain.length === 0
      ? localCenter
      : runtime.state.execution.scopeTransformComposer.apply(localCenter, scopeChain);
  const coordinateLayout = { position: globalCenter };
  runtime.state.execution.namespaceStack.register(child.id, {
    geometry: coordinateLayout,
    irPath: [...coordinateIrPath, 'id'],
  });
  publications.push(coordinateLayout);
  allocations.push({ boundsPoints: [localCenter], skipAllocation: layout?.skipAllocation });
  layouts.push(compiled);
};
