import type { Position } from '@retikz/math';
import { localToWorld } from '@retikz/math';
import { Circle, Draw, Layout, Node, Scope } from '@retikz/react';
import type { InputTransform } from '@retikz/vanilla';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { scopeEnvelopeComparisonI18n } from './scope-envelope-comparison.i18n';

export type ScopeEnvelopeComparisonProps = Readonly<{ lang?: Lang }>;

const outline: Array<Position> = [
  [-34, -14],
  [34, -14],
  [34, 14],
  [-34, 14],
  [-34, -14],
];
const transforms: Array<InputTransform> = [
  { kind: 'rotate', degrees: 30, pivot: 'origin' },
  { kind: 'scale', x: 1.4, y: 1.4, pivot: 'origin' },
];
const right = localToWorld({ x: 0, y: 0, rotate: Math.PI / 6 }, [34 * 1.4, 0]);

const ScopeEnvelopeComparison: FC<ScopeEnvelopeComparisonProps> = props => {
  const { lang } = props;
  const i18n = scopeEnvelopeComparisonI18n[lang ?? 'zh'];
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      {[false, true].map((transformed, index) => (
        <Scope key={index} transforms={[{ kind: 'translate', x: 105 + index * 300, y: 0 }]}>
          <Node position={[0, -62]} style={{ stroke: 'none', fill: 'none', font: { size: 14 } }}>
            {transformed ? i18n.after : i18n.before}
          </Node>
          {transformed && <Draw way={outline} style={{ stroke: 'gray', dashPattern: [4, 3] }} />}
          <Scope transforms={transformed ? transforms : []}>
            {[-22, 22].map((x, child) => (
              <Node
                key={x}
                position={[x, 0]}
                layout={{ minimumSize: { width: 24, height: 28 }, padding: 0 }}
                style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.08, font: { size: 12 } }}
              >
                {child === 0 ? 'A' : 'B'}
              </Node>
            ))}
            <Draw way={outline} style={{ stroke: 'darkorange', strokeWidth: 1.5 }} />
            <Circle center={[34, 0]} radius={2.5} style={{ fill: 'darkorange', stroke: 'none' }} />
          </Scope>
          <Draw
            way={[transformed ? right : [34, 0], [64, 44]]}
            style={{ stroke: 'gray', dashPattern: [1, 4], lineCap: 'round' }}
          />
          <Node position={[32, 58]} style={{ stroke: 'none', fill: 'none', font: { size: 12 } }}>
            {transformed ? `right ≈ [${right[0].toFixed(1)}, ${right[1].toFixed(1)}]` : 'right = [34, 0]'}
          </Node>
          <Node position={[0, 84]} style={{ stroke: 'none', fill: 'none', textColor: 'gray', font: { size: 12 } }}>
            {transformed ? i18n.transformed : i18n.intrinsic}
          </Node>
        </Scope>
      ))}
      <Draw
        way={[
          [175, 0],
          {
            label: {
              text: i18n.operation,
              position: 'midway',
              side: 'top',
              sloped: false,
              textColor: 'gray',
              font: { size: 12 },
            },
          },
          [325, 0],
        ]}
        arrow="->"
        style={{ stroke: 'gray' }}
      />
      <Node position={[265, 114]} style={{ stroke: 'none', fill: 'none', textColor: 'gray', font: { size: 12 } }}>
        {i18n.legend}
      </Node>
    </Layout>
  );
};

export default ScopeEnvelopeComparison;
