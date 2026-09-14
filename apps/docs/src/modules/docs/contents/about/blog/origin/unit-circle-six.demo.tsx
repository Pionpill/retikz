import { Coordinate, Draw, Layout, Node, Path, Step } from '@retikz/react';
import type { FC } from 'react';
import { Fragment } from 'react';

const MATH_FONT = {
  family: '"Latin Modern Math", "STIX Two Math", "Cambria Math", "Times New Roman", serif',
  style: 'italic' as const,
};

const COS30 = Math.cos((30 * Math.PI) / 180);
const SIN30 = Math.sin((30 * Math.PI) / 180);
const TAN30 = SIN30 / COS30;
const SEC30 = 1 / COS30;
const CSC30 = 1 / SIN30;
const COT30 = 1 / TAN30;

const Demo: FC = () => (
  <Layout>
    {[-100, -50, 0, 50, 100].map(v => (
      <Fragment key={`grid-${v}`}>
        <Draw
          way={[
            [v, -210],
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

    <Path style={{ lineCap: 'round' }}>
      <Step kind="move" to={[0, 0]} />
      <Step kind="circlePath" radius={100} />
    </Path>

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
        [0, -230],
      ]}
      arrow="->"
    />
    <Node position={[0, -242]} style={{ stroke: 'none', font: MATH_FONT }} layout={{ padding: 0 }}>
      y
    </Node>
    <Coordinate id="y-axis" position={[0, -230]} />

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
      { y: -200, text: '2' },
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

    <Draw
      way={[
        [0, 0],
        [COT30 * 100, -100],
      ]}
      style={{ dashPattern: [3, 3] }}
    />

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
      way={[[100, 0], { label: { text: 'tan α', side: 'right' } }, [100, -TAN30 * 100]]}
      thickness="thick"
      style={{ stroke: 'darkorange' }}
    />

    <Draw
      way={[
        { angle: -30, radius: 100 },
        { label: { text: 'sec α', position: 'at-end', side: 'bottom' } },
        [SEC30 * 100, 0],
      ]}
      thickness="thick"
      style={{ stroke: 'dodgerblue' }}
    />

    <Draw
      way={[{ angle: -30, radius: 100 }, { label: { text: 'csc α', side: 'left' } }, [0, -CSC30 * 100]]}
      thickness="thick"
      style={{ stroke: 'red' }}
    />

    <Draw
      way={[[0, -100], { label: { text: 'cot α', side: 'top' } }, [COT30 * 100, -100]]}
      thickness="thick"
      style={{ stroke: 'green' }}
    />

    <Node
      position={[320, -70]}
      shape="rectangle"
      cornerRadius={6}
      text={[
        { text: 'α = 30°', fill: 'green' },
        { text: 'sin α = 1/2', fill: 'red' },
        { text: 'cos α = √3/2', fill: 'dodgerblue' },
        { text: 'tan α = 1/√3', fill: 'darkorange' },
        { text: 'sec α = 2/√3', fill: 'dodgerblue' },
        { text: 'csc α = 2', fill: 'red' },
        { text: 'cot α = √3', fill: 'green' },
      ]}
      style={{ stroke: 'lightgray', dashed: true }}
      layout={{ padding: { x: 10, y: 4 }, align: 'start' }}
    />
  </Layout>
);

export default Demo;
