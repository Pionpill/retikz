import { Path, Step, Tikz } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Tikz width={420} height={220}>
    {/* lineCap：粗 stroke 让端点形状差异肉眼可见 */}
    {(['butt', 'round', 'square'] as const).map((cap, i) => (
      <Path key={`cap-${cap}`} stroke="currentColor" strokeWidth={12} lineCap={cap}>
        <Step kind="move" to={[0, i * 40]} />
        <Step kind="line" to={[120, i * 40]} />
      </Path>
    ))}

    {/* lineJoin：折角处差异；走 step 折角段产生拐点 */}
    {(['miter', 'round', 'bevel'] as const).map((join, i) => (
      <Path key={`join-${join}`} stroke="currentColor" strokeWidth={10} lineJoin={join}>
        <Step kind="move" to={[200, i * 40]} />
        <Step kind="line" to={[260, i * 40]} />
        <Step kind="line" to={[260, i * 40 + 25]} />
      </Path>
    ))}
  </Tikz>
);

export default Demo;
