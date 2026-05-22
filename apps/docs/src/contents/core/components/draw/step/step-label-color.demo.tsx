import { Path, Step, TikZ } from '@retikz/react';
import type { FC } from 'react';

/**
 * 边标注颜色：跟宿主 path 主色，不跟 stroke
 * @description 第一条 color=红 → 标注自动红（跟主色）；第二条只 stroke=蓝 → 标注仍是默认色（不跟 stroke）；
 *   第三条 color=绿 + 显式 font / opacity → 小一号、淡化的绿标注。
 */
const Demo: FC = () => (
  <TikZ width={320} height={170}>
    <Path color="#dc2626">
      <Step kind="move" to={[0, 0]} />
      <Step to={[200, 0]} label={{ text: 'sin' }} />
    </Path>
    <Path stroke="#2563eb">
      <Step kind="move" to={[0, 55]} />
      <Step to={[200, 55]} label={{ text: 'cos' }} />
    </Path>
    <Path color="#16a34a">
      <Step kind="move" to={[0, 110]} />
      <Step to={[200, 110]} label={{ text: 'tan', font: { size: 10 }, opacity: 0.7 }} />
    </Path>
  </TikZ>
);

export default Demo;
