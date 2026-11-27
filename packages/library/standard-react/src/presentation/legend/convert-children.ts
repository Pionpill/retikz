import type { ReactInputEmbedContext } from '@retikz/react';
import { convertReactToInputScene } from '@retikz/react';
import type { InputLegend } from '@retikz/standard-vanilla/presentation';
import { RetikzStandardError, RetikzStandardErrorCode } from '@retikz/standard/presentation';
import type { ReactElement, ReactNode } from 'react';
import { Children, Fragment, isValidElement } from 'react';

import type { LegendItemProps, LegendRampProps, LegendTickProps, LegendTitleProps } from './LegendMarkers';
import { LegendItem, LegendRamp, LegendTick, LegendTitle } from './LegendMarkers';

type LegendChild = NonNullable<InputLegend['title']>;

type CollectedLegend<T> = Readonly<{ value: T }>;

type LegendItemsChildren = Readonly<{
  title?: LegendChild;
  items: Array<Readonly<{ key: string; sample: LegendChild; label?: LegendChild }>>;
}>;

type LegendRampChildren = Readonly<{
  title?: LegendChild;
  sample: LegendChild;
  ticks: Array<Readonly<{ key: string; offset: number; label?: LegendChild }>>;
}>;

/** 透明展开数组与 Fragment，同时忽略 React empty node */
const flattenLegendNodes = (children: ReactNode): Array<ReactNode> => {
  const flattened: Array<ReactNode> = [];
  Children.forEach(children, child => {
    if (child === null || child === undefined || typeof child === 'boolean') return;
    if (isValidElement(child) && child.type === Fragment) {
      flattened.push(...flattenLegendNodes((child as ReactElement<{ children?: ReactNode }>).props.children));
      return;
    }

    flattened.push(child);
  });

  return flattened;
};

/** 判断 slot element 是否能进入 React Input 收集路径 */
const isConvertibleElement = (node: ReactNode): node is ReactElement =>
  isValidElement(node) && typeof node.type === 'function';

/** 收集 required marker slot 的唯一 Input child */
const collectRequiredSlot = (
  children: ReactNode,
  label: string,
  embedIdPrefix: string,
): CollectedLegend<LegendChild> => {
  const nodes = flattenLegendNodes(children);
  if (nodes.length !== 1 || !isConvertibleElement(nodes[0])) {
    throw new RetikzStandardError({
      code: RetikzStandardErrorCode.AuthoringInvalid,
      message: `${label} must contain exactly one convertible React element.`,
      details: { count: nodes.length, label },
    });
  }

  const input = convertReactToInputScene(nodes[0], { embedIdPrefix });
  const childrenInput = input.children;
  if (childrenInput.length !== 1) {
    throw new RetikzStandardError({
      code: RetikzStandardErrorCode.AuthoringInvalid,
      message: `${label} must contain exactly one authoring child.`,
      details: { count: childrenInput.length, label },
    });
  }

  return { value: childrenInput[0] };
};

/** 收集 optional marker slot 的零或一个 Input child */
const collectOptionalSlot = (
  children: ReactNode,
  label: string,
  embedIdPrefix: string,
): CollectedLegend<LegendChild | undefined> => {
  const nodes = flattenLegendNodes(children);
  if (nodes.length === 0) return { value: undefined };
  if (nodes.length !== 1 || !isConvertibleElement(nodes[0])) {
    throw new RetikzStandardError({
      code: RetikzStandardErrorCode.AuthoringInvalid,
      message: `${label} must contain at most one convertible React element.`,
      details: { count: nodes.length, label },
    });
  }

  const input = convertReactToInputScene(nodes[0], { embedIdPrefix });
  const childrenInput = input.children;
  if (childrenInput.length !== 1) {
    throw new RetikzStandardError({
      code: RetikzStandardErrorCode.AuthoringInvalid,
      message: `${label} must contain at most one authoring child.`,
      details: { count: childrenInput.length, label },
    });
  }

  return { value: childrenInput[0] };
};

