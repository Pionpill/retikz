import type { IRPath, IRScope } from '@retikz/core';

import type { IRFrame } from './types';

type FrameChild = IRPath | IRScope;

/** 将 Standard Frame 下沉为边框 Path、内容 Scope 与可选标签 carrier Path */
export const lowerFrame = (frame: IRFrame): Array<FrameChild> => {
  const { zIndex: borderZIndex, ...borderStyle } = frame.border;
  const negativeGap = frame.gap === 0 ? 0 : -frame.gap;
  const border: IRPath = {
    ...borderStyle,
    type: 'path',
    zIndex: borderZIndex ?? -1,
    children: [
      {
        type: 'step',
        kind: 'rectangle',
        from: { id: frame.id, anchor: 'top-left', offset: [negativeGap, negativeGap] },
        to: { id: frame.id, anchor: 'bottom-right', offset: [frame.gap, frame.gap] },
      },
    ],
  };
  const scope: IRScope = {
    type: 'scope',
    id: frame.id,
    localNamespace: false,
    boundingShape: 'rectangle',
    zIndex: 0,
    children: frame.children,
  };

  if (frame.label === undefined) return [border, scope];

  const labelCarrier: IRPath = {
    type: 'path',
    stroke: 'transparent',
    strokeWidth: 0,
    zIndex: 1,
    children: [
      {
        type: 'step',
        kind: 'move',
        to: { id: frame.id, anchor: 'top-left', offset: [frame.gap, -8] },
      },
      {
        type: 'step',
        kind: 'line',
        to: { id: frame.id, anchor: 'top-left', offset: [frame.gap + 1, -8] },
        label: {
          text: frame.label,
          position: 'at-start',
          side: 'right',
          distance: 0,
          textColor: 'currentColor',
        },
      },
    ],
  };
  return [border, scope, labelCarrier];
};
