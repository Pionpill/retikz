import { Layout, Path, Step } from '@retikz/react';
import type { FC } from 'react';

/**
 * 中段 marking：marks 沿路径 pos∈[0,1] 处放方向箭头，朝向由该点切线决定（非固定方向）。
 * 这里两个 stealth 箭头放在一条 cubic 曲线的 1/4 / 3/4 处，自动跟随曲线切线。
 */
const Demo: FC = () => (
  <Layout width={320} height={100}>
    <Path
      stroke="#10b981"
      strokeWidth={1.5}
      marks={[
        { pos: 0.25, mark: { kind: 'arrow', shape: 'stealth' } },
        { pos: 0.75, mark: { kind: 'arrow', shape: 'stealth' } },
      ]}
    >
      <Step kind="move" to={[10, 30]} />
      <Step kind="cubic" control1={[90, -30]} control2={[210, 90]} to={[290, 30]} />
    </Path>
  </Layout>
);

export default Demo;
