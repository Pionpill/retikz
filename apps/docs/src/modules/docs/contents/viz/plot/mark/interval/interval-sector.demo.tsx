import type { FC } from 'react';

import { IntervalMark, Plot } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { INTERVAL_SECTOR_CONTROL_IDS, previewControlContract } from './interval-sector.controls';
import { traffic } from './interval-sector.data';

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const data = traffic.map(row =>
    row.source === 'Search' ? { ...row, pull: values[INTERVAL_SECTOR_CONTROL_IDS.pullDistance] } : row,
  );
  const label = values[INTERVAL_SECTOR_CONTROL_IDS.showLabels] ? 'source' : undefined;

  return (
    <Plot
      data={data}
      width={340}
      height={270}
      coordinate={{ type: 'polar2D', innerRadius: values[INTERVAL_SECTOR_CONTROL_IDS.innerRadius] }}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <IntervalMark
        angle="value"
        color="source"
        padAngle={values[INTERVAL_SECTOR_CONTROL_IDS.padAngle]}
        pull="pull"
        stroke="#ffffff"
        strokeWidth={1.5}
        label={label}
        labelPosition="right"
        labelDistance={8}
        labelFont={{ size: 10, weight: 'bold' }}
      />
    </Plot>
  );
});

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

const Demo: FC = controlledPreview.Component;

export default Demo;
