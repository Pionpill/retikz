import type { FC } from 'react';

import { Axis, Legend, Plot, PointMark } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { CUSTOM_CHANNEL_CONTROL_IDS, customChannelControls, previewControlContract } from './custom-channel.controls';
import { customChannelPoints } from './custom-channel.data';
import { intensityChannel } from './custom-channel.definition';

/** controls registry 缺失时使用的显式回退 */
export const previewControls = customChannelControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Plot
    data={customChannelPoints}
    channelDefinitions={[intensityChannel]}
    width={440}
    height={220}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <PointMark
      x="x"
      y="y"
      size={8}
      fill="#2563eb"
      stroke="#1d4ed8"
      channels={{
        intensity:
          values[CUSTOM_CHANNEL_CONTROL_IDS.bindingMode] === 'field'
            ? 'score'
            : values[CUSTOM_CHANNEL_CONTROL_IDS.constantIntensity],
      }}
    />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
    {values[CUSTOM_CHANNEL_CONTROL_IDS.bindingMode] === 'field' ? <Legend channel="intensity" /> : null}
  </Plot>
));

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

const Demo: FC = controlledPreview.Component;

export default Demo;
