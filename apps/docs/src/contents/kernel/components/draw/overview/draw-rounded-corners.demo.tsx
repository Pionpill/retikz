import { Draw, Layout } from '@retikz/react';
import type { FC } from 'react';

// 同一条折线（两个 line-line 内拐角）：上方尖角，下方 roundedCorners 把拐角倒成相切圆弧。
// roundedCorners 改的是路径几何（顶点回退 + 插弧），区别于只磨描边的 lineJoin。
const Demo: FC = () => (
  <Layout width={320} height={200}>
    {/* 尖角折线 */}
    <Draw
      way={[
        [0, 0],
        [120, 0],
        [120, 70],
        [240, 70],
      ]}
      stroke="gray"
      strokeWidth={2}
    />
    {/* 同形状折线 + roundedCorners=24：两个内拐角各倒一段圆弧 */}
    <Draw
      way={[
        [0, 110],
        [120, 110],
        [120, 180],
        [240, 180],
      ]}
      stroke="steelblue"
      strokeWidth={2}
      roundedCorners={24}
    />
  </Layout>
);

export default Demo;
