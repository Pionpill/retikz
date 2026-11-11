import { resolveCoordinate, compileCoordinate } from '@retikz/core';
import type { IRCoordinate } from '@retikz/core';

import { runCompileStage } from '../../runtime';
import type { CompileRuntime } from '../../runtime';
import { createCompileChildPath } from '../../shared';
import { createTreePositionContext } from '../reference';
import type { SubtreeCompileRuntime } from '../runtime';

/** 编译坐标并直接发布位置，供后续命名引用与 Scope 包络使用 */
export const visitCoordinate = (
  runtime: CompileRuntime,
  child: IRCoordinate,
  index: number,
  frame: SubtreeCompileRuntime,
): void => {
  const {
    context: { transformChains: scopeChain, pathPrefix: locatorPrefix, layout },
    state: { geometries: layouts, publications, allocations },
  } = frame;
  const coordinateIrPath = createCompileChildPath(locatorPrefix, index);
  const { compiled } = runCompileStage(
    runtime,
    coordinateIrPath,
    'coordinate',
    { child, scopeChain },
    {
      resolveInputs: { child, nodeDistance: runtime.context.layout.nodeDistance },
      compileInputs: { scopeChain },
      resolve: stageRuntime => resolveCoordinate(child, stageRuntime.context.layout),
      compile: (stageRuntime, canon) => ({
        canon,
        compiled: compileCoordinate(canon, createTreePositionContext(stageRuntime, scopeChain)),
      }),
    },
  );
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
