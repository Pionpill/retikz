import type { LegendInput } from '@retikz/standard';
import type { ReactElement, ReactNode } from 'react';

import { convertReactNodeToIR } from '@retikz/react';
import { Children, Fragment, isValidElement } from 'react';

import type { LegendItemProps, LegendRampProps, LegendTickProps, LegendTitleProps } from './LegendMarkers';

import { LegendItem, LegendRamp, LegendTick, LegendTitle } from './LegendMarkers';

type LegendChild = NonNullable<LegendInput['title']>;

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
      flattenLegendNodes((child as ReactElement<{ children?: ReactNode }>).props.children).forEach(value =>
        flattened.push(value),
      );
      return;
    }
    flattened.push(child);
  });
  return flattened;
};

/** 判断 slot element 是否能进入同步 React builder */
const isConvertibleElement = (node: ReactNode): node is ReactElement =>
  isValidElement(node) && typeof node.type === 'function';

/** 把 required marker slot 转换为恰好一个 IRChild */
const convertRequiredSlot = (children: ReactNode, label: string): LegendChild => {
  const nodes = flattenLegendNodes(children);
  if (nodes.length !== 1 || !isConvertibleElement(nodes[0])) {
    throw new Error(`${label} must contain exactly one convertible React element.`);
  }
  const converted = convertReactNodeToIR(nodes[0]).children;
  if (converted.length !== 1) {
    throw new Error(`${label} must convert to exactly one IRChild.`);
  }
  return converted[0];
};

/** 把 optional marker slot 转换为零或一个 IRChild */
const convertOptionalSlot = (children: ReactNode, label: string): LegendChild | undefined => {
  const nodes = flattenLegendNodes(children);
  if (nodes.length === 0) return undefined;
  if (nodes.length !== 1 || !isConvertibleElement(nodes[0])) {
    throw new Error(`${label} must contain at most one convertible React element.`);
  }
  const converted = convertReactNodeToIR(nodes[0]).children;
  if (converted.length !== 1) {
    throw new Error(`${label} must convert to at most one IRChild.`);
  }
  return converted[0];
};

/** 读取两个 Legend form 共用的唯一标题 marker */
const readTitle = (current: LegendChild | undefined, element: ReactElement<LegendTitleProps>): LegendChild => {
  if (current !== undefined) throw new Error('Legend accepts at most one LegendTitle.');
  return convertRequiredSlot(element.props.children, 'LegendTitle');
};

/** 将 items form 的直属 marker 转换为 canonical title 与 items */
export const convertLegendItemsChildren = (children: ReactNode): LegendItemsChildren => {
  let title: LegendChild | undefined;
  const items: LegendItemsChildren['items'] = [];
  for (const child of flattenLegendNodes(children)) {
    if (isValidElement<LegendTitleProps>(child) && child.type === LegendTitle) {
      title = readTitle(title, child);
      continue;
    }
    if (isValidElement<LegendItemProps>(child) && child.type === LegendItem) {
      const label = convertOptionalSlot(child.props.children, 'LegendItem label');
      items.push({
        key: child.props.itemKey,
        sample: convertRequiredSlot(child.props.sample, 'LegendItem sample'),
        ...(label === undefined ? {} : { label }),
      });
      continue;
    }
    throw new Error('Items Legend accepts only LegendTitle and LegendItem as direct children.');
  }
  return { ...(title === undefined ? {} : { title }), items };
};

/** 将 ramp form 的直属 marker 转换为 canonical title、sample 与 ticks */
export const convertLegendRampChildren = (children: ReactNode): LegendRampChildren => {
  let title: LegendChild | undefined;
  let sample: LegendChild | undefined;
  const ticks: LegendRampChildren['ticks'] = [];
  for (const child of flattenLegendNodes(children)) {
    if (isValidElement<LegendTitleProps>(child) && child.type === LegendTitle) {
      title = readTitle(title, child);
      continue;
    }
    if (isValidElement<LegendRampProps>(child) && child.type === LegendRamp) {
      if (sample !== undefined) throw new Error('Ramp Legend requires exactly one LegendRamp.');
      sample = convertRequiredSlot(child.props.children, 'LegendRamp');
      continue;
    }
    if (isValidElement<LegendTickProps>(child) && child.type === LegendTick) {
      const label = convertOptionalSlot(child.props.children, 'LegendTick label');
      ticks.push({
        key: child.props.tickKey,
        offset: child.props.offset,
        ...(label === undefined ? {} : { label }),
      });
      continue;
    }
    throw new Error('Ramp Legend accepts only LegendTitle, LegendRamp, and LegendTick as direct children.');
  }
  if (sample === undefined) throw new Error('Ramp Legend requires exactly one LegendRamp.');
  return { ...(title === undefined ? {} : { title }), sample, ticks };
};