/** 收集 items form 的直属 marker 输入 */
export const convertLegendItemsChildren = (
  children: ReactNode,
  context: ReactInputEmbedContext,
): CollectedLegend<LegendItemsChildren> => {
  let title: LegendChild | undefined;
  const items: LegendItemsChildren['items'] = [];

  for (const [index, child] of flattenLegendNodes(children).entries()) {
    if (isValidElement<LegendTitleProps>(child) && child.type === LegendTitle) {
      if (title !== undefined) {
        throw new RetikzStandardError({
          code: RetikzStandardErrorCode.AuthoringInvalid,
          message: 'Legend accepts at most one LegendTitle.',
          details: { form: 'items', marker: 'LegendTitle' },
        });
      }

      const slot = collectRequiredSlot(child.props.children, 'LegendTitle', `${context.id}:title`);
      title = slot.value;

      continue;
    }

    if (isValidElement<LegendItemProps>(child) && child.type === LegendItem) {
      const sample = collectRequiredSlot(
        child.props.sample,
        'LegendItem sample',
        `${context.id}:items:${index}:sample`,
      );
      const label = collectOptionalSlot(child.props.children, 'LegendItem label', `${context.id}:items:${index}:label`);

      items.push({
        key: child.props.itemKey,
        sample: sample.value,
        ...(label.value === undefined ? {} : { label: label.value }),
      });
      continue;
    }

    throw new RetikzStandardError({
      code: RetikzStandardErrorCode.AuthoringInvalid,
      message: 'Items Legend accepts only LegendTitle and LegendItem as direct children.',
      details: { form: 'items' },
    });
  }

  return {
    value: { ...(title === undefined ? {} : { title }), items },
  };
};

/** 收集 ramp form 的直属 marker 输入 */
export const convertLegendRampChildren = (
  children: ReactNode,
  context: ReactInputEmbedContext,
): CollectedLegend<LegendRampChildren> => {
  let title: LegendChild | undefined;
  let sample: LegendChild | undefined;
  const ticks: LegendRampChildren['ticks'] = [];

  for (const [index, child] of flattenLegendNodes(children).entries()) {
    if (isValidElement<LegendTitleProps>(child) && child.type === LegendTitle) {
      if (title !== undefined) {
        throw new RetikzStandardError({
          code: RetikzStandardErrorCode.AuthoringInvalid,
          message: 'Legend accepts at most one LegendTitle.',
          details: { form: 'ramp', marker: 'LegendTitle' },
        });
      }

      const slot = collectRequiredSlot(child.props.children, 'LegendTitle', `${context.id}:title`);
      title = slot.value;

      continue;
    }

    if (isValidElement<LegendRampProps>(child) && child.type === LegendRamp) {
      if (sample !== undefined) {
        throw new RetikzStandardError({
          code: RetikzStandardErrorCode.AuthoringInvalid,
          message: 'Ramp Legend requires exactly one LegendRamp.',
          details: { form: 'ramp', marker: 'LegendRamp' },
        });
      }

      const slot = collectRequiredSlot(child.props.children, 'LegendRamp', `${context.id}:ramp`);
      sample = slot.value;

      continue;
    }

    if (isValidElement<LegendTickProps>(child) && child.type === LegendTick) {
      const label = collectOptionalSlot(child.props.children, 'LegendTick label', `${context.id}:ticks:${index}:label`);

      ticks.push({
        key: child.props.tickKey,
        offset: child.props.offset,
        ...(label.value === undefined ? {} : { label: label.value }),
      });
      continue;
    }

    throw new RetikzStandardError({
      code: RetikzStandardErrorCode.AuthoringInvalid,
      message: 'Ramp Legend accepts only LegendTitle, LegendRamp, and LegendTick as direct children.',
      details: { form: 'ramp' },
    });
  }

  if (sample === undefined) {
    throw new RetikzStandardError({
      code: RetikzStandardErrorCode.AuthoringInvalid,
      message: 'Ramp Legend requires exactly one LegendRamp.',
      details: { form: 'ramp', marker: 'LegendRamp' },
    });
  }

  return {
    value: { ...(title === undefined ? {} : { title }), sample, ticks },
  };
};
