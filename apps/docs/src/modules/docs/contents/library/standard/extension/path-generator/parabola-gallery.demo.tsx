import type { FC } from 'react';

import { Draw, Layout, Node, Path, Step } from '@retikz/react';
import { ParabolaPathGeneratorDefinition } from '@retikz/standard/path-generator';

/** 通过控制点展示 Parabola 路径生成器 */
const Demo: FC = () => {
  const controlX = 0;
  const controlY = -70;

  return (
    <Layout
      width={500}
      height={230}
      viewBox={{ x: -220, y: -110, width: 440, height: 220 }}
      pathGenerators={[ParabolaPathGeneratorDefinition]}
    >
      <Draw
        way={[
          [-160, 60],
          [controlX, controlY],
        ]}
        stroke="#cbd5e1"
        dashPattern={[1, 4]}
        lineCap="round"
      />
      <Draw
        way={[
          [controlX, controlY],
          [160, 60],
        ]}
        stroke="#cbd5e1"
        dashPattern={[1, 4]}
        lineCap="round"
      />
      <Node id="A" position={[-160, 60]} shape="circle" fill="#f8fafc">
        A
      </Node>
      <Node id="B" position={[160, 60]} shape="circle" fill="#f8fafc">
        B
      </Node>
      <Node id="C" position={[controlX, controlY]} shape="circle" fill="#fff7ed" stroke="#ea580c">
        C
      </Node>
      <Path stroke="darkorange" strokeWidth={2.5} arrow="->">
        <Step kind="move" to="A" />
        <Step kind="generator" name="parabola" to="B" params={{ control: { id: 'C' } }} />
      </Path>
    </Layout>
  );
};

export default Demo;
