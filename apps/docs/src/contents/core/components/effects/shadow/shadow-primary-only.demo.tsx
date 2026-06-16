import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/**
 * 阴影只跟随主几何
 * @description shadow 落在节点 shape 上，不落在 text / label 上——文字与标签不带投影。
 */
const Demo: FC = () => (
  <Layout width={300} height={190} viewBox={{ x: -150, y: -95, width: 300, height: 190 }}>
    <Node
      position={[0, 0]}
      shape="rectangle"
      fill="white"
      padding={16}
      shadow="lg"
      label={{ text: 'label', position: 'above' }}
    >
      text
    </Node>
  </Layout>
);

export default Demo;
