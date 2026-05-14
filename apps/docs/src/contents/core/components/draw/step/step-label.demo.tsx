import { EdgeLabel, Node, Path, Step, TikZ } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <TikZ width={360} height={220}>
    <Node id="a" position={[0, 0]} shape="diamond">
      ?
    </Node>
    <Node id="b" position={[160, -60]}>
      yes path
    </Node>
    <Node id="c" position={[160, 60]}>
      no path
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

    {/* sloped：标签贴线旋转 */}
    <Node id="d" position={[0, 100]}>
      d
    </Node>
    <Node id="e" position={[260, 160]}>
      e
    </Node>
    <Path arrow="->">
      <Step kind="move" to="d" />
      <Step to="e">
        <EdgeLabel side="sloped">distance = 12</EdgeLabel>
      </Step>
    </Path>
  </TikZ>
);

export default Demo;
