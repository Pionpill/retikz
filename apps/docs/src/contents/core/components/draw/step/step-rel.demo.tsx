import { Path, Step, Tikz } from '@retikz/react';
import type { FC } from 'react';

/**
 * rel vs relAccumulate：两条 path 的 step 序列字面相同，只差 IR target 形态。
 *
 * 实线（rel）：每段相对偏移都从同一锚点 prevEnd = move 终点 (20, 60) 解析——
 *   step 1: (20, 60) → (20+80, 60+0)  = (100, 60)
 *   step 2: (100, 60) → (20+80, 60+40) = (100, 100)（prevEnd 仍为 (20, 60)）
 *
 * 虚线（relAccumulate）：每段累积更新 prevEnd——
 *   step 1: (20, 140) → (20+80, 140+0)  = (100, 140)（prevEnd 推到 (100, 140)）
 *   step 2: (100, 140) → (100+80, 140+40) = (180, 180)（阶梯）
 */
const Demo: FC = () => (
  <Tikz width={320} height={200}>
    {/* rel：链式偏移都从同一锚点 (20, 60) 出发 */}
    <Path stroke="currentColor">
      <Step kind="move" to={[20, 60]} />
      <Step to={{ rel: [80, 0] }} />
      <Step to={{ rel: [80, 40] }} />
    </Path>
    {/* relAccumulate：累积偏移，每段从前一段终点继续 */}
    <Path stroke="currentColor" strokeDasharray="4 2">
      <Step kind="move" to={[20, 140]} />
      <Step to={{ relAccumulate: [80, 0] }} />
      <Step to={{ relAccumulate: [80, 40] }} />
    </Path>
  </Tikz>
);

export default Demo;
