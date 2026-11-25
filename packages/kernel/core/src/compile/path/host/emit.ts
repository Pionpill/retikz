import type { PathCompileResult, PathDefinitionCompileContext } from '../../../contract';
import { compileBuiltinStroke } from '../../../providers';
import { createContractViolationError, guardProviderOutput } from '../../../resolve';
import type { IRPosition } from '../../../schemas';
import { snapshotProviderPosition, snapshotScenePrimitives } from '../../shared';
import type { BoundPathResolution, PathCompileContext, PreparedPathCompilation } from '../types';
import { createPathDefinitionContext } from './context';

/** 校验并快照化路径 Definition 返回的图元与边界点 */
const snapshotPathCompileResult = (
  kind: string,
  value: PathCompileResult | null,
  allowedResourceIds: ReadonlySet<string>,
) =>
  guardProviderOutput(`Path '${kind}'`, () => {
    if (value === null) return null;
    if ('resources' in value)
      throw createContractViolationError(`Path '${kind}' output: provider cannot declare resources.`);
    const result = value;
    const primitives = snapshotScenePrimitives(`Path '${kind}'`, result.primitives, allowedResourceIds);
    const rawBoundsPoints = result.boundsPoints;
    const boundsPoints = Array.from(rawBoundsPoints, (point, index): IRPosition =>
      snapshotProviderPosition(`Path '${kind}' bounds point at index ${index}`, point),
    );

    return { primitives, boundsPoints };
  });

/** 调用已绑定的路径 Definition，并验证本次产生的图元与资源引用 */
export const emitDefinedPath = (
  resolution: BoundPathResolution,
  context: PathCompileContext,
  prepared?: PreparedPathCompilation['stroke'],
) => {
  const { definition } = resolution;
  const allowedResourceIds = new Set<string>();
  const compileDefinition = definition.compile as (context: PathDefinitionCompileContext) => PathCompileResult | null;
  const { definitionContext, getCompiledStroke } = createPathDefinitionContext(
    resolution,
    context,
    allowedResourceIds,
    compileDefinition === compileBuiltinStroke,
    prepared,
  );
  const produced = compileDefinition(definitionContext);
  return {
    emit: snapshotPathCompileResult(definition.name, produced, allowedResourceIds),
    stroke: getCompiledStroke(),
  };
};
