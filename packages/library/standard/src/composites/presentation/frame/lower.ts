import type { IRAnchorRef, IRBoxSpacing, IRNode, IRNodeTarget, IRPath, IRScope } from '@retikz/core';

import type { IRFrame, IRFrameDescription, IRFrameTitle } from './types';

import { FrameHeaderDirection } from './constants';

type FramePaddingInsets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

type FrameHeaderInput = IRFrameTitle | IRFrameDescription;

type FrameHeaderOptions = {
  id: string;
  target: IRNodeTarget;
  selfAnchor: IRAnchorRef;
  font: NonNullable<IRNode['font']>;
  opacity?: number;
};

/** 移除可选字段中的显式 undefined，避免覆盖 lowering 默认值 */
const omitUndefined = <T extends object>(value: T): Partial<T> =>
  Object.fromEntries(Object.entries(value).filter(([, field]) => field !== undefined)) as Partial<T>;

/** 把 Frame padding 归一化为四边独立的边框 offset */
const normalizeFramePadding = (value: number | IRBoxSpacing | undefined, fallback: number): FramePaddingInsets => {
  if (typeof value === 'number') {
    return { top: value, right: value, bottom: value, left: value };
  }
  const base = value?.default ?? fallback;
  return {
    top: value?.top ?? value?.y ?? base,
    right: value?.right ?? value?.x ?? base,
    bottom: value?.bottom ?? value?.y ?? base,
    left: value?.left ?? value?.x ?? base,
  };
};

/** 把 Node-like Frame header 补全为按 anchor 排布的普通 Core Node */
const lowerFrameHeader = (header: FrameHeaderInput, options: FrameHeaderOptions): IRNode => {
  const { id: explicitId, text, font, ...nodeFields } = header;
  return {
    type: 'node',
    shape: 'rectangle',
    stroke: 'none',
    fill: 'none',
    padding: 0,
    zIndex: 1,
    ...(options.opacity !== undefined ? { opacity: options.opacity } : {}),
    ...omitUndefined(nodeFields),
    id: explicitId ?? options.id,
    text,
    position: {
      kind: 'anchor',
      target: options.target,
      selfAnchor: options.selfAnchor,
    },
    font: { ...options.font, ...omitUndefined(font ?? {}) },
  };
};

/** 将 Standard Frame 下沉为一个包含边框、body Scope 与可选 header Nodes 的 Core Scope */
export const lowerFrame = (frame: IRFrame): IRScope => {
  const {
    namespace: _namespace,
    type: _type,
    id,
    padding,
    gap,
    headerDirection,
    cornerRadius,
    zIndex,
    title,
    description,
    children,
    ...borderStyle
  } = frame;
  void _namespace;
  void _type;

  const insets = normalizeFramePadding(padding, 8);
  const contentId = `${id}/content`;
  const descriptionId = description?.id ?? `${id}/description`;
  const titleId = title?.id ?? `${id}/title`;

  const border: IRPath = {
    ...borderStyle,
    type: 'path',
    zIndex: -1,
    children: [
      {
        type: 'step',
        kind: 'rectangle',
        from: { id, anchor: 'top-left', offset: [-insets.left, -insets.top] },
        to: { id, anchor: 'bottom-right', offset: [insets.right, insets.bottom] },
        ...(cornerRadius !== undefined ? { cornerRadius } : {}),
      },
    ],
  };
  const content: IRScope = {
    type: 'scope',
    id: contentId,
    localNamespace: false,
    boundingShape: 'rectangle',
    zIndex: 0,
    children,
  };
  const loweredChildren: IRScope['children'] = [border, content];

  const lowerTitle = (target: IRNodeTarget): IRNode | undefined =>
    title === undefined
      ? undefined
      : lowerFrameHeader(title, {
          id: titleId,
          target,
          selfAnchor: 'bottom-left',
          font: { size: 'sm', weight: 600 },
        });
  const lowerDescription = (target: IRNodeTarget): IRNode | undefined =>
    description === undefined
      ? undefined
      : lowerFrameHeader(description, {
          id: descriptionId,
          target,
          selfAnchor: 'bottom-left',
          font: { size: 'xs' },
          opacity: 0.7,
        });
  const contentTopTarget: IRNodeTarget = {
    id: contentId,
    anchor: 'top-left',
    offset: [0, gap === 0 ? 0 : -gap],
  };

  if (headerDirection === FrameHeaderDirection.Horizontal) {
    const loweredTitle = lowerTitle(contentTopTarget);
    if (loweredTitle !== undefined) loweredChildren.push(loweredTitle);
    const loweredDescription = lowerDescription(
      loweredTitle === undefined
        ? contentTopTarget
        : {
            id: titleId,
            anchor: 'bottom-right',
            offset: [gap, 0],
          },
    );
    if (loweredDescription !== undefined) loweredChildren.push(loweredDescription);
  } else {
    const loweredDescription = lowerDescription(contentTopTarget);
    if (loweredDescription !== undefined) loweredChildren.push(loweredDescription);
    const loweredTitle = lowerTitle(
      loweredDescription === undefined
        ? contentTopTarget
        : {
            id: descriptionId,
            anchor: 'top-left',
            offset: [0, gap === 0 ? 0 : -gap],
          },
    );
    if (loweredTitle !== undefined) loweredChildren.push(loweredTitle);
  }

  return {
    type: 'scope',
    id,
    localNamespace: false,
    boundingShape: 'rectangle',
    ...(zIndex !== undefined ? { zIndex } : {}),
    children: loweredChildren,
  };
};
