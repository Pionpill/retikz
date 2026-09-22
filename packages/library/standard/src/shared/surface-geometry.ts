import type { IRClip, IRPath } from '@retikz/core';
import { rectOutline } from '@retikz/core';

/** 构造 Surface background 或 border 共用的矩形 Path */
export const surfaceBoundaryPath = (
  width: number,
  height: number,
  cornerRadius: number,
  appearance: Omit<IRPath, 'type' | 'children'>,
): IRPath => ({
  ...appearance,
  type: 'path',
  children: [
    {
      type: 'step',
      kind: 'rectangle',
      from: [0, 0],
      to: [width, height],
      ...(cornerRadius === 0 ? {} : { cornerRadius }),
    },
  ],
});

/** 构造与 Surface rounded boundary 一致的 content clip */
export const surfaceClip = (width: number, height: number, cornerRadius: number): IRClip => ({
  kind: 'path',
  commands: rectOutline([0, 0], [width, height], cornerRadius),
});
