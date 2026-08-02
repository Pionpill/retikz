import type { IRChild } from '@retikz/core';
import type { FC } from 'react';

import { Layout } from '@retikz/react';
import { LegendContentKind } from '@retikz/standard';
import { Legend } from '@retikz/standard-react';

import type { PreviewControlValuesFor } from '@/modules/docs/preview';

import { defineControlledPreview } from '@/modules/docs/preview';

import { legendPlaygroundControls, previewControlContract } from './legend-playground.controls';

export const previewControls = legendPlaygroundControls;

const LEGEND_WIDTH = 300;

type LegendPlaygroundValues = PreviewControlValuesFor<typeof legendPlaygroundControls>;

const sample = (id: string, color: string, height: number): IRChild => ({
  type: 'node',
  id,
  position: [0, 0],
  text: '',
  minimumSize: { width: 28, height },
  padding: 0,
  stroke: color,
  fill: color,
  fillOpacity: 0.14,
  cornerRadius: 4,
});

const label = (id: string, text: string): IRChild => ({ type: 'node', id, position: [0, 0], text, stroke: 'none' });

const title = (text: string, values: LegendPlaygroundValues): IRChild => ({
  type: 'node',
  id: 'legend-title',
  position: [0, 0],
  text,
  align: values.titleAlign,
  font: {
    size: values.titleFontSize,
    weight: values.titleFontWeight,
    style: values.titleFontStyle,
  },
  padding: 0,
  stroke: 'none',
  fill: 'none',
});

const rampSample = (direction: 'vertical' | 'horizontal'): IRChild => ({
  type: 'node',
  id: 'ramp-sample',
  position: [0, 0],
  text: '',
  minimumSize: direction === 'horizontal' ? { width: 160, height: 16 } : { width: 16, height: 120 },
  padding: 0,
  stroke: 'lightgray',
  fill: {
    kind: 'linearGradient',
    angle: direction === 'horizontal' ? 0 : 90,
    stops: [
      { offset: 0, color: 'dodgerblue' },
      { offset: 0.5, color: 'gold' },
      { offset: 1, color: 'orangered' },
    ],
  },
});

/** 使用控制值构造可测试的 Legend playground React authoring */
export const LegendPlaygroundPreview = (values: LegendPlaygroundValues) => (
  <Layout
    width={400}
    height={245}
    viewBox={{ x: -20, y: -20, width: 400, height: 245 }}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <Legend
      {...(values.title === '' ? {} : { title: title(values.title, values) })}
      size={{ x: { kind: 'fixed', value: LEGEND_WIDTH }, y: { kind: 'fixed', value: 175 } }}
      padding={values.padding}
      titleGap={values.titleGap}
      contentAlign={values.contentAlign}
      overflow={values.overflow}
      content={
        values.kind === LegendContentKind.Items
          ? {
              kind: LegendContentKind.Items,
              direction: values.direction,
              wrap: values.wrap,
              sampleAlign: values.sampleAlign,
              columnGap: values.columnGap,
              rowGap: values.rowGap,
              sampleGap: values.sampleGap,
              items: [
                { key: 'a', sample: sample('sample-a', 'dodgerblue', 20), label: label('label-a', 'A') },
                { key: 'b', sample: sample('sample-b', 'darkorange', 32), label: label('label-b', 'B') },
                { key: 'c', sample: sample('sample-c', 'darkviolet', 24), label: label('label-c', 'C') },
                { key: 'd', sample: sample('sample-d', 'green', 28), label: label('label-d', 'D') },
              ],
            }
          : {
              kind: LegendContentKind.Ramp,
              direction: values.direction,
              sample: rampSample(values.direction),
              sampleGap: values.sampleGap,
              ticks: [
                { key: 'start', offset: 0, label: label('tick-start', '0') },
                { key: 'middle', offset: 0.5, label: label('tick-middle', '50') },
                { key: 'end', offset: 1, label: label('tick-end', '100') },
              ],
            }
      }
    />
  </Layout>
);

const controlledPreview = defineControlledPreview(previewControlContract, LegendPlaygroundPreview);

export const previewSource = controlledPreview.source;

/** Legend 排列、换行、对齐、间距与溢出 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
