import type { FC } from 'react';

import { Axis, Plot, PointMark } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { points } from './point-api.data';
import { POINT_TEXT_CONTROL_IDS, previewControlContract } from './point-text.controls';

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const textColor = values[POINT_TEXT_CONTROL_IDS.textColor];
  const font = {
    size: values[POINT_TEXT_CONTROL_IDS.fontSize],
    weight: values[POINT_TEXT_CONTROL_IDS.fontBold] ? ('bold' as const) : ('normal' as const),
  };
  const textProps =
    values[POINT_TEXT_CONTROL_IDS.mode] === 'label'
      ? {
          color: 'region',
          label: 'label',
          labelPosition: values[POINT_TEXT_CONTROL_IDS.labelPosition],
          labelDistance: values[POINT_TEXT_CONTROL_IDS.labelDistance],
          labelPin: values[POINT_TEXT_CONTROL_IDS.labelPin],
          labelTextColor: textColor,
          labelFont: font,
        }
      : {
          text: 'label',
          textColor,
          font,
          dx: values[POINT_TEXT_CONTROL_IDS.dx],
          dy: values[POINT_TEXT_CONTROL_IDS.dy],
        };

  return (
    <Plot
      data={points}
      width={400}
      height={280}
      coordinate={values[POINT_TEXT_CONTROL_IDS.coordinate] === 'polar2D' ? 'polar2D' : undefined}
    >
      <PointMark x="x" y="y" {...textProps} />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
  );
});

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

/** 切换点标签与文本点并调整对应位置参数 */
const Demo: FC = controlledPreview.Component;

export default Demo;
