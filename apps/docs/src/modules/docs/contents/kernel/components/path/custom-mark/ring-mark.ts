import { defineMark, RetikzCoreError, RetikzCoreErrorCode } from '@retikz/core';

/** 用 radius 参数调整圆环轮廓 */
export const ringMark = defineMark({
  name: 'ring',
  baseSize: 10,
  anchor: [5, 5],
  hollow: true,
  emit: context => {
    const radius = context.params.radius ?? 3;
    if (typeof radius !== 'number' || !Number.isFinite(radius) || radius <= 0 || radius > 5) {
      throw new RetikzCoreError(RetikzCoreErrorCode.Provider, 'ring radius must be greater than 0 and at most 5');
    }
    return [
      {
        type: 'ellipse',
        cx: 5,
        cy: 5,
        rx: radius,
        ry: radius,
        fill: 'none',
        stroke: context.stroke,
        strokeWidth: context.lineWidth,
        dashPattern: context.dashPattern,
        dashOffset: context.dashOffset,
      },
    ];
  },
});
