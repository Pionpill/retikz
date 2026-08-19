import type { ChartPresentationFlexItem, ChartPresentationPresetValue } from '@retikz/chart';
import type { InputChartPresentationRecord } from '@retikz/chart-vanilla';
import type { IRFont, IRLine, IRNode, IRTextBlock } from '@retikz/core';
import type { FC, ReactNode } from 'react';

import { ChartPresentationPreset } from '@retikz/chart';
import { Text } from '@retikz/react';
import { createElement, Fragment, isValidElement } from 'react';

import { RetikzChartReactError } from '../error';

/** Chart marker 中支持的整行 Text authoring */
export type ChartTextAuthoring = ReactNode;

/** Headless Chart presentation marker 的公共字段 */
export type ChartPresentationMarkerProps = ChartPresentationFlexItem & {
  /** marker 正文：字符串、透明 Fragment 或 Core Text */
  children: ChartTextAuthoring;
  /** authoring 期位置；不进入 canonical IR */
  position?: 'top' | 'bottom';
  /** block-level 字体覆盖 */
  font?: IRFont;
  /** block-level 文本颜色覆盖 */
  textColor?: IRNode['textColor'];
  /** block-level 文本对齐覆盖 */
  align?: IRNode['align'];
  /** block-level 行高覆盖 */
  lineHeight?: IRNode['lineHeight'];
  /** block-level 最大文本宽度覆盖 */
  maxTextWidth?: IRNode['maxTextWidth'];
};

type ChartPresentationMarkerComponent = FC<ChartPresentationMarkerProps> & {
  presentationPreset: ChartPresentationPresetValue;
};

const createPresentationMarker = (preset: ChartPresentationPresetValue): ChartPresentationMarkerComponent => {
  const Marker: FC<ChartPresentationMarkerProps> = () => null;
  const component = Marker as ChartPresentationMarkerComponent;
  component.presentationPreset = preset;
  component.displayName = `Chart${preset.slice(0, 1).toUpperCase()}${preset.slice(1)}`;
  return component;
};

/** Chart 标题的 headless JSX marker */
export const ChartTitle = createPresentationMarker(ChartPresentationPreset.Title);
/** Chart 副标题的 headless JSX marker */
export const ChartSubtitle = createPresentationMarker(ChartPresentationPreset.Subtitle);
/** Chart 注记的 headless JSX marker */
export const ChartNote = createPresentationMarker(ChartPresentationPreset.Note);
/** Chart 来源的 headless JSX marker */
export const ChartSource = createPresentationMarker(ChartPresentationPreset.Source);

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

const recordOf = (
  preset: ChartPresentationPresetValue,
  props: ChartPresentationMarkerProps,
): InputChartPresentationRecord => {
  const {
    children,
    position,
    font,
    textColor,
    align,
    lineHeight,
    maxTextWidth,
    margin,
    basis,
    grow,
    shrink,
    min,
    max,
    alignSelf,
  } = props;
  return {
    preset,
    text: textBlockOf(children),
    ...(position === undefined ? {} : { position }),
    ...(font === undefined ? {} : { font }),
    ...(textColor === undefined ? {} : { textColor }),
    ...(align === undefined ? {} : { align }),
    ...(lineHeight === undefined ? {} : { lineHeight }),
    ...(maxTextWidth === undefined ? {} : { maxTextWidth }),
    ...(margin === undefined ? {} : { margin }),
    ...(basis === undefined ? {} : { basis }),
    ...(grow === undefined ? {} : { grow }),
    ...(shrink === undefined ? {} : { shrink }),
    ...(min === undefined ? {} : { min }),
    ...(max === undefined ? {} : { max }),
    ...(alignSelf === undefined ? {} : { alignSelf }),
  };
};

export type ChartPresentationMarkerSplit = {
  presentation: Array<InputChartPresentationRecord>;
  plotChildren: ReactNode;
};

/** 从透明 Fragment 中按出现顺序抽取 marker，同时保留其余 Plot React tree 的位置 */
export const splitPresentationMarkers = (children: ReactNode): ChartPresentationMarkerSplit => {
  const presentation: Array<InputChartPresentationRecord> = [];
  const visit = (value: ReactNode): ReactNode => {
    if (Array.isArray(value)) return value.map(visit);
    if (!isValidElement(value)) return value;
    if (value.type === Fragment) return createElement(Fragment, null, visit(value.props.children as ReactNode));
    if (!isPresentationMarker(value.type)) return value;
    presentation.push(recordOf(value.type.presentationPreset, value.props as ChartPresentationMarkerProps));
    return null;
  };
  return { presentation, plotChildren: visit(children) };
};

/** 判断处理 marker 后是否仍包含 Plot authoring child */
export const hasPlotChild = (value: ReactNode): boolean => {
  if (value === null || value === undefined || typeof value === 'boolean') return false;
  if (Array.isArray(value)) return value.some(hasPlotChild);
  if (isValidElement(value) && value.type === Fragment) return hasPlotChild(value.props.children as ReactNode);
  return true;
};
