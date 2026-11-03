import { resolveCoordinatePosition } from '../../../resolve';
import type { IRCoordinate } from '../../../schemas';
import type { CompileRuntime } from '../../runtime';
import { createCompileChildPath } from '../../shared';
import { createTreePositionContext } from '../reference';
import type { SubtreeCompileRuntime } from '../runtime';
import { createCoordinateLayout } from './layout';

/** 解析 coordinate 位置并注册为零尺寸 layout，供后续命名引用使用 */
export const visitCoordinate = (
  runtime: CompileRuntime,
  child: IRCoordinate,
  index: number,
  frame: SubtreeCompileRuntime,
): void => {
  const {
    context: { transformChains: scopeChain, pathPrefix: locatorPrefix },
    state: { layouts },
  } = frame;
  const coordinateIrPath = createCompileChildPath(locatorPrefix, index);
  const localCenter = resolveCoordinatePosition(child, createTreePositionContext(runtime, scopeChain));

  const globalCenter =
    scopeChain.length === 0
      ? localCenter
      : runtime.state.execution.scopeTransformComposer.apply(localCenter, scopeChain);
  const geometryContext = {
    shapes: runtime.context.registries.shapeRegistry,
    boundaries: runtime.context.registries.boundaryRegistry,
  };
  const localCoordinateLayout = createCoordinateLayout(child.id, localCenter, geometryContext);
  const coordinateLayout = createCoordinateLayout(child.id, globalCenter, geometryContext);
  runtime.state.execution.namespaceStack.register(child.id, {
    layout: coordinateLayout,
    irPath: [...coordinateIrPath, 'id'],
  });
  frame.state.publications.push(coordinateLayout);
  frame.state.allocations.push({ boundsPoints: [localCenter], skipAllocation: frame.context.layout?.skipAllocation });
  layouts.push(localCoordinateLayout);
};
