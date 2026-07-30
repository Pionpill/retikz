import type { FC } from 'react';

import { Axis, PathMark, Plot, PointMark } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { builtinOtherControls, previewControlContract } from './builtin-other.controls';
import { otherRows } from './builtin-other.data';

/** 注册回退使用的其他通道数据面板 */
export const previewControls = builtinOtherControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const rows = otherRows.map(row => ({
    ...row,
    fill: row.series === 'B' ? '#f97316' : '#2563eb',
    zIndex: row.series === 'B' ? values.pointZIndex : 0,
  }));

  return (
    <Plot
      data={rows}
      model={[
        { name: 'step', type: 'continuous' },
        { name: 'value', type: 'continuous' },
        { name: 'series', type: 'categorical' },
        { name: 'fill', type: 'categorical' },
        { name: 'zIndex', type: 'continuous' },
      ]}
      width={380}
      height={240}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <PointMark x="step" y="value" fill="fill" size={18} zIndex="zIndex" />
      <PathMark
        x="step"
        y="value"
        order={values.orderEnabled ? 'step' : undefined}
        series={values.seriesEnabled ? 'series' : undefined}
        color={values.seriesEnabled ? 'series' : undefined}
        strokeWidth={3}
      />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
  );
});

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 排序、系列拆分与绘制顺序 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
