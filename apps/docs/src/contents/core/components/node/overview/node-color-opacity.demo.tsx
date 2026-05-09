import { Node, Tikz } from '@retikz/react';
import type { FC } from 'react';

/**
 * 4 个节点演示颜色 / 不透明度族：
 * - textColor：文字颜色（块级默认）
 * - opacity：整节点 0~1（含 shape + text）
 * - fillOpacity：仅填充透明
 * - drawOpacity：仅描边透明
 */
const Demo: FC = () => (
  <Tikz width={520} height={120}>
    <Node id="tc" position={[-180, 0]} fill="#fef3c7" textColor="#dc2626">
      textColor
    </Node>
    <Node id="op" position={[-50, 0]} fill="#3b82f6" opacity={0.4} textColor="white">
      opacity 0.4
    </Node>
    <Node id="fo" position={[80, 0]} fill="#3b82f6" fillOpacity={0.3}>
      fillOpacity
    </Node>
    <Node id="do" position={[210, 0]} stroke="#dc2626" strokeWidth={3} drawOpacity={0.3}>
      drawOpacity
    </Node>
  </Tikz>
);

export default Demo;
