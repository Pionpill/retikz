import { Draw, Layout, Node } from '@retikz/react';
import { Fragment } from 'react';
import type { FC } from 'react';

const surfaces = ['shape', 'circle', 'rectangle', 'ellipse'] as const;

/**
 * boundary 取值对照
 * @description 同一五角星分设四种连接面，各由一条从左下 45° 斜进的边贴上来。
 *   用斜边才拉得开差异：'shape' 落星形真实轮廓，'rectangle' 顶到外接盒角最远、'circle' 收成最圆、'ellipse' 居中。
 *   竖直 / 水平轴向上三者会重合（内接椭圆在轴上必与矩形边同点、圆又取较长半轴），故刻意用斜边对照。
 */
const Demo: FC = () => (
  <Layout width={600} height={200}>
    {surfaces.map((boundary, index) => {
      const x = -210 + index * 140;
      return (
        <Fragment key={boundary}>
          <Node
            id={`star-${boundary}`}
            position={[x, -5]}
            shape={{ type: 'star', params: { points: 5, innerRadius: 14, outerRadius: 36 } }}
            boundary={boundary}
            fill="gold"
          />
          <Node id={`src-${boundary}`} position={[x - 70, 65]}>
            {boundary}
          </Node>
          <Draw way={[`src-${boundary}`, `star-${boundary}`]} arrow="->" stroke="darkorange" />
        </Fragment>
      );
    })}
  </Layout>
);

export default Demo;
