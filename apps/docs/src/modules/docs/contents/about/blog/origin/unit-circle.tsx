import type { FC } from 'react';

import { Coordinate, Draw, Layout, Node, Path, Step } from '@retikz/react';
import { Fragment } from 'react';

import type { Lang } from '@/i18n';

import { unitCircleI18n } from './unit-circle.i18n';

// Use literal colors because exported SVG cannot resolve CSS variables in a new context.
const MATH_FONT = {
  family: '"Latin Modern Math", "STIX Two Math", "Cambria Math", "Times New Roman", serif',
  style: 'italic' as const,
};

const COS30 = Math.cos((30 * Math.PI) / 180);
const SIN30 = Math.sin((30 * Math.PI) / 180);
const TAN30 = SIN30 / COS30;

export type UnitCircleProps = Readonly<{ lang?: Lang }>;

const Demo: FC<UnitCircleProps> = props => {
  const { lang = 'zh' } = props;
  const i18n = unitCircleI18n[lang];

  return (
    <Layout>
      {/* Background grid */}
      {[-100, -50, 0, 50, 100].map(v => (
        <Fragment key={`grid-${v}`}>
          <Draw
            way={[
              [v, -140],
              [v, 140],
            ]}
            style={{ stroke: 'lightgray', strokeWidth: 0.5 }}
          />
          <Draw
            way={[
              [-140, v],
              [140, v],
            ]}
            style={{ stroke: 'lightgray', strokeWidth: 0.5 }}
          />
        </Fragment>
      ))}

      {/* Unit circle */}
      <Path style={{ lineCap: 'round' }}>
        <Step kind="move" to={[0, 0]} />
        <Step kind="circlePath" radius={100} />
      </Path>

      {/* Coordinate axes */}
      <Draw
        way={[
          [-150, 0],
          [150, 0],
        ]}
        arrow="->"
      />
      <Node position={[162, 0]} style={{ stroke: 'none', font: MATH_FONT }} layout={{ padding: 0 }}>
        x
      </Node>
      <Coordinate id="x-axis" position={[150, 0]} />
      <Draw
        way={[
          [0, 150],
          [0, -150],
        ]}
        arrow="->"
      />
      <Node position={[0, -162]} style={{ stroke: 'none', font: MATH_FONT }} layout={{ padding: 0 }}>
        y
      </Node>
      <Coordinate id="y-axis" position={[0, -150]} />

      {/* Axis ticks */}
      {[
        { x: -100, text: '−1' },
        { x: -50, text: '−1/2' },
        { x: 100, text: '1' },
      ].map(({ x, text }) => (
        <Fragment key={`tx-${x}`}>
          <Draw
            way={[
              [x, -3],
              [x, 3],
            ]}
          />
          <Node position={[x - 10, 14]} style={{ stroke: 'none' }} layout={{ padding: 1 }}>
            {text}
          </Node>
        </Fragment>
      ))}
      {[
        { y: 100, text: '−1' },
        { y: 50, text: '−1/2' },
        { y: -50, text: '1/2' },
        { y: -100, text: '1' },
      ].map(({ y, text }) => (
        <Fragment key={`ty-${y}`}>
          <Draw
            way={[
              [-3, y],
              [3, y],
            ]}
          />
          <Node position={[-18, y + 10]} style={{ stroke: 'none' }} layout={{ padding: 1 }}>
            {text}
          </Node>
        </Fragment>
      ))}

      {/* 30-degree sector and alpha */}
      <Path style={{ fill: 'lightgray', stroke: 'green' }}>
        <Step kind="move" to={[0, 0]} />
        <Step kind="arc" startAngle={0} endAngle={-30} radius={30} />
        <Step kind="line" to={[0, 0]} />
      </Path>
      <Node
        position={{ angle: -15, radius: 22 }}
        style={{ stroke: 'none', textColor: 'green', font: MATH_FONT }}
        layout={{ padding: 1 }}
      >
        α
      </Node>

      {/* sin alpha, cos alpha, and tan alpha */}
      <Draw
        way={[{ angle: -30, radius: 100 }, { label: { text: 'sin α', side: 'left' } }, [COS30 * 100, 0]]}
        thickness="thick"
        style={{ stroke: 'red' }}
      />
      <Draw
        way={[[COS30 * 100, 0], { label: { text: 'cos α', side: 'bottom' } }, [0, 0]]}
        thickness="thick"
        style={{ stroke: 'dodgerblue' }}
      />
      <Draw
        way={[[100, 0], { label: { text: 'tan α = sin α / cos α', side: 'right' } }, [100, -TAN30 * 100]]}
        thickness="thick"
        style={{ stroke: 'darkorange' }}
      />
      <Coordinate id="t" position={[100, -TAN30 * 100]} />
      <Draw way={[[0, 0], 't']} />

      {/* Use colored formula rows and default-color hints for grouping. */}
      <Node
        position={[320, 10]}
        shape="rectangle"
        cornerRadius={6}
        text={[
          { text: i18n.angle, fill: 'green' },
          i18n.radians,
          { text: i18n.sin, fill: 'red' },
          i18n.sinHint,
          { text: i18n.cos, fill: 'dodgerblue' },
          i18n.cosHint,
          { text: i18n.tan, fill: 'darkorange' },
          i18n.tanHint,
        ]}
        style={{ stroke: 'lightgray', dashed: true }}
        layout={{ padding: { x: 10, y: 4 }, align: 'start' }}
      />
    </Layout>
  );
};

export default Demo;
