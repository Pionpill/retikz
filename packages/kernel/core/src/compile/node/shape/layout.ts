import type { ShapeCircumscribedGeometry } from '../../../contract';
import type { CanonicalNode } from '../../../resolve';
import {
  createCompositeContractError,
  createLayoutProbeRecoverableError,
  guardProviderOutput,
  isFatalProbeError,
  isLayoutProbeRecoverableError,
  safeThrownDetail,
} from '../../../resolve';
import { snapshotProviderPosition } from '../../shared';

/** 根据包含内边距的内容半尺寸计算形状外接几何，并快照提供者结果 */
export const layoutNodeShape = (shape: CanonicalNode['shape'], halfContentWidth: number, halfContentHeight: number) => {
  const { definition, params: shapeParams } = shape;
  let raw: ShapeCircumscribedGeometry;

  try {
    raw = definition.computeCircumscribedGeometry(halfContentWidth, halfContentHeight, shapeParams);
  } catch (thrown) {
    if (isFatalProbeError(thrown) || isLayoutProbeRecoverableError(thrown)) throw thrown;

    throw createLayoutProbeRecoverableError(
      `Shape '${definition.name}' circumscribe failed: ${safeThrownDetail(thrown)}`,
      { cause: thrown, providerKey: `shape:${definition.name}` },
    );
  }

  return guardProviderOutput(`Shape '${definition.name}' circumscribe`, () => {
    const { halfWidth, halfHeight, offset: rawOffset } = raw;
    if (!Number.isFinite(halfWidth) || !Number.isFinite(halfHeight) || halfWidth < 0 || halfHeight < 0) {
      throw createCompositeContractError(
        `Shape '${definition.name}' returned invalid circumscribe geometry; halfWidth and halfHeight must be finite non-negative numbers`,
      );
    }

    const offset =
      rawOffset === undefined
        ? undefined
        : snapshotProviderPosition(`Shape '${definition.name}' computeCircumscribedGeometry.offset`, rawOffset);

    return { halfWidth, halfHeight, offset };
  });
};
