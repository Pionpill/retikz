import type { IRCoordinate } from '../../../schemas';
import type { TreeCompileContext } from '../../context';
import { createCompileChildPath } from '../../shared';
import { pushAllocation } from '../allocation';
import type { TreeCompileFrame } from '../frame';
import { createSyntheticRectangleLayout } from '../node';
import { createTreePositionContext } from '../reference';
import { resolveCoordinatePosition } from './compile';

/** 解析 coordinate 位置并注册为零尺寸 layout，供后续命名引用使用 */
export const visitCoordinate = (
  context: TreeCompileContext,
  child: IRCoordinate,
  index: number,
  frame: TreeCompileFrame,
): void => {
  const { scopeChain, locatorPrefix, layoutSink } = frame;
  const coordinateIrPath = createCompileChildPath(locatorPrefix, index);
  const localCenter = resolveCoordinatePosition(child, createTreePositionContext(context, scopeChain));

  const globalCenter =
    scopeChain.length === 0 ? localCenter : context.execution.scopeTransformComposer.apply(localCenter, scopeChain);
  const localCoordinateLayout = createSyntheticRectangleLayout(
    { id: child.id, rect: { x: localCenter[0], y: localCenter[1], width: 0, height: 0, rotate: 0 } },
    {
      shapes: context.shared.registries.shapeRegistry,
      boundaries: context.shared.registries.boundaryRegistry,
    },
  );
  const coordinateLayout = createSyntheticRectangleLayout(
    { id: child.id, rect: { x: globalCenter[0], y: globalCenter[1], width: 0, height: 0, rotate: 0 } },
    {
      shapes: context.shared.registries.shapeRegistry,
      boundaries: context.shared.registries.boundaryRegistry,
    },
  );
  context.execution.namespaceStack.register(child.id, {
    layout: coordinateLayout,
    irPath: [...coordinateIrPath, 'id'],
  });
  frame.publicationSink.push(coordinateLayout);
  pushAllocation(frame.allocationSink, [localCenter], frame.allocationBoundary);
  layoutSink.push(localCoordinateLayout);
};
