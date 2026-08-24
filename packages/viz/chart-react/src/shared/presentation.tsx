import type { IRFont, IRLine, IRTextBlock } from '@retikz/core';
import type { FC, ReactNode } from 'react';

import { Text } from '@retikz/react';
import { createElement, Fragment, isValidElement } from 'react';

import { RetikzChartReactError } from '../error';

/** Chart marker 中支持的整行 Text authoring */
export type ChartTextAuthoring = ReactNode;

/** Headless Chart presentation marker 的公共字段 */
export type ChartPresentationMarkerProps = Readonly<{
  /** marker 正文：字符串、透明 Fragment 或 Core Text */
  children: ChartTextAuthoring;
}>;

type ChartPresentationMarkerSlot = 'title' | 'subtitle' | 'note' | 'source';

type ChartPresentationMarkerComponent = FC<ChartPresentationMarkerProps> & {
  presentationSlot: ChartPresentationMarkerSlot;
};

const createPresentationMarker = (slot: ChartPresentationMarkerSlot): ChartPresentationMarkerComponent => {
  const Marker: FC<ChartPresentationMarkerProps> = () => null;
  const component = Marker as ChartPresentationMarkerComponent;
  component.presentationSlot = slot;
  component.displayName = `Chart${slot.slice(0, 1).toUpperCase()}${slot.slice(1)}`;
  return component;
};

/** Chart 标题的 headless JSX marker */
export const ChartTitle = createPresentationMarker('title');
/** Chart 副标题的 headless JSX marker */
export const ChartSubtitle = createPresentationMarker('subtitle');
/** Chart 注记的 headless JSX marker */
export const ChartNote = createPresentationMarker('note');
/** Chart 来源的 headless JSX marker */
export const ChartSource = createPresentationMarker('source');

const isPresentationMarker = (value: unknown): value is ChartPresentationMarkerComponent =>
  value === ChartTitle || value === ChartSubtitle || value === ChartNote || value === ChartSource;

type ChartTextLine = IRLine;

const textLinesOf = (children: ReactNode): Array<ChartTextLine> => {
  const lines: Array<ChartTextLine> = [];
  const append = (value: ReactNode): void => {
    if (value === null || value === undefined || typeof value === 'boolean') return;
    if (Array.isArray(value)) {
      value.forEach(append);
      return;
    }
    if (typeof value === 'string') {
      lines.push(value);
      return;
    }
    if (isValidElement(value) && value.type === Fragment) {
      append(value.props.children as ReactNode);
      return;
    }
    if (isValidElement(value) && value.type === Text) {
      const props = value.props as { children: string | number; fill?: string; opacity?: number; font?: IRFont };
      const text = String(props.children);
      const line: ChartTextLine =
        props.fill === undefined && props.opacity === undefined && props.font === undefined
          ? text
          : {
              text,
              ...(props.fill === undefined ? {} : { fill: props.fill }),
              ...(props.opacity === undefined ? {} : { opacity: props.opacity }),
              ...(props.font === undefined ? {} : { font: props.font }),
            };
      lines.push(line);
      return;
    }
    throw new RetikzChartReactError('chart react: presentation marker children accept only strings, Fragment, or Text');
  };
  append(children);
  if (lines.length === 0)
    throw new RetikzChartReactError('chart react: presentation marker requires at least one text line');
  return lines;
};

const textBlockOf = (children: ReactNode): IRTextBlock => {
  const lines = textLinesOf(children);
  const first = lines.at(0);
  if (first === undefined)
    throw new RetikzChartReactError('chart react: presentation marker requires at least one text line');
  return lines.length === 1 && typeof first === 'string' ? first : lines;
};

/** React children 中提取出的固定 presentation slots 与剩余 children */
export type ChartPresentationMarkerSplit = Readonly<{
  presentation: Partial<Record<ChartPresentationMarkerSlot, IRTextBlock>>;
  plotChildren: ReactNode;
}>;

/** 从透明 Fragment 中抽取 presentation marker
 *
 * Marker 的 JSX 出现顺序只影响遍历，不影响固定 slot；同一个 slot 第二次
 * 出现时立即通过 Chart React 错误边界 fail-loud
 */
export const splitPresentationMarkers = (children: ReactNode): ChartPresentationMarkerSplit => {
  const presentation: Partial<Record<ChartPresentationMarkerSlot, IRTextBlock>> = {};
  const visit = (value: ReactNode): ReactNode => {
    if (Array.isArray(value)) return value.map(visit);
    if (!isValidElement(value)) return value;
    if (value.type === Fragment) return createElement(Fragment, null, visit(value.props.children as ReactNode));
    if (!isPresentationMarker(value.type)) return value;
    const slot = value.type.presentationSlot;
    if (presentation[slot] !== undefined) {
      throw new RetikzChartReactError(`chart react: presentation marker '${slot}' may appear at most once`);
    }
    presentation[slot] = textBlockOf((value.props as ChartPresentationMarkerProps).children);
    return null;
  };
  return { presentation, plotChildren: visit(children) };
};

/** 判断处理 presentation marker 后是否仍包含未消费的 children */
export const hasPlotChild = (value: ReactNode): boolean => {
  if (value === null || value === undefined || typeof value === 'boolean') return false;
  if (Array.isArray(value)) return value.some(hasPlotChild);
  if (isValidElement(value) && value.type === Fragment) return hasPlotChild(value.props.children as ReactNode);
  return true;
};
