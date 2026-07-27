import type { FC } from 'react';

import { Axis, Plot, PointMark } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { points } from './point-api.data';
import { POINT_TEXT_CONTROL_IDS, previewControlContract } from './point-text.controls';

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const textProps =
    values[POINT_TEXT_CONTROL_IDS.mode] === 'label'
      ? {
          color: 'region',
          label: 'label',
          labelPosition: values[POINT_TEXT_CONTROL_IDS.labelPosition],
          labelDistance: values[POINT_TEXT_CONTROL_IDS.labelDistance],
          labelPin: values[POINT_TEXT_CONTROL_IDS.labelPin],
        }
      : {
          text: 'label',
          textColor: '#0f172a',
          dx: values[POINT_TEXT_CONTROL_IDS.dx],
          dy: values[POINT_TEXT_CONTROL_IDS.dy],
        };

  return (
    <Layout width={620} height={260} style={{ maxWidth: '100%', height: 'auto' }}>
      <Plot data={points} width={300} height={220} x={0} y={20}>
        <PointMark x="x" y="y" {...textProps} />
        <Axis dimension="x" />
        <Axis dimension="y" grid />
      </Plot>
      <Plot data={points} width={260} height={260} coordinate="polar2D" x={340} y={0}>
        <PointMark x="x" y="y" {...textProps} />
        <Axis dimension="x" />
        <Axis dimension="y" grid />
      </Plot>
    </Layout>
  );
});

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

/** 切换点标签与文本点并调整对应位置参数 */
const Demo: FC = controlledPreview.Component;

export default Demo;
