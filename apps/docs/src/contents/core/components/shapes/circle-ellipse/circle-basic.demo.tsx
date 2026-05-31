import type { FC } from 'react';
import { Circle, Layout, Node } from '@retikz/react';

const Demo: FC = () => (
  <Layout width={380} height={145}>
    <Circle center={[44, 50]} radius={28} strokeWidth={2} />
    <Node position={[44, 105]} stroke="none" textColor="gray" font={{ size: 11 }}>
      radius
    </Node>

    <Circle
      corner1={[100, 22]}
      corner2={[160, 78]}
      inset={7}
      strokeWidth={2}
    />
    <Node position={[130, 105]} stroke="none" textColor="gray" font={{ size: 11 }}>
      inset box
    </Node>

    <Circle
      box={{ x: 190, y: 20, width: 68, height: 60 }}
      fit="contain"
      strokeWidth={2}
    />
    <Node position={[224, 105]} stroke="none" textColor="gray" font={{ size: 11 }}>
      fit contain
    </Node>

    <Circle
      boundingBox={{ origin: [300, 24], width: 52, height: 52 }}
      fit="cover"
      startAngle={210}
      endAngle={330}
      closed="sector"
      strokeWidth={2}
    />
    <Node position={[326, 105]} stroke="none" textColor="gray" font={{ size: 11 }}>
      sector
    </Node>
  </Layout>
);

export default Demo;
