import { Arc, Layout } from '@retikz/react';
import type { FC } from 'react';

/**
 * Arc 闭合方式：缺省开放弧；close="chord" 两端连弦成弓形；close="sector" 连回圆心成扇形。
 * 后两者闭合成区域，可直接 fill。
 */
const Demo: FC = () => (
  <Layout width={360} height={140}>
    {/* 默认：开放弧，不闭合、不填充 */}
    <Arc center={[60, 70]} radius={50} startAngle={-50} endAngle={50} strokeWidth={2} />
    {/* 弦闭合：两端点连直线成弓形 */}
    <Arc
      center={[180, 70]}
      radius={50}
      startAngle={-50}
      endAngle={50}
      strokeWidth={2}
      close="chord"
      fill="dodgerblue"
      fillOpacity={0.3}
    />
    {/* 扇形闭合：两端连回圆心 */}
    <Arc
      center={[300, 70]}
      radius={50}
      startAngle={-50}
      endAngle={50}
      strokeWidth={2}
      close="sector"
      fill="darkorange"
      fillOpacity={0.4}
    />
  </Layout>
);

export default Demo;
