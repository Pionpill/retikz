import { Layout } from '@retikz/react';
import { Grid } from '@retikz/standard-react/presentation';

/** 图形参数 */
export type GridPlaygroundPreviewValues = {
  boundsStart: [number, number];
  boundsEnd: [number, number];
  lineStroke: string;
  lineStrokeWidth: number;
  lineOpacity: number;
  lineDashed: boolean;
  majorEnabled: boolean;
  majorEvery: number;
  majorOffset: number;
  majorStroke: string;
  majorStrokeWidth: number;
  majorOpacity: number;
  majorDashed: boolean;
  borderEnabled: boolean;
  borderPadding: number;
  borderOrder: 'front' | 'behind';
  borderExtendLines: boolean;
  borderStroke: string;
  borderStrokeWidth: number;
  borderOpacity: number;
  borderFill: string;
  borderFillOpacity: number;
  borderDashed: boolean;
  spacingMode: 'uniform' | 'axis';
  spacing: number;
  spacingX: number;
  originEnabled: boolean;
  originX: number;
  includeBoundary: boolean;
  spacingY: number;
  originY: number;
};

/** 绘制示例图形 */
export const renderGridPlaygroundPreview = (values: GridPlaygroundPreviewValues) => {
  const bounds = {
    start: values.boundsStart,
    end: values.boundsEnd,
  };

  const lineStyle = {
    stroke: values.lineStroke,
    strokeWidth: values.lineStrokeWidth,
    strokeOpacity: values.lineOpacity,
    ...(values.lineDashed ? { dashPattern: [6, 4] } : {}),
  };
  const major = values.majorEnabled
    ? {
        every: values.majorEvery,
        offset: values.majorOffset,
        style: {
          stroke: values.majorStroke,
          strokeWidth: values.majorStrokeWidth,
          strokeOpacity: values.majorOpacity,
          ...(values.majorDashed ? { dashPattern: [6, 4] } : {}),
        },
      }
    : undefined;

  const border = values.borderEnabled
    ? {
        padding: values.borderPadding,
        order: values.borderOrder,
        extendLines: values.borderExtendLines,
        style: {
          stroke: values.borderStroke,
          strokeWidth: values.borderStrokeWidth,
          strokeOpacity: values.borderOpacity,
          fill: values.borderFill,
          fillOpacity: values.borderFillOpacity,
          ...(values.borderDashed ? { dashPattern: [6, 4] } : {}),
        },
      }
    : undefined;

  const line = {
    vertical: {
      spacing: values.spacingMode === 'uniform' ? values.spacing : values.spacingX,
      ...(values.originEnabled ? { origin: values.originX } : {}),
      includeBoundary: values.includeBoundary,
      style: lineStyle,
      ...(major === undefined ? {} : { major }),
    },
    horizontal: {
      spacing: values.spacingMode === 'uniform' ? values.spacing : values.spacingY,
      ...(values.originEnabled ? { origin: values.originY } : {}),
      includeBoundary: values.includeBoundary,
      style: lineStyle,
      ...(major === undefined ? {} : { major }),
    },
  };

  const gridInput = {
    bounds,
    line,
    ...(border === undefined ? {} : { border }),
  };

  return (
    <Layout viewBox={{ x: 0, y: 0, width: 400, height: 280 }}>
      <Grid {...gridInput} />
    </Layout>
  );
};
