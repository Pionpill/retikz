import type { Position } from '@retikz/math';
import { Circle, Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { layoutViewportBoundsI18n } from './layout-viewport-bounds.i18n';

export type LayoutViewportBoundsProps = Readonly<{ lang?: Lang }>;

const project = ([x, y]: Position): Position => [60 + (x - 10) * 3, 50 + (y - 20) * 3];
const rectangle = (x: number, y: number, width: number, height: number): Array<Position> =>
  (
    [
      [x, y],
      [x + width, y],
      [x + width, y + height],
      [x, y + height],
      [x, y],
    ] satisfies Array<Position>
  ).map(project);

const LayoutViewportBounds: FC<LayoutViewportBoundsProps> = props => {
  const { lang } = props;
  const i18n = layoutViewportBoundsI18n[lang ?? 'zh'];
  return (
    <Layout viewBox={{ x: 0, y: 0, width: 420, height: 304 }} style={{ maxWidth: '100%', height: 'auto' }}>
      <Node position={[210, 16]} style={{ stroke: 'none', fill: 'none', font: { size: 14 } }}>
        {i18n.padding}
      </Node>
      <Draw way={rectangle(10, 20, 100, 60)} style={{ stroke: 'darkorange', strokeWidth: 1.5 }} />
      <Draw way={rectangle(20, 30, 80, 40)} style={{ stroke: 'gray', dashPattern: [4, 3] }} />
      <Circle
        center={project([30, 40])}
        radius={30}
        style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.12 }}
      />
      <Draw way={rectangle(80, 50, 20, 20)} style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.12 }} />
      {[
        [30, 40],
        [90, 60],
      ].map((point, index) => (
        <Node
          key={index}
          position={project([point[0], point[1]])}
          style={{ stroke: 'none', fill: 'none', font: { size: 14 } }}
        >
          {index === 0 ? 'A' : 'B'}
        </Node>
      ))}
      {(
        [
          [
            [60, 20],
            [60, 30],
          ],
          [
            [60, 70],
            [60, 80],
          ],
          [
            [10, 50],
            [20, 50],
          ],
          [
            [100, 50],
            [110, 50],
          ],
        ] satisfies Array<[Position, Position]>
      ).map(([from, to], index) => (
        <Draw
          key={index}
          way={[
            project(from),
            {
              label: {
                text: '10',
                position: 'midway',
                side: index < 2 ? 'right' : 'top',
                sloped: false,
                textColor: 'gray',
                font: { size: 13 },
              },
            },
            project(to),
          ]}
          style={{ stroke: 'gray', dashPattern: [1, 4], lineCap: 'round' }}
        />
      ))}
      <Node position={[210, 264]} style={{ stroke: 'none', fill: 'none', font: { size: 13 } }}>
        {i18n.bounds}
      </Node>
      <Node position={[210, 288]} style={{ stroke: 'none', fill: 'none', font: { size: 13 } }}>
        {i18n.viewport}
      </Node>
    </Layout>
  );
};

export default LayoutViewportBounds;
