import type { ReactInputEmbedContext } from '@retikz/react';
import type { InputLegend } from '@retikz/standard-vanilla';
import type { AnyInputEmbedAdapter } from '@retikz/vanilla';
import type { ReactElement, ReactNode } from 'react';

import { createInputScene } from '@retikz/react';
import { Children, Fragment, isValidElement } from 'react';

import type { LegendItemProps, LegendRampProps, LegendTickProps, LegendTitleProps } from './LegendMarkers';

import { LegendItem, LegendRamp, LegendTick, LegendTitle } from './LegendMarkers';

type LegendChild = NonNullable<InputLegend['title']>;
type CollectedLegend<T> = Readonly<{ value: T; adapters: ReadonlyArray<AnyInputEmbedAdapter> }>;
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

/** 收集 required marker slot 的唯一 Input child 与递归 adapter */
const collectRequiredSlot = (
  children: ReactNode,
  label: string,
  embedIdPrefix: string,
): CollectedLegend<LegendChild> => {
  const nodes = flattenLegendNodes(children);
  if (nodes.length !== 1 || !isConvertibleElement(nodes[0])) {
    throw new Error(`${label} must contain exactly one convertible React element.`);
  }
  const input = createInputScene(nodes[0], { embedIdPrefix });
  const childrenInput = input.scene.children;
  if (childrenInput === undefined || childrenInput.length !== 1) {
    throw new Error(`${label} must contain exactly one authoring child.`);
  }
  return { value: childrenInput[0], adapters: input.adapters };
};

/** 收集 optional marker slot 的零或一个 Input child 与递归 adapter */
const collectOptionalSlot = (
  children: ReactNode,
  label: string,
  embedIdPrefix: string,
): CollectedLegend<LegendChild | undefined> => {
  const nodes = flattenLegendNodes(children);
  if (nodes.length === 0) return { value: undefined, adapters: [] };
  if (nodes.length !== 1 || !isConvertibleElement(nodes[0])) {
    throw new Error(`${label} must contain at most one convertible React element.`);
  }
  const input = createInputScene(nodes[0], { embedIdPrefix });
  const childrenInput = input.scene.children;
  if (childrenInput === undefined || childrenInput.length !== 1) {
    throw new Error(`${label} must contain at most one authoring child.`);
  }
  return { value: childrenInput[0], adapters: input.adapters };
};

/** 合并多个 marker slot 收集的递归 adapter */
const adaptersOf = (parts: ReadonlyArray<CollectedLegend<unknown>>): ReadonlyArray<AnyInputEmbedAdapter> =>
  Object.freeze(parts.flatMap(part => part.adapters));

/** 收集 items form 的直属 marker 输入 */
export const convertLegendItemsChildren = (
  children: ReactNode,
  context: ReactInputEmbedContext,
): CollectedLegend<LegendItemsChildren> => {
  let title: LegendChild | undefined;
  const items: LegendItemsChildren['items'] = [];
  const parts: Array<CollectedLegend<unknown>> = [];
  for (const [index, child] of flattenLegendNodes(children).entries()) {
    if (isValidElement<LegendTitleProps>(child) && child.type === LegendTitle) {
      if (title !== undefined) throw new Error('Legend accepts at most one LegendTitle.');
      const slot = collectRequiredSlot(child.props.children, 'LegendTitle', `${context.id}:title`);
      title = slot.value;
      parts.push(slot);
      continue;
    }
    if (isValidElement<LegendItemProps>(child) && child.type === LegendItem) {
      const sample = collectRequiredSlot(
        child.props.sample,
        'LegendItem sample',
        `${context.id}:items:${index}:sample`,
      );
      const label = collectOptionalSlot(child.props.children, 'LegendItem label', `${context.id}:items:${index}:label`);
      parts.push(sample, label);
      items.push({
        key: child.props.itemKey,
        sample: sample.value,
        ...(label.value === undefined ? {} : { label: label.value }),
      });
      continue;
    }
    throw new Error('Items Legend accepts only LegendTitle and LegendItem as direct children.');
  }
  return {
    value: { ...(title === undefined ? {} : { title }), items },
    adapters: adaptersOf(parts),
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
  const parts: Array<CollectedLegend<unknown>> = [];
  for (const [index, child] of flattenLegendNodes(children).entries()) {
    if (isValidElement<LegendTitleProps>(child) && child.type === LegendTitle) {
      if (title !== undefined) throw new Error('Legend accepts at most one LegendTitle.');
      const slot = collectRequiredSlot(child.props.children, 'LegendTitle', `${context.id}:title`);
      title = slot.value;
      parts.push(slot);
      continue;
    }
    if (isValidElement<LegendRampProps>(child) && child.type === LegendRamp) {
      if (sample !== undefined) throw new Error('Ramp Legend requires exactly one LegendRamp.');
      const slot = collectRequiredSlot(child.props.children, 'LegendRamp', `${context.id}:ramp`);
      sample = slot.value;
      parts.push(slot);
      continue;
    }
    if (isValidElement<LegendTickProps>(child) && child.type === LegendTick) {
      const label = collectOptionalSlot(child.props.children, 'LegendTick label', `${context.id}:ticks:${index}:label`);
      parts.push(label);
      ticks.push({
        key: child.props.tickKey,
        offset: child.props.offset,
        ...(label.value === undefined ? {} : { label: label.value }),
      });
      continue;
    }
    throw new Error('Ramp Legend accepts only LegendTitle, LegendRamp, and LegendTick as direct children.');
  }
  if (sample === undefined) throw new Error('Ramp Legend requires exactly one LegendRamp.');
  return {
    value: { ...(title === undefined ? {} : { title }), sample, ticks },
    adapters: adaptersOf(parts),
  };
};
