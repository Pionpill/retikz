import { defineFieldOrder } from '@retikz/data';
import { Plot, IntervalMark, PlotAxis, PlotScale } from '@retikz/plot-react';
import type { FC } from 'react';

import { versionRows } from './version-order.data';

/** 以长度比较类别，等长标签保持出现序 */
const labelLength = defineFieldOrder({
  name: 'labelLength',
  compare: (a, b) => String(a).length - String(b).length,
});
/** 运行时选择具名分类顺序 */
export type VersionOrderPreviewProps = { order: string };
/** 内置与自定义通过同一个 order 字段消费 */
export const VersionOrderPreview: FC<VersionOrderPreviewProps> = props => {
  const { order } = props;
  return (
    <Plot
      data={versionRows}
      model={[
        { name: 'version', type: 'categorical', order },
        { name: 'value', type: 'continuous' },
      ]}
      fieldOrderDefinitions={[labelLength]}
      width={410}
      height={250}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <IntervalMark x="version" y="value" color="version" />
      <PlotScale dimension="y" type="linear" domainPadding={0} />
      <PlotAxis dimension="x" />
      <PlotAxis dimension="y" grid />
    </Plot>
  );
};
