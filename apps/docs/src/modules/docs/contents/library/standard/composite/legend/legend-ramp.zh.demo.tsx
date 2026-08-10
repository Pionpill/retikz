import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';
import { LegendContentKind, LegendDirection } from '@retikz/standard';
import { Legend, LegendRamp, LegendTick, LegendTitle } from '@retikz/standard-react';

/** 连续样本与归一化刻度 */
const Demo: FC = () => (
  <Layout
    width={430}
    height={150}
    viewBox={{ x: -110.6, y: -20, width: 430, height: 150 }}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <Legend kind={LegendContentKind.Ramp} direction={LegendDirection.Horizontal} padding={12} sampleGap={8}>
      <LegendTitle>
        <Node id="temperature-title" position={[0, 0]} text="温度" stroke="none" />
      </LegendTitle>
      <LegendRamp>
        <Node
          id="temperature-ramp"
          position={[0, 0]}
          text=""
          minimumSize={{ width: 160, height: 16 }}
          padding={0}
          stroke="lightgray"
          fill={{
            kind: 'linearGradient',
            angle: 0,
            stops: [
              { offset: 0, color: 'dodgerblue' },
              { offset: 0.5, color: 'gold' },
              { offset: 1, color: 'orangered' },
            ],
          }}
        />
      </LegendRamp>
      <LegendTick tickKey="low" offset={0}>
        <Node id="low-label" position={[0, 0]} text="低" stroke="none" />
      </LegendTick>
      <LegendTick tickKey="middle" offset={0.5}>
        <Node id="middle-label" position={[0, 0]} text="中" stroke="none" />
      </LegendTick>
      <LegendTick tickKey="high" offset={1}>
        <Node id="high-label" position={[0, 0]} text="高" stroke="none" />
      </LegendTick>
    </Legend>
  </Layout>
);

export default Demo;
