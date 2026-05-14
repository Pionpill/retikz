import { Node, TikZ } from '@retikz/react';
import type { FC } from 'react';

/**
 * 4 种 shape × 多行文字
 * @description bbox 沿用各 shape 的"外接内框"语义——rectangle 紧贴、circle 外接圆变圆胖、ellipse 多行 ry 显著大于 rx、diamond 多行垂直拉最长；顺便混用 4 种等价文本写法。
 */
const Demo: FC = () => (
  <TikZ width={520} height={200}>
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
  </TikZ>
);

export default Demo;
