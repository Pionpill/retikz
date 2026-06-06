import { Draw, Layout, Node } from '@retikz/react';
import { Fragment } from 'react';
import type { FC } from 'react';

const surfaces = ['shape', 'circle', 'rectangle', 'ellipse'] as const;

/**
 * boundary 取值对照
 * @description 同一五角星，分别设 boundary='shape' / 'circle' / 'rectangle' / 'ellipse'；每个下方一条边贴上来。
 *   'shape' 钻进星形下缘的凹边，其余三个停在外接盒/圆/椭圆上。视觉形状与占位都不变，只连接面不同。
 */
const Demo: FC = () => (
  <Layout width={560} height={210}>
    {surfaces.map((boundary, index) => {
      const x = -210 + index * 140;
      return (
        <Fragment key={boundary}>
          <Node
            id={`star-${boundary}`}
            position={[x, -20]}
            shape={{ type: 'star', params: { points: 5, innerRadius: 14, outerRadius: 36 } }}
            boundary={boundary}
            fill="gold"
          />
          <Node id={`src-${boundary}`} position={[x, 84]}>
            {boundary}
          </Node>
          <Draw way={[`src-${boundary}`, `star-${boundary}`]} arrow="->" />
        </Fragment>
      );
    })}
  </Layout>
);

export default Demo;
