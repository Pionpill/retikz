import { Layout, Node, scaleIn } from '@retikz/react';
import type { FC } from 'react';

// 注册一个带回弹的自定义缓动 'spring'（cubic-bezier y>1 → 越过 1 再落回），preset 用 easing:'spring' 即生效
const Demo: FC = () => (
  <Layout width={200} height={100} easings={{ spring: [0.34, 1.56, 0.64, 1] }}>
    <Node id="a" position={[0, 0]} fill="#8b5cf6" animations={[scaleIn({ from: 0.4, easing: 'spring' })]}>
      spring
    </Node>
  </Layout>
);

export default Demo;
