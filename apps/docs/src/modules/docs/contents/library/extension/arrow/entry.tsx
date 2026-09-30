import { DiamondArrowDefinition } from '@retikz/extension';
import { Draw, Layout } from '@retikz/react';
import type { FC } from 'react';

/** 展示按需装配后的单个箭头 */
const Entry: FC = () => (
  <Layout viewBox={{ x: -110, y: -45, width: 220, height: 90 }} extensions={{ arrows: [DiamondArrowDefinition] }}>
    <Draw
      way={[
        [-70, 0],
        [70, 0],
      ]}
      arrow="->"
      arrowDetail={{ end: { shape: 'diamond', color: '#2563eb' } }}
      style={{ stroke: 'gray', strokeWidth: 2 }}
    />
  </Layout>
);

export default Entry;
