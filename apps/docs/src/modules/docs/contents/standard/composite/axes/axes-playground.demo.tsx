import type { AxesInput } from '@retikz/standard';
import type { FC } from 'react';

import { Layout } from '@retikz/react';
import { Axes } from '@retikz/standard-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { axesPlaygroundControls, previewControlContract } from './axes-playground.controls';

type AxisInput = Exclude<AxesInput['x'], false | undefined>;
type AxisTicksInput = Exclude<AxisInput['ticks'], false | undefined>;
type DashMode = 'solid' | 'dashed' | 'dotted';
type TickMode = 'none' | 'spacing' | 'spacingLabels' | 'values' | 'valuesLabels';
type TickExtent = 'positive' | 'negative' | 'both';
type TickSide = 'positive' | 'negative' | 'both';
type AxisLineMode = 'off' | 'none' | 'positive' | 'negative' | 'both';
type LabelMode = 'off' | 'positive' | 'negative';

type CreateTicksOptions = {
  mode: string;
  spacing: number;
  extent: string;
  negativeValue: number;
  positiveValue: number;
  side: string;
  endpointGap: number;
  length: number;
  stroke: string;
  strokeWidth: number;
  dash: string;
  negativeText: string;
  positiveText: string;
  labelOffset: number;
  labelColor: string;
  labelSize: number;
  labelOpacity: number;
};

type CreateAxisOptions = {
  lineMode: string;
  lineStroke: string;
  lineStrokeWidth: number;
  lineDash: string;
  lineOpacity: number;
  arrowShape: string;
  arrowScale: number;
  arrowLength: number;
  arrowWidth: number;
  arrowColor: string;
  arrowOpacity: number;
  ticks: CreateTicksOptions;
  labelMode: string;
  labelText: string;
  labelOffset: number;
  labelColor: string;
  labelSize: number;
  labelOpacity: number;
};

const invalidControlValue = (controlId: string, value: string): never => {
  throw new Error(`Invalid Axes control value for '${controlId}': '${value}'.`);
};

const resolveDashMode = (value: string): DashMode => {
  if (value === 'solid' || value === 'dashed' || value === 'dotted') return value;
  return invalidControlValue('dash', value);
};

const resolveTickMode = (value: string): TickMode => {
  if (
    value === 'none' ||
    value === 'spacing' ||
    value === 'spacingLabels' ||
    value === 'values' ||
    value === 'valuesLabels'
  )
    return value;
  return invalidControlValue('tickMode', value);
};

const resolveTickExtent = (value: string): TickExtent => {
  if (value === 'positive' || value === 'negative' || value === 'both') return value;
  return invalidControlValue('tickExtent', value);
};

const resolveTickSide = (value: string): TickSide => {
  if (value === 'positive' || value === 'negative' || value === 'both') return value;
  return invalidControlValue('tickSide', value);
};

const resolveAxisLineMode = (value: string): AxisLineMode => {
  if (value === 'off' || value === 'none' || value === 'positive' || value === 'negative' || value === 'both')
    return value;
  return invalidControlValue('lineMode', value);
};

const resolveLabelMode = (value: string): LabelMode => {
  if (value === 'off' || value === 'positive' || value === 'negative') return value;
  return invalidControlValue('labelMode', value);
};

const resolveLineCap = (value: string): 'butt' | 'round' | 'square' => {
  if (value === 'butt' || value === 'round' || value === 'square') return value;
  return invalidControlValue('gridLineCap', value);
};

const resolveDashPattern = (value: string): Array<number> | undefined => {
  const mode = resolveDashMode(value);
  return mode === 'dashed' ? [6, 4] : mode === 'dotted' ? [1, 3] : undefined;
};

