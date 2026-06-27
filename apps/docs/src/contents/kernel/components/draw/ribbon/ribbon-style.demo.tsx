import type { FC } from 'react';

import { Layout, Node, Ribbon, Step } from '@retikz/react';

const labelStyle = {
  fill: 'none',
  stroke: 'none',
  textColor: '#5f6c7b',
  font: { size: 13, weight: 'bold' },
} as const;

const Demo: FC = () => (
  <Layout
    width={560}
    height={300}
    viewBox={{ x: -280, y: -150, width: 560, height: 300 }}
    color="#172033"
  >
    <Ribbon
      start={{ width: 18 }}
      end={{ width: 42 }}
      interpolation="smooth"
      fill={{
        kind: 'linearGradient',
        angle: 0,
        stops: [
          { offset: 0, color: '#219ebc' },
          { offset: 0.55, color: '#8ac926' },
          { offset: 1, color: '#fb8500' },
        ],
      }}
      fillOpacity={0.82}
      samples
    >
      <Step kind="move" to={[-172, -98]} />
      <Step kind="curve" control={[28, -128]} to={[222, -58]} />
    </Ribbon>

    <Ribbon
      start={{ width: 42 }}
      end={{ width: 20 }}
      interpolation="linear"
      fill="#ffb703"
      fillOpacity={0.58}
      stroke="#9b4d00"
      strokeWidth={2}
      drawOpacity={0.78}
      samples
    >
      <Step kind="move" to={[-172, -20]} />
      <Step kind="curve" control={[20, -52]} to={[222, 20]} />
    </Ribbon>

    <Ribbon
      start={{ width: 18 }}
      end={{ width: 24 }}
      interpolation="smooth"
      fill="#7c3aed"
      fillOpacity={0.7}
      opacity={0.88}
      shadow={{
        offsetX: 0,
        offsetY: 8,
        blur: 10,
        color: 'rgba(15, 23, 42, 0.38)',
      }}
      samples
    >
      <Step kind="move" to={[-172, 64]} />
      <Step kind="curve" control={[24, 28]} to={[222, 100]} />
    </Ribbon>

    <Node position={[-226, -78]} {...labelStyle}>
      fill
    </Node>
    <Node position={[-226, 0]} {...labelStyle}>
      outline
    </Node>
    <Node position={[-226, 82]} {...labelStyle}>
      shadow
    </Node>
  </Layout>
);

export default Demo;
