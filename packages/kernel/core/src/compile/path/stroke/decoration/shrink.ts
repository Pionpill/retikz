import type { CompiledArrowEnd, ScenePrimitive } from '../../../../contract';
import { RetikzCoreError, RetikzCoreErrorCode } from '../../../../error';
import type { CanonicalPathArrow } from '../../../../resolve';

/** 由已解析几何计算路径接触长度，不调用图元 provider */
export const calculateEndpointArrowContact = (canon: CanonicalPathArrow, endpointOverlap: number) => {
  const { geometry, mark } = canon;
  // 将半线宽接缝重叠放在线接触点内侧，尖端的目标位置保持不变
  const contactWithOverlap = geometry.tipX - (geometry.shrink * geometry.baseSize) / geometry.resolvedLength;
  const refX = geometry.contactX + (contactWithOverlap - geometry.contactX) * (1 - endpointOverlap);
  if (endpointOverlap === 0) {
    return {
      refX,
      shrink: geometry.shrink,
      boundaryOuterInset: geometry.boundaryOuterInset,
    };
  }

  const fullEntryShrink = ((geometry.visualBackX - geometry.contactX) * geometry.resolvedLength) / geometry.baseSize;
  if (!Number.isFinite(fullEntryShrink)) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Compile,
      `Arrow '${mark.shape}' full-entry shrink is non-finite; use smaller back/contact/length/scale values.`,
    );
  }

  const endpointShrink = geometry.shrink + (fullEntryShrink - geometry.shrink) * endpointOverlap;
  if (!Number.isFinite(endpointShrink)) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Compile,
      `Arrow '${mark.shape}' endpoint-overlap shrink is non-finite; use smaller geometry values.`,
    );
  }

  return {
    refX,
    shrink: endpointShrink,
    boundaryOuterInset: geometry.boundaryOuterInset * (1 - endpointOverlap),
  };
};

/** 将局部内容与当前箭头尺寸、接触位置组合 */
export const emitEndpointArrowMark = (
  canon: CanonicalPathArrow,
  endpointOverlap: number,
  content: Array<ScenePrimitive>,
): CompiledArrowEnd => {
  const { geometry, mark } = canon;
  return {
    shape: mark.shape,
    baseSize: geometry.baseSize,
    refX: calculateEndpointArrowContact(canon, endpointOverlap).refX,
    markerWidth: geometry.resolvedLength,
    markerHeight: geometry.resolvedWidth,
    marker: content,
    ...(mark.opacity === undefined ? {} : { opacity: mark.opacity }),
  };
};
