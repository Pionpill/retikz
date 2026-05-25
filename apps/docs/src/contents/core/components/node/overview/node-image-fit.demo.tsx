import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

// 真·外部图片 URL：Lorem Picsum，带 seed 固定取同一张「横图」（320×200），用方形盒才看得出 fit 差异

/**
 * image 填充 + fit 三模式（外部 URL）
 * @description 同一张外部横图（320×200）填进 100×100 方形盒：cover 铺满裁左右 / contain 完整留上下边 / fill 拉伸变形。
 *   注：fit 按形状盒归一计算，方形盒时与 CSS object-fit 一致。
 */
const Demo: FC = () => (
  <Layout width={480} height={190}>
    <Node
      id="cover"
      position={[-150, -15]}
      shape="rectangle"
      minimumWidth={100}
      minimumHeight={100}
      stroke="gray"
      fill={{ type: 'image', href: "https://picsum.photos/seed/retikz/320/200", fit: 'cover' }}
    />
    <Node
      id="contain"
      position={[0, -15]}
      shape="rectangle"
      minimumWidth={100}
      minimumHeight={100}
      stroke="gray"
      fill={{ type: 'image', href: "https://picsum.photos/seed/retikz/320/200", fit: 'contain' }}
    />
    <Node
      id="fill"
      position={[150, -15]}
      shape="rectangle"
      minimumWidth={100}
      minimumHeight={100}
      stroke="gray"
      fill={{ type: 'image', href: "https://picsum.photos/seed/retikz/320/200", fit: 'fill' }}
    />
    <Node id="cap-cover" position={[-150, 60]} stroke="none">
      fit: cover
    </Node>
    <Node id="cap-contain" position={[0, 60]} stroke="none">
      fit: contain
    </Node>
    <Node id="cap-fill" position={[150, 60]} stroke="none">
      fit: fill
    </Node>
  </Layout>
);

export default Demo;
