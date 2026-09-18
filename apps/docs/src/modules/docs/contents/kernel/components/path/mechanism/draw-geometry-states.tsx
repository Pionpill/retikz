import { Draw, Layout, Node, Path, Scope, Step } from '@retikz/react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { drawGeometryStatesI18n } from './draw-geometry-states.i18n';

export type DrawGeometryStatesProps = Readonly<{ lang?: Lang }>;

const DrawGeometryStates: FC<DrawGeometryStatesProps> = props => {
  const { lang = 'zh' } = props;
  const i18n = drawGeometryStatesI18n[lang];
  return (
    <Layout>
      {[i18n.raw, i18n.arrow, i18n.label].map((title, index) => (
        <Scope key={title} localNamespace transforms={[{ kind: 'translate', x: index * 210, y: 0 }]}>
          <Node position={[60, -42]} style={{ stroke: 'none', font: { size: 14 } }}>
            {title}
          </Node>
          <Draw
            way={[
              [0, 0],
              [120, 0],
            ]}
            style={{ stroke: 'gray', dashPattern: [1, 3] }}
          />
          <Node
            position={[0, 0]}
            shape="circle"
            layout={{ minimumSize: 4, padding: 0 }}
            style={{ fill: 'gray', stroke: 'gray' }}
          />
          <Node
            position={[120, 0]}
            shape="circle"
            layout={{ minimumSize: 4, padding: 0 }}
            style={{ fill: 'gray', stroke: 'gray' }}
          />
          <Path
            arrow={index === 0 ? 'none' : '->'}
            label={index === 2 ? { text: 'A → B', sloped: true, gap: 4 } : undefined}
            style={{ stroke: 'currentColor', strokeWidth: 1.5 }}
          >
            <Step kind="move" to={[0, 0]} />
            <Step kind="line" to={[120, 0]} />
          </Path>
          <Node position={[0, 23]} style={{ stroke: 'none', textColor: 'gray', font: { size: 12 } }}>
            A
          </Node>
          <Node position={[120, 23]} style={{ stroke: 'none', textColor: 'gray', font: { size: 12 } }}>
            B
          </Node>
        </Scope>
      ))}
      <Draw
        way={[
          [145, 0],
          {
            label: {
              text: i18n.place,
              position: 0.5,
              side: 'top',
              sloped: false,
              textColor: 'gray',
              font: { size: 12 },
            },
          },
          [185, 0],
        ]}
        arrow="->"
        style={{ stroke: 'gray' }}
      />
      <Draw
        way={[
          [355, 0],
          {
            label: { text: i18n.cut, position: 0.5, side: 'top', sloped: false, textColor: 'gray', font: { size: 12 } },
          },
          [395, 0],
        ]}
        arrow="->"
        style={{ stroke: 'gray' }}
      />
    </Layout>
  );
};

export default DrawGeometryStates;
