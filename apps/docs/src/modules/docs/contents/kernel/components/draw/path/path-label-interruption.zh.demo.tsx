import type { FC } from 'react';

import { Layout, Path, Step } from '@retikz/react';

/** 对比居中默认、显式关闭、上方默认与显式开启的标签断线 */
const Demo: FC = () => (
  <Layout width={480} height={280} viewBox={{ x: -240, y: -140, width: 480, height: 280 }}>
    <Path
      label={{ text: '居中：默认断线', sloped: true, textColor: 'currentColor', font: { size: 13 } }}
      stroke="currentColor"
    >
      <Step kind="move" to={[-210, -110]} />
      <Step kind="line" to={[210, -110]} />
    </Path>
    <Path stroke="currentColor">
      <Step kind="move" to={[-210, -65]} />
      <Step
        kind="line"
        label={{ text: '倾斜：默认断线', sloped: true, textColor: 'currentColor', font: { size: 13 } }}
        to={[210, -15]}
      />
    </Path>
    <Path stroke="currentColor">
      <Step kind="move" to={[-210, 25]} />
      <Step
        kind="line"
        label={{ text: '居中：连续', sloped: true, interrupt: false, textColor: 'currentColor', font: { size: 13 } }}
        to={[210, 25]}
      />
    </Path>
    <Path stroke="currentColor">
      <Step kind="move" to={[-210, 75]} />
      <Step
        kind="line"
        label={{ text: '上方：默认连续', side: 'top', textColor: 'currentColor', font: { size: 13 } }}
        to={[210, 75]}
      />
    </Path>
    <Path stroke="currentColor">
      <Step kind="move" to={[-210, 115]} />
      <Step
        kind="line"
        label={{ text: '上方：强制断线', side: 'top', interrupt: true, textColor: 'currentColor', font: { size: 13 } }}
        to={[210, 115]}
      />
    </Path>
  </Layout>
);

export default Demo;
