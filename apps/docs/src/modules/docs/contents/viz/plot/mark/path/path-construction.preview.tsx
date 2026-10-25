import { PathMark, Plot, PlotAxis, PlotPathStep, PlotScale, IntervalMark } from '@retikz/plot-react';
import { Layout } from '@retikz/react';
import type { FC } from 'react';

import { rows } from './path-construction.data';

/** 路径构造示例参数 */
export type PathConstructionValues = {
  kind: 'line' | 'bend' | 'fold';
  angle: number;
  direction: 'left' | 'right';
  via: '-|' | '|-' | '-|-' | '|-|';
  fraction: number;
  radius: number;
  width: number;
  arrow: 'none' | 'end' | 'both';
  dashed: boolean;
  labelPosition: number;
};
/** 固定成对柱状关系，观察路径构造与样式变化 */
export const PathConstructionPreview: FC<PathConstructionValues> = props => {
  const { kind, angle, direction, via, fraction, radius, width, arrow, dashed, labelPosition } = props;
  const target = { mark: 'bars', key: { field: 'targetId' }, anchor: 'top' as const };
  return (
    <Layout viewBox={{ x: -15, y: -15, width: 650, height: 320 }}>
      <Plot data={rows} width={620} height={280}>
        <PlotScale dimension="x" type="band" paddingOuter={0.2} />
        <PlotScale dimension="y" type="linear" domain={[0, 400]} domainPadding={0} />
        <IntervalMark
          id="bars"
          group="phase"
          arrangement="dodge"
          encodings={{
            anchorId: 'slot',
            color: 'phase',
            position: { x: { field: 'pair' }, y: { field: 'value' } },
            label: { text: 'label' },
          }}
          properties={{ label: { position: 'center', distance: 0, textColor: '#ffffff', font: { size: 10 } } }}
        />
        <PathMark
          transforms={[
            {
              operation: {
                kind: 'relate',
                params: {
                  groupBy: ['pair'],
                  source: { selector: { kind: 'min', by: 'order' }, fields: { id: 'slot' } },
                  target: { selector: { kind: 'max', by: 'order' }, fields: { id: 'slot' } },
                  measures: [
                    { op: 'difference', field: 'value', as: 'delta', labelAs: 'deltaLabel', labelPrefix: '+' },
                  ],
                },
              },
            },
          ]}
          encodings={{ label: { text: 'deltaLabel' } }}
          arrow={arrow === 'none' ? undefined : arrow === 'both' ? '<->' : '->'}
          properties={{
            strokeWidth: width,
            cornerRadius: kind === 'fold' ? radius : undefined,
            dashPattern: dashed ? [6, 4] : undefined,
            label: { position: labelPosition, distance: 4, font: { size: 10 } },
          }}
        >
          <PlotPathStep kind="move" to={{ mark: 'bars', key: { field: 'sourceId' }, anchor: 'top' }} />
          {kind === 'fold' && <PlotPathStep kind="line" to={{ relative: [0, -60] }} />}
          {kind === 'line' ? (
            <PlotPathStep kind="line" to={target} />
          ) : kind === 'bend' ? (
            <PlotPathStep kind="bend" to={target} bendDirection={direction} bendAngle={angle} />
          ) : via === '-|' || via === '|-' ? (
            <PlotPathStep kind="fold" to={target} via={via} />
          ) : (
            <PlotPathStep kind="fold" to={target} via={via} fraction={fraction} />
          )}
        </PathMark>
        <PlotAxis dimension="x" />
        <PlotAxis dimension="y" />
      </Plot>
    </Layout>
  );
};
