import type { FC } from 'react';
import { Ellipse, Layout, Node } from '@retikz/react';

const Demo: FC = () => (
  <Layout width={380} height={145}>
    <Ellipse center={[52, 50]} radiusX={38} radiusY={24} strokeWidth={2} />
    <Node position={[52, 105]} stroke="none" textColor="gray" font={{ size: 11 }}>
      radii
    </Node>

    <Ellipse
      corner1={[112, 22]}
      corner2={[178, 78]}
      inset={8}
      strokeWidth={2}
    />
    <Node position={[145, 105]} stroke="none" textColor="gray" font={{ size: 11 }}>
      inset box
    </Node>

    <Ellipse
      box={{ x: 210, y: 27, width: 48, height: 46 }}
      outset={7}
      strokeWidth={2}
    />
    <Node position={[234, 105]} stroke="none" textColor="gray" font={{ size: 11 }}>
      outset
    </Node>

    <Ellipse
      boundingBox={{ origin: [304, 27], width: 56, height: 46 }}
      startAngle={210}
      endAngle={330}
      closed="sector"
      strokeWidth={2}
    />
    <Node position={[332, 105]} stroke="none" textColor="gray" font={{ size: 11 }}>
      sector
    </Node>
  </Layout>
);

export default Demo;
