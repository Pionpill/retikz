import type { PathCompileResult, PathDefinitionCompileContext } from '../../contract';
import { createCompositeContractError, guardProviderOutput } from '../../resolve';
import type { IRPosition } from '../../schemas';
import { snapshotProviderPosition, snapshotScenePrimitives } from '../shared';
import { createPathDefinitionContext } from './definition';
import type { BoundPathResolution, PathCompileContext } from './types';

/** 校验并脱离 BuiltinPath provider 返回的 primitive 与 bounds point */
const snapshotPathCompileResult = (
  kind: string,
  value: PathCompileResult | null,
  allowedResourceIds: ReadonlySet<string>,
) =>
  guardProviderOutput(`Path '${kind}'`, () => {
    if (value === null) return null;
    if ('resources' in value)
      throw createCompositeContractError(`Path '${kind}' output: provider cannot declare resources.`);
    const result = value;
    const primitives = snapshotScenePrimitives(`Path '${kind}'`, result.primitives, allowedResourceIds);
    const rawBoundsPoints = result.boundsPoints;
    const boundsPoints = Array.from(rawBoundsPoints, (point, index): IRPosition =>
      snapshotProviderPosition(`Path '${kind}' bounds point at index ${index}`, point),
    );

    return {
      result: { primitives, boundsPoints },
      source: result,
    };
  });

/** 调用已绑定的路径 Definition，并验证本次产生的图元与资源引用 */
export const emitDefinedPath = (resolution: BoundPathResolution, context: PathCompileContext) => {
  const { definition } = resolution;
  const allowedResourceIds = new Set<string>();
  const definitionContext = createPathDefinitionContext(resolution, context, allowedResourceIds);
  const compilePath = definition.compile as (context: PathDefinitionCompileContext) => PathCompileResult | null;
  const produced = compilePath(definitionContext);
  const validated = snapshotPathCompileResult(definition.name, produced, allowedResourceIds);
  return validated === null ? null : validated.result;
};