const createTicks = (options: CreateTicksOptions): AxisTicksInput | undefined => {
  const mode = resolveTickMode(options.mode);
  const extent = resolveTickExtent(options.extent);
  if (mode === 'none') return undefined;

  const usesSpacing = mode === 'spacing' || mode === 'spacingLabels';
  const labelsEnabled = mode === 'spacingLabels' || mode === 'valuesLabels';
  const source: AxisTicksInput['source'] = usesSpacing
    ? { kind: 'spacing', spacing: options.spacing, extent }
    : { kind: 'values', values: [options.negativeValue, options.positiveValue] };
  const entries = usesSpacing
    ? [
        ...(extent === 'positive' ? [] : [{ value: -options.spacing, text: options.negativeText }]),
        ...(extent === 'negative' ? [] : [{ value: options.spacing, text: options.positiveText }]),
      ]
    : [
        { value: options.negativeValue, text: options.negativeText },
        { value: options.positiveValue, text: options.positiveText },
      ];

  return {
    source,
    side: resolveTickSide(options.side),
    endpointGap: options.endpointGap,
    length: options.length,
    style: {
      stroke: options.stroke,
      strokeWidth: options.strokeWidth,
      ...(resolveDashPattern(options.dash) === undefined ? {} : { dashPattern: resolveDashPattern(options.dash) }),
    },
    ...(labelsEnabled
      ? {
          labels: {
            entries,
            offset: options.labelOffset,
            style: {
              textColor: options.labelColor,
              font: { size: options.labelSize },
              opacity: options.labelOpacity,
            },
          },
        }
      : {}),
  };
};

const createAxis = (options: CreateAxisOptions): AxisInput => {
  const lineMode = resolveAxisLineMode(options.lineMode);
  const labelMode = resolveLabelMode(options.labelMode);
  const line: AxisInput['line'] =
    lineMode === 'off'
      ? false
      : {
          arrows: lineMode,
          style: {
            stroke: options.lineStroke,
            strokeWidth: options.lineStrokeWidth,
            opacity: options.lineOpacity,
            ...(resolveDashPattern(options.lineDash) === undefined
              ? {}
              : { dashPattern: resolveDashPattern(options.lineDash) }),
          },
          ...(lineMode === 'none'
            ? {}
            : {
                arrowDetail: {
                  shape: options.arrowShape,
                  scale: options.arrowScale,
                  length: options.arrowLength,
                  width: options.arrowWidth,
                  color: options.arrowColor,
                  opacity: options.arrowOpacity,
                },
              }),
        };
  const ticks = createTicks(options.ticks);
  const label: AxisInput['label'] =
    labelMode === 'off'
      ? false
      : {
          text: options.labelText,
          end: labelMode,
          offset: options.labelOffset,
          style: {
            textColor: options.labelColor,
            font: { size: options.labelSize },
            opacity: options.labelOpacity,
          },
        };

  return { line, ...(ticks === undefined ? {} : { ticks }), label };
};

