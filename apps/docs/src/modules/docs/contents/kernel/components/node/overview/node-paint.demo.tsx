import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';

/**
 * 渐变填充（Paint）
 * @description 左：线性渐变矩形；中：径向渐变圆；右：锥形渐变方块。fill 接 PaintSpec 对象，编译期收进资源表、
 *   渲染为 SVG `<defs>` 里的 gradient。
 */
const Demo: FC = () => (
  <Layout width={520} height={180}>
    <Node
      id="lin"
      position={[-170, 0]}
      shape="rectangle"
      minimumSize={{ width: 96, height: 80 }}
      stroke="none"
      fill={{
        kind: 'linearGradient',
        angle: 90,
        stops: [
          { offset: 0, color: '#e0f2fe' },
          { offset: 1, color: '#0284c7' },
        ],
      }}
    />
    <Node
      id="rad"
      position={[0, 0]}
      shape="circle"
      minimumSize={90}
      stroke="none"
      fill={{
        kind: 'radialGradient',
        stops: [
          { offset: 0, color: 'white' },
          { offset: 1, color: 'red' },
        ],
      }}
    />
    <Node
      id="conic"
      position={[170, 0]}
      shape="rectangle"
      minimumSize={{ width: 96, height: 96 }}
      stroke="none"
      fill={{
        kind: 'conicGradient',
        angle: -90,
        stops: [
          { offset: 0, color: '#0046c7' },
          { offset: 0.25, color: '#75c900' },
          { offset: 0.5, color: '#ffe100' },
          { offset: 0.75, color: '#ff4f00' },
          { offset: 1, color: '#0046c7' },
        ],
      }}
    />
  </Layout>
);

export default Demo;
