import type { FC } from 'react';

import { Axis, PathMark, Plot } from '@retikz/plot-react';

import { climate } from './scale-ordinal.data';

/** color 绑分类字段 city → ordinal：每个类别离散取一色，隐式按 city 拆成多条系列 */
const Demo: FC = () => (
  <Plot data={climate} width={380} height={220} style={{ maxWidth: '100%', height: 'auto' }}>
    <PathMark x="month" y="temp" color="city" order="month" />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
);

export default Demo;
