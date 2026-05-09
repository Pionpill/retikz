import { Node, Tikz } from '@retikz/react';
import type { FC } from 'react';

/**
 * 4 种 shape × 多行文字：bbox 沿用各 shape 的"外接内框"语义——
 * - rectangle 紧贴
 * - circle 外接圆，多行变得更圆胖
 * - ellipse 外接椭圆，行多 → ry 显著大于 rx
 * - diamond 外接菱形，多行垂直被拉得最长
 *
 * 顺便混着用 4 种文本写法（children 模板字面量 / children '\n' 字符串 /
 * children 数组 / text prop 数组），都等价。
 */
const Demo: FC = () => (
  <Tikz width={520} height={200}>
    <Node id="rect" position={[-180, 0]}>{`rect
multi
lines`}</Node>
    <Node id="circ" shape="circle" position={[-60, 0]}>
      {'circle\nmulti\nlines'}
    </Node>
    <Node id="elli" shape="ellipse" position={[80, 0]}>
      {['ellipse', 'multi', 'lines']}
    </Node>
    <Node id="diam" shape="diamond" position={[220, 0]} text={['diamond', 'multi', 'lines']} />
  </Tikz>
);

export default Demo;
