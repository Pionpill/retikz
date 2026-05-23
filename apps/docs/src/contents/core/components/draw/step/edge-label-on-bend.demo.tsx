import { Layout, Node, Path, Step } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout width={420} height={200}>
    <Node id="a" position={[40, 100]}>
      A
    </Node>
    <Node id="b" position={[380, 100]}>
      B
    </Node>
    {/* Bend：内部 lower 为 cubic，t 解释与 cubic 一致 */}
    <Path stroke="currentColor" arrow="->">
      <Step kind="move" to="a" />
      <Step
        kind="bend"
        to="b"
        bendDirection="left"
        bendAngle={45}
        label={{ text: 't=0.25', position: 0.25 }}
      />
    </Path>
    <Path stroke="currentColor" dashPattern={[3, 3]}>
      <Step kind="move" to="a" />
      <Step
        kind="bend"
        to="b"
        bendDirection="left"
        bendAngle={45}
        label={{ text: 'midway', position: 'midway', side: 'above' }}
      />
    </Path>
  </Layout>
);

export default Demo;
