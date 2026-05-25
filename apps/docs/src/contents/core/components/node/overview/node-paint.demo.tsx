import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/**
 * 渐变填充（Paint）
 * @description 左：线性渐变（angle 90° 竖直）矩形；右：径向渐变圆。fill 接 PaintSpec 对象，编译期收进资源表、
 *   渲染为 SVG `<defs>` 里的 gradient。
 */
const Demo: FC = () => (
  <Layout width={420} height={180}>
    <Node
      id="lin"
      position={[-100, 0]}
      shape="rectangle"
      minimumWidth={110}
      minimumHeight={80}
      stroke="none"
      fill={{
        type: 'linearGradient',
        angle: 90,
        stops: [
          { offset: 0, color: 'dodgerblue' },
          { offset: 1, color: 'dodgerblue' },
        ],
      }}
    />
    <Node
      id="rad"
      position={[100, 0]}
      shape="circle"
      minimumSize={90}
      stroke="none"
      fill={{
        type: 'radialGradient',
        stops: [
          { offset: 0, color: 'white' },
          { offset: 1, color: 'red' },
        ],
      }}
    />
  </Layout>
);

export default Demo;
