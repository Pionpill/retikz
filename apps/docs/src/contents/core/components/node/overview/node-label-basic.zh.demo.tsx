import { Node, Tikz } from '@retikz/react';
import type { FC } from 'react';

/**
 * Node `label` 边挂标签——中文版：
 * - 单对象或数组形态
 * - position 接 8 方向枚举或数字角度（TikZ `label=30:foo` 同义）
 * - font / textColor 缺省时从 node 继承
 */
const Demo: FC = () => (
  <Tikz width={500} height={260}>
    {/* 单 label，缺省 position='above' */}
    <Node id="A" position={[-160, 0]} label={{ text: '简单标签' }}>A</Node>
    {/* 多 label，不同方向 */}
    <Node
      id="B"
      shape="circle"
      position={[0, 0]}
      label={[
        { text: '上', position: 'above' },
        { text: '右', position: 'right' },
        { text: '左下', position: 'below-left' },
      ]}
    >B</Node>
    {/* 数字角度（视觉 30°，retikz polar 0°=+x、90°=+y 屏幕下） */}
    <Node
      id="C"
      shape="diamond"
      position={[180, 0]}
      label={[
        { text: '0°', position: 0, textColor: 'crimson' },
        { text: '120°', position: 120, textColor: 'crimson' },
        { text: '-110°', position: -110, textColor: 'crimson' },
      ]}
    >C</Node>
  </Tikz>
);

export default Demo;
