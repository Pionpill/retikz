import type { FC } from 'react';

import { Axis, PathMark, Plot } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { LINE_SERIES_CONTROL_IDS, previewControlContract } from './line-series.controls';
import { climate } from './line-series.data';

/** 比较显式 series 与分类 color 触发的隐式路径拆分 */
const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const coordinate = values[LINE_SERIES_CONTROL_IDS.coordinate];
  const grouping = values[LINE_SERIES_CONTROL_IDS.grouping];
  const x = coordinate === 'polar2D' ? 'quarter' : 'month';
  const grouped = grouping !== 'none';

  return (
    <Plot data={climate} width={400} height={280} coordinate={coordinate === 'polar2D' ? 'polar2D' : undefined}>
      <PathMark
        x={x}
        y="score"
        order="month"
        series={grouping === 'series' ? 'city' : undefined}
        color={grouping === 'color' ? 'city' : undefined}
        label={
          grouped && values[LINE_SERIES_CONTROL_IDS.showLabels]
            ? { content: { field: 'city' }, position: 'near-end', side: 'top', distance: 6 }
            : undefined
        }
        closed={coordinate === 'polar2D' && values[LINE_SERIES_CONTROL_IDS.closed]}
      />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
  );
});

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

const Demo: FC = controlledPreview.Component;

export default Demo;
