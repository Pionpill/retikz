import type { IRPaint } from '@retikz/core';
import type { FC } from 'react';

import { Axis, PathMark, Plot } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { revenue } from './line-basic.data';
import { LINE_PAINT_CONTROL_IDS, previewControlContract } from './line-paint.controls';

const strokeGradient: IRPaint = {
  kind: 'linearGradient',
  angle: 0,
  stops: [
    { offset: 0, color: '#38bdf8' },
    { offset: 0.55, color: '#22c55e' },
    { offset: 1, color: '#f97316' },
  ],
};

const fillGradient: IRPaint = {
  kind: 'linearGradient',
  angle: 90,
  stops: [
    { offset: 0, color: 'rgba(14, 165, 233, 0.42)' },
    { offset: 0.62, color: 'rgba(34, 197, 94, 0.2)' },
    { offset: 1, color: 'rgba(34, 197, 94, 0)' },
  ],
};

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const mode = values[LINE_PAINT_CONTROL_IDS.mode];
  const stroke =
    mode === 'gradient' ? strokeGradient : { kind: 'constant' as const, value: values[LINE_PAINT_CONTROL_IDS.stroke] };

  return (
    <Plot data={revenue} width={560} height={240} style={{ maxWidth: '100%', height: 'auto' }}>
      {mode === 'area' ? (
        <PathMark
          x="month"
          y="revenue"
          order="month"
          closure={{ kind: 'baseline' }}
          fill={fillGradient}
          stroke="none"
          opacity={values[LINE_PAINT_CONTROL_IDS.opacity]}
        />
      ) : null}
      <PathMark
        x="month"
        y="revenue"
        order="month"
        stroke={stroke}
        strokeWidth={values[LINE_PAINT_CONTROL_IDS.strokeWidth]}
        opacity={values[LINE_PAINT_CONTROL_IDS.opacity]}
        lineCap="round"
        lineJoin="round"
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

/** 路径描边、渐变 paint 与闭合面积 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
