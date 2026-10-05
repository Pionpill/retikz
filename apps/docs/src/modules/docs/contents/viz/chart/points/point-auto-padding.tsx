import { ScatterChart } from '@retikz/chart-react/point';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { pointAutoPaddingI18n } from './point-auto-padding.i18n';

/** 留白策略示例的语言 */
export type PointAutoPaddingProps = { lang?: Lang };

const rows = [
  { x: 0, y: 0, radius: 4 },
  { x: 5, y: 5, radius: 32 },
  { x: 10, y: 10, radius: 4 },
];

/** 使用实际 Chart 对比两种自动留白策略 */
const PointAutoPadding: FC<PointAutoPaddingProps> = props => {
  const { lang = 'zh' } = props;
  const text = pointAutoPaddingI18n[lang];

  return (
    <div className="grid w-full min-w-[724px] grid-cols-4 gap-3">
      {(
        [
          { kind: 'max-radius', clearance: 0 },
          { kind: 'point-aware', clearance: 0 },
          { kind: 'max-radius', clearance: { default: 8, top: 20, left: 0 } },
          { kind: 'point-aware', clearance: { default: 8, top: 20, left: 0 } },
        ] as const
      ).map(autoPadding => (
        <div key={`${autoPadding.kind}-${typeof autoPadding.clearance}`} className="min-w-0">
          <div className="mb-1 min-h-10 translate-x-10 text-xs leading-5">
            <p className="font-semibold">{autoPadding.kind === 'max-radius' ? text.maximum : text.aware}</p>
            <p className="text-muted-foreground">
              {typeof autoPadding.clearance === 'number' ? `${text.clearance}: 0` : text.directional}
            </p>
          </div>
          <ScatterChart
            rows={rows}
            layout={{ width: 172, height: 240 }}
            recipe={{
              guides: { legend: false },
              encodings: {
                x: 'x',
                y: 'y',
                size: {
                  field: 'radius',
                  scale: { operation: { type: 'sqrt', name: 'radius', domain: [4, 32], range: [4, 32] } },
                },
              },
              properties: { autoPadding, fillOpacity: 0.6 },
            }}
          />
        </div>
      ))}
    </div>
  );
};

/** 多图比较只展示 React 示例，不派生单个 Chart IR */
export const previewSource = { deriveIR: false };

export default PointAutoPadding;
