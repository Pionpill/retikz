import type { IRCoordinate } from '../../../schemas';
import type { CompileRuntime } from '../../runtime';
import { createCompileChildPath } from '../../shared';
import { pushAllocation } from '../allocation';
import { createSyntheticRectangleLayout } from '../node';
import { createTreePositionContext } from '../reference';
import type { SubtreeCompileRuntime } from '../runtime';
import { resolveCoordinatePosition } from './compile';

/** 解析 coordinate 位置并注册为零尺寸 layout，供后续命名引用使用 */
export const visitCoordinate = (
  runtime: CompileRuntime,
  child: IRCoordinate,
  index: number,
  frame: SubtreeCompileRuntime,
): void => {
  const {
    context: { scopeChain, locatorPrefix },
    state: { layoutSink },
  } = frame;
  const coordinateIrPath = createCompileChildPath(locatorPrefix, index);
  const localCenter = resolveCoordinatePosition(child, createTreePositionContext(runtime, scopeChain));

  const globalCenter =
    scopeChain.length === 0
      ? localCenter
      : runtime.state.execution.scopeTransformComposer.apply(localCenter, scopeChain);
  const localCoordinateLayout = createSyntheticRectangleLayout(
    { id: child.id, rect: { x: localCenter[0], y: localCenter[1], width: 0, height: 0, rotate: 0 } },
    {
      shapes: runtime.context.registries.shapeRegistry,
      boundaries: runtime.context.registries.boundaryRegistry,
    },
  );
  const coordinateLayout = createSyntheticRectangleLayout(
    { id: child.id, rect: { x: globalCenter[0], y: globalCenter[1], width: 0, height: 0, rotate: 0 } },
    {
      shapes: runtime.context.registries.shapeRegistry,
      boundaries: runtime.context.registries.boundaryRegistry,
    },
  );
  runtime.state.execution.namespaceStack.register(child.id, {
    layout: coordinateLayout,
    irPath: [...coordinateIrPath, 'id'],
  });
  frame.state.publicationSink.push(coordinateLayout);
  pushAllocation(frame.state.allocationSink, [localCenter], frame.context.allocationBoundary);
  layoutSink.push(localCoordinateLayout);
};
