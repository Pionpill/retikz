import { Layout, Node, Path, Step } from '@retikz/react';
import type { FC } from 'react';

/**
 * 阴影对象写法：preset 调色 + 完整显式
 * @description 左：{ preset:'md', color } 在档位基底上覆盖颜色；
 *   右：无 preset 的完整显式对象作用于 Path 主路径。
 */
const Demo: FC = () => (
  <Layout width={420} height={170}>
    {/* preset 出默认 offset/blur，color 覆盖成蓝色调 */}
    <Node
      position={[-110, 0]}
      shape="circle"
      fill="white"
      padding={16}
      shadow={{ preset: 'md', color: '#3b82f6', opacity: 0.6 }}
    />

    {/* 无 preset：完整显式 offsetX / offsetY / blur / color */}
    <Path
      stroke="steelblue"
      strokeWidth={4}
      shadow={{ offsetX: 2, offsetY: 2, blur: 3, color: 'rgba(0,0,0,0.4)' }}
    >
      <Step kind="move" to={[60, -30]} />
      <Step kind="line" to={[140, -30]} />
      <Step kind="line" to={[140, 40]} />
      <Step kind="line" to={[60, 40]} />
    </Path>
  </Layout>
);

export default Demo;
