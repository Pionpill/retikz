import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';
import { Axes } from '@retikz/standard-react';

/** Axes 常见语义变体的中文并列对比 */
const Demo: FC = () => (
  <Layout width={760} height={145} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node position={[95, 18]} stroke="none" fill="none" padding={0} font={{ size: 12 }}>
      仅正半轴
    </Node>
    <Axes
      origin={[38, 118]}
      extent={{ x: { negative: 0, positive: 120 }, y: { negative: 0, positive: 70 } }}
      x={{ ticks: { source: { kind: 'spacing', spacing: 30, extent: 'positive' } }, label: false }}
      y={{ ticks: { source: { kind: 'spacing', spacing: 20, extent: 'positive' } }, label: false }}
    />

    <Node position={[285, 18]} stroke="none" fill="none" padding={0} font={{ size: 12 }}>
      双向数轴
    </Node>
    <Axes
      origin={[285, 82]}
      extent={{ x: 72, y: 20 }}
      y={false}
      x={{
        line: { arrows: 'both' },
        ticks: { source: { kind: 'values', values: [-40, 40] }, side: 'positive' },
        label: 't',
      }}
      originLabel="0"
    />

    <Node position={[475, 18]} stroke="none" fill="none" padding={0} font={{ size: 12 }}>
      非对称范围
    </Node>
    <Axes
      origin={[465, 78]}
      extent={{ x: { negative: 55, positive: 75 }, y: { negative: 30, positive: 55 } }}
      grid={{ spacing: 20, style: { stroke: 'lightgray' } }}
      x={{ label: false }}
      y={{ label: false }}
    />

    <Node position={[665, 18]} stroke="none" fill="none" padding={0} font={{ size: 12 }}>
      只保留刻度
    </Node>
    <Axes
      origin={[665, 82]}
      extent={{ x: 72, y: 20 }}
      y={false}
      x={{
        line: false,
        ticks: {
          source: { kind: 'values', values: [-60, -40, -20, 20, 40, 60] },
          labels: {
            entries: [
              { value: -60, text: '−3' },
              { value: -40, text: '−2' },
              { value: -20, text: '−1' },
              { value: 20, text: '1' },
              { value: 40, text: '2' },
              { value: 60, text: '3' },
            ],
          },
        },
        label: false,
      }}
    />
  </Layout>
);

export default Demo;
