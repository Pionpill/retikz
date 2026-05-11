import { Path, Step, Tikz } from '@retikz/react';
import type { FC } from 'react';

/**
 * rel vs relAccumulate
 * @description 两条 path step 序列字面相同只差 IR target 形态；rel 每段从同一锚点 (move 终点) 解析，relAccumulate 累积更新 prevEnd 形成阶梯。
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
