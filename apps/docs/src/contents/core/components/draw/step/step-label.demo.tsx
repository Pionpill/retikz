import { EdgeLabel, Node, Path, Step, TikZ } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <TikZ width={520} height={220}>
    <Node id="a" position={[0, 0]} shape="diamond">
      ?
    </Node>
    <Node id="b" position={[150, -45]}>
      yes
    </Node>
    <Node id="c" position={[150, 45]}>
      no
    </Node>

    {/* prop 形态：直接给 label 对象，position 默认 midway，side='above' */}
    <Path arrow="->">
      <Step kind="move" to="a" />
      <Step to="b" label={{ text: 'yes' }} />
    </Path>

    {/* sugar 形态：<EdgeLabel> 当 child；side='below' 让标签落在线下方 */}
    <Path arrow="->">
      <Step kind="move" to="a" />
      <Step to="c">
        <EdgeLabel side="below">no</EdgeLabel>
      </Step>
    </Path>

    <Node id="d" position={[280, -50]}>
      d
    </Node>
    <Node id="e" position={[470, -50]}>
      e
    </Node>
    <Path arrow="->">
      <Step kind="move" to="d" />
      <Step to="e">
        <EdgeLabel side="below">below</EdgeLabel>
      </Step>
    </Path>

    <Node id="f" position={[280, 55]}>
      f
    </Node>
    <Node id="g" position={[470, 105]}>
      g
    </Node>
    <Path arrow="->">
      <Step kind="move" to="f" />
      <Step to="g">
        <EdgeLabel side="sloped">sloped</EdgeLabel>
      </Step>
    </Path>
  </TikZ>
);

export default Demo;
