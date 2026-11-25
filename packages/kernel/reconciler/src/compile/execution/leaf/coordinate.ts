import { resolveCoordinate, compileCoordinate } from '@retikz/core';
import type { IRCoordinate, CompiledCoordinate } from '@retikz/core';

import type { CompileRuntime } from '../../runtime';
import { createCompileChildPath } from '../../shared';
import { createTreePositionContext } from '../shared';
import type { SubtreeCompileRuntime } from '../subtree';

/** 编译坐标并直接发布位置，供后续命名引用与 Scope 包络使用 */
export const visitCoordinate = (
  runtime: CompileRuntime,
  ir: IRCoordinate,
  index: number,
  frame: SubtreeCompileRuntime,
): void => {
  const canon = resolveCoordinate(ir, runtime.context.layout);
  const compiled = compileCoordinate(canon, createTreePositionContext(runtime, frame.context.transformChains));
  assembleCoordinate(runtime, ir, index, frame, compiled);
};

/** 发布已完成的坐标，不重新计算 */
export const assembleCoordinate = (
  runtime: CompileRuntime,
  ir: IRCoordinate,
  index: number,
  frame: SubtreeCompileRuntime,
  compiled: CompiledCoordinate,
): void => {
  const {
    context: { transformChains, pathPrefix, layout },
    state: { geometries, publications, allocations },
  } = frame;
  const coordinateIrPath = createCompileChildPath(pathPrefix, index);
  const localCenter = compiled.position;

  const globalCenter =
    transformChains.length === 0
      ? localCenter
      : runtime.state.execution.scopeTransformComposer.apply(localCenter, transformChains);
  const coordinateLayout = { position: globalCenter };
  runtime.state.execution.namespaceStack.register(ir.id, {
    geometry: coordinateLayout,
    irPath: [...coordinateIrPath, 'id'],
  });
  publications.push(coordinateLayout);
  allocations.push({ boundsPoints: [localCenter], skipAllocation: layout?.skipAllocation });
  if (!frame.context.skipGeometries) geometries.push(compiled);
};
