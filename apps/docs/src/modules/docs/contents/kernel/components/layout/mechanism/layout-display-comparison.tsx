import { Circle, Draw, Layout, Node, Scope } from '@retikz/react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { layoutDisplayComparisonI18n } from './layout-display-comparison.i18n';

export type LayoutDisplayComparisonProps = Readonly<{ lang?: Lang }>;

const LayoutDisplayComparison: FC<LayoutDisplayComparisonProps> = props => {
  const { lang } = props;
  const i18n = layoutDisplayComparisonI18n[lang ?? 'zh'];
  return (
    <Layout width={384} style={{ maxWidth: '100%', height: 'auto' }}>
      {[1, 2].map(scale => (
        <Scope key={scale} transforms={[{ kind: 'translate', x: scale === 1 ? 100 : 0, y: scale === 1 ? 30 : 194 }]}>
          <Node position={[100 * scale, -18]} style={{ stroke: 'none', fill: 'none', font: { size: 14 } }}>
            {scale === 1 ? i18n.original : i18n.enlarged}
          </Node>
          <Draw
            way={[
              [0, 0],
              [200 * scale, 0],
              [200 * scale, 100 * scale],
              [0, 100 * scale],
              [0, 0],
            ]}
            style={{ stroke: 'gray', dashPattern: [4, 3] }}
          />
          <Draw
            way={[
              [0, 50 * scale],
              [50 * scale, 50 * scale],
              [50 * scale, 0],
            ]}
            style={{ stroke: 'gray', dashPattern: [1, 4], lineCap: 'round' }}
          />
          <Circle
            center={[50 * scale, 50 * scale]}
            radius={10 * scale}
            style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.12 }}
          />
          <Draw
            way={[
              [140 * scale, 40 * scale],
              [160 * scale, 40 * scale],
              [160 * scale, 60 * scale],
              [140 * scale, 60 * scale],
              [140 * scale, 40 * scale],
            ]}
            style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.12 }}
          />
          <Draw
            way={[
              [60 * scale, 50 * scale],
              [140 * scale, 50 * scale],
            ]}
            style={{ stroke: 'gray' }}
          />
          <Node
            position={[50 * scale, 50 * scale]}
            style={{ stroke: 'none', fill: 'none', font: { size: 10 * scale } }}
          >
            A
          </Node>
          <Node
            position={[150 * scale, 50 * scale]}
            style={{ stroke: 'none', fill: 'none', font: { size: 10 * scale } }}
          >
            B
          </Node>
          <Node position={[100 * scale, 100 * scale + 16]} style={{ stroke: 'none', fill: 'none', font: { size: 13 } }}>
            {i18n.coordinate}
          </Node>
        </Scope>
      ))}
      <Node position={[200, 433]} style={{ stroke: 'none', fill: 'none', textColor: 'gray', font: { size: 12 } }}>
        {i18n.reference}
      </Node>
    </Layout>
  );
};

export default LayoutDisplayComparison;
