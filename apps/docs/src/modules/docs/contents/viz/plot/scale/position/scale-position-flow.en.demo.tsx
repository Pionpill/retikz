import type { FC } from 'react';

import { ScalePositionFlow } from './scale-position-flow';

/** 英文位置比例尺解析流程图 */
const Demo: FC = () => (
  <ScalePositionFlow
    labels={{
      inputsTitle: 'field + mark',
      inputsDetail: 'type · role · baseline',
      scaleTitle: 'scale type',
      scaleDetail: 'explicit · derived',
      resolveTitle: 'domain + range',
      resolveDetail: 'data · coordinate extent',
      outputsTitle: 'position + bandwidth',
      outputsDetail: 'mark · guide · ticks',
      derive: 'derive',
      validate: 'validate',
      map: 'map',
    }}
  />
);

export default Demo;
