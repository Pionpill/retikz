import { Draw, Layout, Node } from '@retikz/react';
import { Circle } from '@retikz/standard-react/shape';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { scopeOffsetRulersI18n } from './scope-offset-rulers.i18n';

export type ScopeOffsetRulersProps = Readonly<{ lang?: Lang }>;
const ticks = [80, 90, 100, 110, 120, 130];
const xOf = (worldX: number) => 150 + (worldX - 80) * 6;

const ScopeOffsetRulers: FC<ScopeOffsetRulersProps> = props => {
  const { lang } = props;
  const i18n = scopeOffsetRulersI18n[lang ?? 'zh'];
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      {[100, 120].map(x => (
        <Draw
          key={x}
          way={[
            [xOf(x), 55],
            [xOf(x), 155],
          ]}
          style={{ stroke: 'gray', dashPattern: [1, 4], lineCap: 'round' }}
        />
      ))}
      {[55, 155].map((y, row) => (
        <Node key={y} position={[65, y]} style={{ stroke: 'none', fill: 'none', font: { size: 14 } }}>
          {row === 0 ? i18n.canvas : i18n.scope}
        </Node>
      ))}
      {[55, 155].map((y, row) => (
        <Draw
          key={y}
          way={[
            [140, y],
            [470, y],
          ]}
          arrow="->"
          style={{ stroke: row === 0 ? 'gray' : 'dodgerblue' }}
        />
      ))}
      {ticks.map(value =>
        [55, 155].map((y, row) => (
          <Draw
            key={`${value}-${row}`}
            way={[
              [xOf(value), y - 4],
              {
                label: {
                  text: String(row === 0 ? value : value / 2),
                  position: 'at-end',
                  side: 'bottom',
                  sloped: false,
                  textColor: 'gray',
                  font: { size: 12 },
                },
              },
              [xOf(value), y + 4],
            ]}
            style={{ stroke: 'gray' }}
          />
        )),
      )}
      {[55, 155].map(y =>
        [100, 120].map(x => (
          <Circle
            key={`${x}-${y}`}
            center={[xOf(x), y]}
            radius={3.5}
            style={{ fill: x === 100 ? 'darkorange' : 'dodgerblue', stroke: 'none' }}
          />
        )),
      )}
      <Node position={[xOf(100), 34]} style={{ stroke: 'none', fill: 'none', font: { size: 12 } }}>
        {i18n.target}
      </Node>
      <Node position={[xOf(120), 34]} style={{ stroke: 'none', fill: 'none', font: { size: 12 } }}>
        {i18n.result}
      </Node>
      {[0, 116].map((y, row) => (
        <Draw
          key={y}
          way={[
            [xOf(100), y],
            {
              label: {
                text: row === 0 ? i18n.worldStep : i18n.localStep,
                position: 'midway',
                side: 'top',
                sloped: false,
                textColor: 'gray',
                font: { size: 12 },
              },
            },
            [xOf(120), y],
          ]}
          arrow="->"
          style={{ stroke: 'dodgerblue' }}
        />
      ))}
      <Node position={[250, 204]} style={{ stroke: 'none', fill: 'none', textColor: 'gray', font: { size: 12 } }}>
        {i18n.guide}
      </Node>
    </Layout>
  );
};

export default ScopeOffsetRulers;
