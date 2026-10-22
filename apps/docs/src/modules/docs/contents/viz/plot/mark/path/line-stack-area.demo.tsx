import type { PathCurve } from '@retikz/plot';
import { PathMark, PlotAxis, PlotLegend, PlotScale } from '@retikz/plot-react';
import { Layout } from '@retikz/react';
import type { FC } from 'react';

import { PreviewPlot as Plot } from '@/modules/docs/components/component-preview/theme';
import { defineControlledPreview } from '@/modules/docs/preview';

import { LINE_STACK_AREA_CURVE_ID, previewControlContract } from './line-stack-area.controls';
import { stackArea } from './line-stack-area.data';

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const curve: PathCurve = values[LINE_STACK_AREA_CURVE_ID];
  return (
    <Layout>
      <Plot
        data={stackArea}
        width={360}
        height={230}
        position={[0, 35]}

        defaultPlot={{ palette: { categorical: ['#2563eb', '#f97316'] } }}
      >
        <PlotScale dimension="x" type="point" padding={0} />
        <PlotScale dimension="y" type="linear" domainPadding={0} />
        <PathMark
          encodings={{
            order: 'order',
            series: 'segment',
            color: 'segment',
            fill: 'segment',
            closure: { baseline: 'y0' },
            position: { x: { field: 'month' }, y: { field: 'y1' } },
          }}
          properties={{ curve, closure: { kind: 'stack' }, stroke: 'none' }}
        />
        <PathMark
          encodings={{
            order: 'order',
            series: 'segment',
            color: 'segment',
            position: { x: { field: 'month' }, y: { field: 'y1' } },
          }}
          properties={{ curve, strokeWidth: 2 }}
        />
        <PlotAxis dimension="x" />
        <PlotAxis dimension="y" grid />
        <PlotLegend channel="color" />
      </Plot>
      <Plot
        data={stackArea}
        width={280}
        height={280}
        coordinate="polar2D"
        position={[410, 10]}

        defaultPlot={{ palette: { categorical: ['#2563eb', '#f97316'] } }}
      >
        <PlotScale dimension="y" type="linear" domainPadding={0} />
        <PathMark
          encodings={{
            order: 'order',
            series: 'segment',
            color: 'segment',
            fill: 'segment',
            closure: { baseline: 'y0' },
            position: { x: { field: 'month' }, y: { field: 'y1' } },
          }}
          properties={{ curve, closure: { kind: 'stack' }, stroke: 'none' }}
        />
        <PathMark
          encodings={{
            order: 'order',
            series: 'segment',
            color: 'segment',
            position: { x: { field: 'month' }, y: { field: 'y1' } },
          }}
          properties={{ curve, strokeWidth: 2 }}
        />
        <PlotAxis dimension="x" />
        <PlotAxis dimension="y" grid />
      </Plot>
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

const Demo: FC = controlledPreview.Component;

export default Demo;
