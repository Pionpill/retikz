import { Circle, Draw, Layout, Node, Scope } from '@retikz/react';
import type { InputTransform } from '@retikz/vanilla';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { scopeTransformStepsI18n } from './scope-transform-steps.i18n';

export type ScopeTransformStepsProps = Readonly<{ lang?: Lang }>;

const scale: InputTransform = { kind: 'scale', x: 1.4, y: 1.4, pivot: 'origin' };
const rotate: InputTransform = { kind: 'rotate', degrees: 30, pivot: 'origin' };
const stages: ReadonlyArray<ReadonlyArray<InputTransform>> = [[], [scale], [rotate, scale], [rotate, scale]];
const positions = [60, 245, 430, 615];
const coordinates = ['B = [14, 0]', 'B = [19.6, 0]', 'B ≈ [17, 9.8]', 'B ≈ [33, 23.8]'];

const ScopeTransformSteps: FC<ScopeTransformStepsProps> = props => {
  const { lang } = props;
  const i18n = scopeTransformStepsI18n[lang ?? 'zh'];
  return (
    <Layout viewBox={{ x: -8, y: -72, width: 716, height: 184 }} style={{ maxWidth: '100%', height: 'auto' }}>
      {stages.map((transforms, index) => (
        <Scope key={index} transforms={[{ kind: 'translate', x: positions[index], y: 0 }]}>
          <Node position={[0, -58]} style={{ stroke: 'none', fill: 'none', font: { size: 14 } }}>
            {i18n.stages[index]}
          </Node>
          <Draw
            way={[
              [-46, 0],
              [62, 0],
            ]}
            style={{ stroke: 'gray', dashPattern: [1, 4], lineCap: 'round' }}
          />
          <Draw
            way={[
              [0, -40],
              [0, 58],
            ]}
            style={{ stroke: 'gray', dashPattern: [1, 4], lineCap: 'round' }}
          />
          <Scope
            transforms={[...transforms]}
            placement={index === 3 ? { target: [16, 14], selfAnchor: 'origin' } : undefined}
          >
            <Draw
              way={[
                [-30, -18],
                [30, -18],
                [30, 18],
                [-30, 18],
                [-30, -18],
              ]}
              style={{ stroke: 'gray', dashPattern: [4, 3], fill: 'none' }}
            />
            <Node
              position={[-14, 0]}
              shape="circle"
              style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.08, font: { size: 10 } }}
              layout={{ minimumSize: { width: 18, height: 18 }, padding: 2 }}
            >
              A
            </Node>
            <Node
              position={[14, 0]}
              style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.08, font: { size: 10 } }}
              layout={{ minimumSize: { width: 18, height: 18 }, padding: 2 }}
            >
              B
            </Node>
            <Circle center={[0, 0]} radius={2} style={{ fill: 'darkorange', stroke: 'none' }} />
          </Scope>
          <Node position={[0, 74]} style={{ stroke: 'none', fill: 'none', textColor: 'gray', font: { size: 12 } }}>
            {coordinates[index]}
          </Node>
        </Scope>
      ))}
      {i18n.operations.map((operation, index) => (
        <Draw
          key={operation}
          way={[
            [positions[index] + 58, 0],
            {
              label: {
                text: operation,
                position: 'midway',
                side: 'top',
                sloped: false,
                textColor: 'gray',
                font: { size: 12 },
              },
            },
            [positions[index + 1] - 56, 0],
          ]}
          arrow="->"
          style={{ stroke: 'gray' }}
        />
      ))}
      <Node position={[350, 101]} style={{ stroke: 'none', fill: 'none', textColor: 'gray', font: { size: 12 } }}>
        {i18n.pivot}
      </Node>
    </Layout>
  );
};

export default ScopeTransformSteps;
