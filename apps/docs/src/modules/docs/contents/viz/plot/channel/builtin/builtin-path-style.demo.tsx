import type { FC } from 'react';

import { DataFieldType } from '@retikz/data';
import { Axis, PathMark, Plot } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { builtinPathStyleControls, previewControlContract } from './builtin-path-style.controls';

const rows = [
  { step: 1, value: 10 },
  { step: 2, value: 18 },
  { step: 3, value: 13 },
  { step: 4, value: 24 },
  { step: 5, value: 19 },
];

/** 注册回退使用的路径样式 controls */
export const previewControls = builtinPathStyleControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const dashPattern = values.dashMode === 'dashed' ? [7, 4] : values.dashMode === 'dotted' ? [1, 4] : undefined;

  return (
    <Plot
      data={rows}
      model={[
        { name: 'step', type: DataFieldType.Continuous },
        { name: 'value', type: DataFieldType.Continuous },
      ]}
      width={440}
      height={280}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <PathMark
        x="step"
        y="value"
        order="step"
        stroke={{ kind: 'constant', value: values.stroke }}
        strokeWidth={values.strokeWidth}
        opacity={values.opacity}
        dashPattern={dashPattern}
        lineCap={values.lineCap}
        lineJoin={values.lineJoin}
        roundedCorners={values.roundedCorners}
      />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
  );
});

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 路径描边、端点与连接样式 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
