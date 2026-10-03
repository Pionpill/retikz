import { IntervalMark, PlotAxis, PlotScale, RelationMark } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import { PreviewPlot as Plot } from '@/modules/docs/components/component-preview/theme';

import {
  RELATION_INTERVAL_CONTROL_IDS,
  relationDecreaseOperation,
  relationIncreaseOperation,
  relationIntervalRowsOf,
} from './relation-interval.controls';

/** 图形参数 */
export type RelationIntervalPreviewValues = {
  'relation-interval-offset': number;
  'relation-interval-stroke-width': number;
  'relation-interval-line-style': 'dashed' | 'solid' | 'dotted';
  'relation-interval-label-position': number;
  'relation-interval-label-side': 'top' | 'bottom' | 'center';
  'relation-interval-label-sloped': boolean;
  'relation-interval-bar-label-position': 'top' | 'bottom' | 'center' | 'right' | 'left';
  'relation-interval-bar-label-color': string;
};

/** 绘制示例图形 */
export const RelationIntervalPreview = (values: RelationIntervalPreviewValues) => {
  const lineStyle = values[RELATION_INTERVAL_CONTROL_IDS.lineStyle];
  const labelSide = values[RELATION_INTERVAL_CONTROL_IDS.labelSide];
  const lineOptions =
    lineStyle === 'dashed'
      ? { dashPattern: [5, 4] }
      : lineStyle === 'dotted'
        ? { dashPattern: [1, 4], lineCap: 'round' as const }
        : {};
  const data = relationIntervalRowsOf(values);

  return (
    <Layout viewBox={{ x: -20, y: -50, width: 660, height: 390 }}>
      <Plot data={data} width={620} height={320}>
        <PlotScale dimension="x" type="band" paddingOuter={0} />
        <PlotScale dimension="y" type="linear" domainPadding={{ lower: 0 }} />
        <PlotAxis dimension="x" tickLabels={false} />
        <PlotAxis dimension="y" grid ticks={{ count: 4 }} />
        <IntervalMark
          x="slot"
          y="value"
          color="phase"
          stroke="#ffffff"
          strokeWidth={0.8}
          label="label"
          labelPosition={values[RELATION_INTERVAL_CONTROL_IDS.barLabelPosition]}
          labelDistance={4}
          labelTextColor={values[RELATION_INTERVAL_CONTROL_IDS.barLabelColor]}
          labelFont={{ size: 10, weight: 'bold' }}
        />
        <RelationMark
          transform={[{ operation: relationDecreaseOperation }]}
          source={{ project: { x: 'sourceX', y: 'sourceY' } }}
          target={{ project: { x: 'targetX', y: 'targetY' } }}
          style={{
            color: { kind: 'constant', value: '#b91c1c' },
            strokeWidth: { kind: 'constant', value: values[RELATION_INTERVAL_CONTROL_IDS.strokeWidth] },
          }}
          path={{
            via: [{ project: { x: 'sourceX', y: 'sourceViaY' } }],
            routing: { kind: 'orthogonal', via: '-|', labelStep: 'main' },
            label: {
              text: { field: 'deltaLabel' },
              position: values[RELATION_INTERVAL_CONTROL_IDS.labelPosition],
              ...(labelSide === 'center' ? { placement: 'inside' as const } : { side: labelSide }),
              sloped: values[RELATION_INTERVAL_CONTROL_IDS.labelSloped],
              textColor: 'currentColor',
              font: { size: 10, weight: 'bold' },
            },
            options: {
              marks: [{ pos: 1, mark: { kind: 'arrow' } }],
              style: lineOptions,
            },
          }}
        />
        <RelationMark
          transform={[{ operation: relationIncreaseOperation }]}
          source={{ project: { x: 'sourceX', y: 'sourceY' } }}
          target={{ project: { x: 'targetX', y: 'targetY' } }}
          style={{
            color: { kind: 'constant', value: '#15803d' },
            strokeWidth: { kind: 'constant', value: values[RELATION_INTERVAL_CONTROL_IDS.strokeWidth] },
          }}
          path={{
            via: [{ project: { x: 'sourceX', y: 'sourceViaY' } }],
            routing: { kind: 'orthogonal', via: '-|', labelStep: 'main' },
            label: {
              text: { field: 'deltaLabel' },
              position: values[RELATION_INTERVAL_CONTROL_IDS.labelPosition],
              ...(labelSide === 'center' ? { placement: 'inside' as const } : { side: labelSide }),
              sloped: values[RELATION_INTERVAL_CONTROL_IDS.labelSloped],
              textColor: 'currentColor',
              font: { size: 10, weight: 'bold' },
            },
            options: {
              marks: [{ pos: 1, mark: { kind: 'arrow' } }],
              style: lineOptions,
            },
          }}
        />
      </Plot>
    </Layout>
  );
};