export const previewControls = axesPlaygroundControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const extent: AxesInput['extent'] =
    values.extentMode === 'symmetric'
      ? { x: values.extentX, y: values.extentY }
      : {
          x: { negative: values.xNegative, positive: values.xPositive },
          y: { negative: values.yNegative, positive: values.yPositive },
        };
  const x = createAxis({
    lineMode: values.xLineMode,
    lineStroke: values.xLineStroke,
    lineStrokeWidth: values.xLineStrokeWidth,
    lineDash: values.xLineDash,
    lineOpacity: values.xLineOpacity,
    arrowShape: values.xArrowShape,
    arrowScale: values.xArrowScale,
    arrowLength: values.xArrowLength,
    arrowWidth: values.xArrowWidth,
    arrowColor: values.xArrowColor,
    arrowOpacity: values.xArrowOpacity,
    ticks: {
      mode: values.xTickMode,
      spacing: values.xTickSpacing,
      extent: values.xTickExtent,
      negativeValue: values.xTickNegativeValue,
      positiveValue: values.xTickPositiveValue,
      side: values.xTickSide,
      endpointGap: values.xTickEndpointGap,
      length: values.xTickLength,
      stroke: values.xTickStroke,
      strokeWidth: values.xTickStrokeWidth,
      dash: values.xTickDash,
      negativeText: values.xTickLabelNegativeText,
      positiveText: values.xTickLabelPositiveText,
      labelOffset: values.xTickLabelOffset,
      labelColor: values.xTickLabelColor,
      labelSize: values.xTickLabelSize,
      labelOpacity: values.xTickLabelOpacity,
    },
    labelMode: values.xLabelMode,
    labelText: values.xLabelText,
    labelOffset: values.xLabelOffset,
    labelColor: values.xLabelColor,
    labelSize: values.xLabelSize,
    labelOpacity: values.xLabelOpacity,
  });
  const y = createAxis({
    lineMode: values.yLineMode,
    lineStroke: values.yLineStroke,
    lineStrokeWidth: values.yLineStrokeWidth,
    lineDash: values.yLineDash,
    lineOpacity: values.yLineOpacity,
    arrowShape: values.yArrowShape,
    arrowScale: values.yArrowScale,
    arrowLength: values.yArrowLength,
    arrowWidth: values.yArrowWidth,
    arrowColor: values.yArrowColor,
    arrowOpacity: values.yArrowOpacity,
    ticks: {
      mode: values.yTickMode,
      spacing: values.yTickSpacing,
      extent: values.yTickExtent,
      negativeValue: values.yTickNegativeValue,
      positiveValue: values.yTickPositiveValue,
      side: values.yTickSide,
      endpointGap: values.yTickEndpointGap,
      length: values.yTickLength,
      stroke: values.yTickStroke,
      strokeWidth: values.yTickStrokeWidth,
      dash: values.yTickDash,
      negativeText: values.yTickLabelNegativeText,
      positiveText: values.yTickLabelPositiveText,
      labelOffset: values.yTickLabelOffset,
      labelColor: values.yTickLabelColor,
      labelSize: values.yTickLabelSize,
      labelOpacity: values.yTickLabelOpacity,
    },
    labelMode: values.yLabelMode,
    labelText: values.yLabelText,
    labelOffset: values.yLabelOffset,
    labelColor: values.yLabelColor,
    labelSize: values.yLabelSize,
    labelOpacity: values.yLabelOpacity,
  });
  const gridDashPattern = resolveDashPattern(values.gridDash);
  const axesInput: AxesInput = {
    origin: [values.originX, values.originY],
    extent,
    ...(values.gridEnabled
      ? {
          grid: {
            spacing:
              values.gridSpacingMode === 'uniform'
                ? values.gridSpacing
                : { x: values.gridSpacingX, y: values.gridSpacingY },
            offset: [values.gridOffsetX, values.gridOffsetY],
            style: {
              stroke: values.gridStroke,
              strokeWidth: values.gridStrokeWidth,
              dashOffset: values.gridDashOffset,
              lineCap: resolveLineCap(values.gridLineCap),
              opacity: values.gridOpacity,
              ...(gridDashPattern === undefined ? {} : { dashPattern: gridDashPattern }),
            },
            ...(values.gridSeparateDirections
              ? {
                  vertical: { stroke: values.gridVerticalStroke },
                  horizontal: { stroke: values.gridHorizontalStroke },
                }
              : {}),
          },
        }
      : {}),
    x: values.axisMode === 'y' ? false : x,
    y: values.axisMode === 'x' ? false : y,
    originLabel: values.originLabelEnabled
      ? {
          text: values.originLabelText,
          offset: values.originLabelOffset,
          style: {
            textColor: values.originLabelColor,
            font: { size: values.originLabelSize },
            opacity: values.originLabelOpacity,
          },
        }
      : false,
  };

  return (
    <Layout
      width={400}
      height={280}
      viewBox={{ x: 0, y: 0, width: 400, height: 280 }}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <Axes {...axesInput} />
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/** Axes 全量公开属性控制面板 */
const Demo: FC = controlledPreview.Component;

export default Demo;
