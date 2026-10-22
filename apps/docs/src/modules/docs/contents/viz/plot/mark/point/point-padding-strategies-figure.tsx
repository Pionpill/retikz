import type { IRPlot } from '@retikz/plot';
import { Plot } from '@retikz/plot-react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { pointPaddingStrategiesFigureI18n } from './point-padding-strategies-figure.i18n';

/** 留白策略对照图的语言 */
export type PointPaddingStrategiesFigureProps = { lang?: Lang };

const rows = [
  { x: 0, y: 0, radius: 4 },
  { x: 5, y: 5, radius: 32 },
  { x: 10, y: 10, radius: 4 },
];

/** 使用同一数据与尺寸尺度对照两种策略及方向净空 */
const PointPaddingStrategiesFigure: FC<PointPaddingStrategiesFigureProps> = props => {
  const { lang = 'zh' } = props;
  const text = pointPaddingStrategiesFigureI18n[lang];

  return (
    <div className="grid w-full grid-cols-2 gap-3 @3xl:grid-cols-4">
      {(
        [
          { kind: 'max-radius', clearance: 0 },
          { kind: 'point-aware', clearance: 0 },
          { kind: 'max-radius', clearance: { default: 8, top: 20, left: 0 } },
          { kind: 'point-aware', clearance: { default: 8, top: 20, left: 0 } },
        ] as const
      ).map(autoPadding => {
        const spec: IRPlot = {
          namespace: 'plot',
          type: 'plot',
          data: { reference: 'rows' },
          scales: [
            { type: 'linear', name: 'x' },
            { type: 'linear', name: 'y' },
            { type: 'sqrt', name: 'radius', domain: [4, 32], range: [4, 32] },
          ],
          coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
          marks: [
            {
              type: 'point',

              encodings: {
                position: { x: { field: 'x' }, y: { field: 'y' } },
                size: { field: 'radius', scale: 'radius' },
              },
              properties: { autoPadding, opacity: { fill: 0.6 } },
            },
          ],
          guides: [
            { type: 'axis', dimension: 'x' },
            { type: 'axis', dimension: 'y', grid: true },
          ],
        };
        return (
          <div key={`${autoPadding.kind}-${typeof autoPadding.clearance}`} className="min-w-0">
            <div className="mb-1 min-h-10 text-xs leading-5">
              <p className="font-semibold">{autoPadding.kind === 'max-radius' ? text.maximum : text.aware}</p>
              <p className="text-muted-foreground">
                {typeof autoPadding.clearance === 'number' ? `${text.clearance}: 0` : text.directional}
              </p>
            </div>
            <Plot spec={spec} data={{ rows }} width={172} height={240} />
          </div>
        );
      })}
    </div>
  );
};

/** 多图比较不派生单个 Plot IR */
export const previewSource = { deriveIR: false };

export default PointPaddingStrategiesFigure;
