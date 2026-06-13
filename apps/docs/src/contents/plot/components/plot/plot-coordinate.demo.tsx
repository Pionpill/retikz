import type { FC } from 'react';
import type { IR } from '@retikz/core';
import { Layout } from '@retikz/react';
import { Axis, BarMark, buildPlotSpec } from '@retikz/plot-react';
import { lowerPlots } from '@retikz/plot';

import { revenue } from './plot-cartesian.data';

// 同一份 mark / axis，装配成两个 PlotSpec 节点（不各自包 <Layout>）；自描述尺寸 width / height
const cartesian = {
  ...buildPlotSpec(
    <>
      <BarMark x="quarter" y="value" color="quarter" />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </>,
    'rev',
  ),
  width: 300,
  height: 220,
};

const polar = {
  ...buildPlotSpec(
    <>
      <BarMark x="quarter" y="value" color="quarter" />
      <Axis dimension="angle" />
      <Axis dimension="radius" grid />
    </>,
    'rev',
    { coordinate: 'polar2D' },
  ),
  width: 260,
  height: 260,
};

// 两个 plot 节点并排进同一个 core <Layout>：各包一层 translate scope 摆位、垂直居中；共享一块画布与一套工具栏
const scene: IR = {
  version: 1,
  type: 'scene',
  children: [
    { type: 'scope', transforms: [{ kind: 'translate', x: 0, y: 20 }], children: [cartesian] },
    { type: 'scope', transforms: [{ kind: 'translate', x: 320, y: 0 }], children: [polar] },
  ],
};

const Demo: FC = () => (
  <Layout ir={scene} composites={lowerPlots({ rev: revenue })} width={580} height={260} style={{ maxWidth: '100%', height: 'auto' }} />
);

export default Demo;
