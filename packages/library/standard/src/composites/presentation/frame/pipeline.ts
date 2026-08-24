import type {
  CompositeCompileChild,
  CompositeCompileScopeProps,
  IRBoxSpacing,
  IRNode,
  IRPath,
  LayoutChildResult,
  LayoutCompositeCompileContext,
  LayoutCompositeCompileResult,
} from '@retikz/core';
import type { BoundsRect } from '@retikz/math';

import { NaturalLayoutProposal } from '@retikz/core';
import { requiredLayoutProbe } from '@retikz/layout/compose';

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
  font: NonNullable<IRNode['font']>;
  opacity?: number;
};

type PlacedFrameChild = Readonly<{
  result: LayoutChildResult;
  bounds: BoundsRect;
  replay: CompositeCompileChild;
}>;

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

/** 把 Node-like Frame header 补全为可独立 probe 的普通 Core Node */
const frameHeaderNodeOf = (header: FrameHeaderInput, options: FrameHeaderOptions): IRNode => {
  const { text, font, ...nodeFields } = header;
  return {
    type: 'node',
    shape: 'rectangle',
    stroke: 'none',
    fill: 'none',
    padding: 0,
    zIndex: 1,
    ...(options.opacity !== undefined ? { opacity: options.opacity } : {}),
    ...omitUndefined(nodeFields),
    text,
    position: [0, 0],
    font: { ...options.font, ...omitUndefined(font ?? {}) },
  };
};

/** 平移 bounds，同时保留尺寸 */
const translateBounds = (bounds: BoundsRect, x: number, y: number): BoundsRect => ({
  x: bounds.x + x,
  y: bounds.y + y,
  width: bounds.width,
  height: bounds.height,
});

/** 合并两个有限矩形 */
const unionBounds = (left: BoundsRect, right: BoundsRect): BoundsRect => {
  const x = Math.min(left.x, right.x);
  const y = Math.min(left.y, right.y);
  const maxX = Math.max(left.x + left.width, right.x + right.width);
  const maxY = Math.max(left.y + left.height, right.y + right.height);
  return { x, y, width: maxX - x, height: maxY - y };
};

/** 将 probe 结果的指定 anchor 放到目标点，并创建一次性 replay */
const placeChild = (
  context: LayoutCompositeCompileContext,
  result: LayoutChildResult,
  target: Readonly<{ x: number; y: number }>,
  anchor: 'top-left' | 'bottom-left',
): PlacedFrameChild => {
  const sourceX = result.allocationBounds.x;
  const sourceY =
    anchor === 'top-left' ? result.allocationBounds.y : result.allocationBounds.y + result.allocationBounds.height;
  const translation = { x: target.x - sourceX, y: target.y - sourceY };
  return {
    result,
    bounds: translateBounds(result.allocationBounds, translation.x, translation.y),
    replay: context.replay(result, {
      transforms: [{ kind: 'translate', x: translation.x, y: translation.y }],
    }),
  };
};

/** 从 Frame 领域字段中分离 authored root Scope 的 Core 属性 */
const authoredScopePropsOf = (frame: IRFrame): CompositeCompileScopeProps => {
  const {
    namespace: _namespace,
    type: _type,
    border: _border,
    padding: _padding,
    gap: _gap,
    headerDirection: _headerDirection,
    title: _title,
    description: _description,
    children: _children,
    ...scopeProps
  } = frame;
  void _namespace;
  void _type;
  void _border;
  void _padding;
  void _gap;
  void _headerDirection;
  void _title;
  void _description;
  void _children;
  return scopeProps;
};

/** 用 occurrence-local probe 排布 Frame body/header，并避免生成公开 Core id */
export const compileFrame = (frame: IRFrame, context: LayoutCompositeCompileContext): LayoutCompositeCompileResult => {
  let occurrence = 0;
  const bodyResult = requiredLayoutProbe(
    context,
    {
      child: {
        type: 'scope',
        localNamespace: false,
        boundingShape: 'rectangle',
        zIndex: 0,
        children: frame.children,
      },
      occurrence: occurrence++,
    },
    NaturalLayoutProposal,
  );
  const body = {
    result: bodyResult,
    bounds: bodyResult.allocationBounds,
    replay: context.replay(bodyResult),
  } satisfies PlacedFrameChild;
  const titleResult =
    frame.title === undefined
      ? undefined
      : requiredLayoutProbe(
          context,
          {
            child: frameHeaderNodeOf(frame.title, { font: { size: 'sm', weight: 600 } }),
            occurrence: occurrence++,
          },
          NaturalLayoutProposal,
        );
  const descriptionResult =
    frame.description === undefined
      ? undefined
      : requiredLayoutProbe(
          context,
          {
            child: frameHeaderNodeOf(frame.description, { font: { size: 'xs' }, opacity: 0.7 }),
            occurrence,
          },
          NaturalLayoutProposal,
        );
  const contentTop = { x: body.bounds.x, y: body.bounds.y - frame.gap };
  let title: PlacedFrameChild | undefined;
  let description: PlacedFrameChild | undefined;

  if (frame.headerDirection === FrameHeaderDirection.Horizontal) {
    if (titleResult !== undefined) title = placeChild(context, titleResult, contentTop, 'bottom-left');
    if (descriptionResult !== undefined) {
      description = placeChild(
        context,
        descriptionResult,
        title === undefined
          ? contentTop
          : { x: title.bounds.x + title.bounds.width + frame.gap, y: title.bounds.y + title.bounds.height },
        'bottom-left',
      );
    }
  } else {
    if (descriptionResult !== undefined)
      description = placeChild(context, descriptionResult, contentTop, 'bottom-left');
    if (titleResult !== undefined) {
      title = placeChild(
        context,
        titleResult,
        description === undefined ? contentTop : { x: description.bounds.x, y: description.bounds.y - frame.gap },
        'bottom-left',
      );
    }
  }

  const contentBounds = [body, title, description]
    .filter((child): child is PlacedFrameChild => child !== undefined)
    .reduce((bounds, child) => unionBounds(bounds, child.bounds), body.bounds);
  const insets = normalizeFramePadding(frame.padding, 8);
  const allocationBounds = {
    x: contentBounds.x - insets.left,
    y: contentBounds.y - insets.top,
    width: contentBounds.width + insets.left + insets.right,
    height: contentBounds.height + insets.top + insets.bottom,
  };
  const border: IRPath = {
    ...frame.border.style,
    type: 'path',
    zIndex: frame.border.style.zIndex ?? -1,
    children: [
      {
        type: 'step',
        kind: 'rectangle',
        from: [allocationBounds.x, allocationBounds.y],
        to: [allocationBounds.x + allocationBounds.width, allocationBounds.y + allocationBounds.height],
        ...(frame.border.cornerRadius !== undefined ? { cornerRadius: frame.border.cornerRadius } : {}),
      },
    ],
  };
  const root = context.scope(authoredScopePropsOf(frame), [
    border,
    body.replay,
    ...(title === undefined ? [] : [title.replay]),
    ...(description === undefined ? [] : [description.replay]),
  ]);

  return { children: [root], allocationBounds };
};
