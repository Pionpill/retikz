import { createCoordinateLayout, resolveCoordinatePosition } from '@retikz/core';
import type { IRCoordinate } from '@retikz/core';

import { runCompileStage } from '../../runtime';
import type { CompileRuntime } from '../../runtime';
import { createCompileChildPath } from '../../shared';
import { createTreePositionContext } from '../reference';
import type { SubtreeCompileRuntime } from '../runtime';

/** 解析 coordinate 位置并注册为零尺寸 layout，供后续命名引用使用 */
export const visitCoordinate = (
  runtime: CompileRuntime,
  child: IRCoordinate,
  index: number,
  frame: SubtreeCompileRuntime,
): void => {
  const {
    context: { transformChains: scopeChain, pathPrefix: locatorPrefix, layout },
    state: { layouts, publications, allocations },
  } = frame;
  const coordinateIrPath = createCompileChildPath(locatorPrefix, index);
  const localCoordinateLayout = runCompileStage(
    runtime,
    coordinateIrPath,
    'coordinate',
    { child, scopeChain },
    stageRuntime =>
      createCoordinateLayout(
        resolveCoordinatePosition(child, createTreePositionContext(stageRuntime, scopeChain)),
        stageRuntime.context.registries.shapeRegistry,
      ),
  );
  const localCenter = [localCoordinateLayout.geometry.rect.x, localCoordinateLayout.geometry.rect.y] as [
    number,
    number,
  ];

  const globalCenter =
    scopeChain.length === 0
      ? localCenter
      : runtime.state.execution.scopeTransformComposer.apply(localCenter, scopeChain);
  const { shapeRegistry } = runtime.context.registries;
  const coordinateLayout = createCoordinateLayout(globalCenter, shapeRegistry);
  runtime.state.execution.namespaceStack.register(child.id, {
    layout: coordinateLayout,
    irPath: [...coordinateIrPath, 'id'],
  });
  publications.push(coordinateLayout);
  allocations.push({ boundsPoints: [localCenter], skipAllocation: layout?.skipAllocation });
  layouts.push(localCoordinateLayout);
};
