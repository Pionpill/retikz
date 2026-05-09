import { Node, Tikz } from '@retikz/react';
import type { FC } from 'react';

/**
 * 4 种 shape × 多行文字：bbox 沿用各 shape 的"外接内框"语义——
 * - rectangle 紧贴
 * - circle 外接圆，多行变得更圆胖
 * - ellipse 外接椭圆，行多 → ry 显著大于 rx
 * - diamond 外接菱形，多行垂直被拉得最长
 */
const Demo: FC = () => (
  <Tikz width={520} height={200}>
    <Node id="rect" position={[-180, 0]} text={['rect', 'multi', 'lines']} />
    <Node id="circ" shape="circle" position={[-60, 0]} text={['circle', 'multi', 'lines']} />
    <Node id="elli" shape="ellipse" position={[80, 0]} text={['ellipse', 'multi', 'lines']} />
    <Node id="diam" shape="diamond" position={[220, 0]} text={['diamond', 'multi', 'lines']} />
  </Tikz>
);

export default Demo;
