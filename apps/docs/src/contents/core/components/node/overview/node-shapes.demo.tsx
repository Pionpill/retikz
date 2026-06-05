import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/**
 * 文本容器形状并排
 * @description rectangle（默认）/ circle / ellipse / diamond / polygon；边界包住 text + padding、尺寸由内容驱动。
 *   外围 5 个连到中央 hub，path 端点按各自 shape 自动贴边。
 */
const Demo: FC = () => (
  <Layout width={420} height={280}>
    <Node id="hub" position={[0, 0]}>
      hub
    </Node>
    <Node id="rect" position={[-130, -80]}>
      rectangle
    </Node>
    <Node id="circ" shape="circle" position={[130, -80]}>
      circle
    </Node>
    <Node id="elli" shape="ellipse" position={[140, 80]}>
      ellipse
    </Node>
    <Node id="diam" shape="diamond" position={[-140, 80]}>
      diamond
    </Node>
    <Node id="hex" shape={{ type: 'polygon', params: { sides: 6 } }} position={[0, 110]}>
      polygon
    </Node>
    <Draw way={['rect', 'hub']} arrow="->" />
    <Draw way={['circ', 'hub']} arrow="->" />
    <Draw way={['elli', 'hub']} arrow="->" />
    <Draw way={['diam', 'hub']} arrow="->" />
    <Draw way={['hex', 'hub']} arrow="->" />
  </Layout>
);

export default Demo;
