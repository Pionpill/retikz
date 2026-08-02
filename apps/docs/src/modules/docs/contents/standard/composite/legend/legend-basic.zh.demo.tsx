import type { FC } from 'react';

import { Layout, Node, Path, Step } from '@retikz/react';
import { LegendContentKind } from '@retikz/standard';
import { Legend, LegendItem, LegendTitle } from '@retikz/standard-react';

/** 用真实线型样本解释逻辑关系语义 */
const Demo: FC = () => (
  <Layout
    width={360}
    height={190}
    viewBox={{ x: -115.4, y: -16, width: 360, height: 190 }}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <Legend kind={LegendContentKind.Items} padding={12} rowGap={10} sampleGap={12}>
      <LegendTitle>
        <Node id="relation-title" position={[0, 0]} text="关系" stroke="none" />
      </LegendTitle>
      <LegendItem
        itemKey="direct"
        sample={
          <Path id="direct-line" stroke="dodgerblue" strokeWidth={2} lineCap="round">
            <Step kind="move" to={[0, 0]} />
            <Step kind="line" to={[42, 0]} />
          </Path>
        }
      >
        <Node id="direct-label" position={[0, 0]} text="直接关系" stroke="none" />
      </LegendItem>
      <LegendItem
        itemKey="indirect"
        sample={
          <Path id="indirect-line" stroke="dodgerblue" strokeWidth={2} lineCap="round" dashPattern={[7, 5]}>
            <Step kind="move" to={[0, 0]} />
            <Step kind="line" to={[42, 0]} />
          </Path>
        }
      >
        <Node id="indirect-label" position={[0, 0]} text="间接关系" stroke="none" />
      </LegendItem>
      <LegendItem
        itemKey="reference"
        sample={
          <Path id="reference-line" stroke="dodgerblue" strokeWidth={2} lineCap="round" dashPattern={[1, 5]}>
            <Step kind="move" to={[0, 0]} />
            <Step kind="line" to={[42, 0]} />
          </Path>
        }
      >
        <Node id="reference-label" position={[0, 0]} text="参考关系" stroke="none" />
      </LegendItem>
    </Legend>
  </Layout>
);

export default Demo;
