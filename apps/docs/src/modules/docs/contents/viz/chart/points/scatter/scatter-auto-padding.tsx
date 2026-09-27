import { ScatterChart } from '@retikz/chart-react/point';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { scatterAutoPaddingI18n } from './scatter-auto-padding.i18n';

/** 留白策略示例的语言 */
export type ScatterAutoPaddingProps = { lang?: Lang };

const rows = [
  { x: 0, y: 0, radius: 4 },
  { x: 5, y: 5, radius: 32 },
  { x: 10, y: 10, radius: 4 },
];

/** 使用实际 Chart 对比两种自动留白策略 */
const ScatterAutoPadding: FC<ScatterAutoPaddingProps> = props => {
  const { lang = 'zh' } = props;
  const text = scatterAutoPaddingI18n[lang];
  return (
    <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
      {(
        [
          { kind: 'max-radius', clearance: 0 },
          { kind: 'point-aware', clearance: 0 },
          { kind: 'max-radius', clearance: { default: 8, top: 20, left: 0 } },
          { kind: 'point-aware', clearance: { default: 8, top: 20, left: 0 } },
        ] as const
      ).map(autoPadding => (
        <ScatterChart
          key={`${autoPadding.kind}-${typeof autoPadding.clearance}`}
          rows={rows}
          layout={{ width: 340, height: 280 }}
          presentation={{
            title: { text: autoPadding.kind === 'max-radius' ? text.maximum : text.aware },
            subtitle: { text: typeof autoPadding.clearance === 'number' ? `${text.clearance}: 0` : text.directional },
          }}
          recipe={{
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
      ))}
    </div>
  );
};

/** 多图比较只展示 React 示例，不派生单个 Chart IR */
export const previewSource = { deriveIR: false };

export default ScatterAutoPadding;
