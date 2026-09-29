import { Coordinate, Draw, Layout, Node } from '@retikz/react';

import { coordinateOffsetChainFrame } from './coordinate-offset-chain.controls';

/** 图形参数 */
export type CoordinateOffsetChainPreviewValues = {
  rootX: number;
  rootY: number;
  stepX: number;
};

/** 绘制示例图形 */
export const CoordinateOffsetChainPreview = (values: CoordinateOffsetChainPreviewValues) => {
  return (
    <Layout>
      <Draw
        way={coordinateOffsetChainFrame.xAxis}
        zIndex={-1}
        style={{ stroke: 'lightgray', dashPattern: [1, 4], lineCap: 'round' }}
      />
      <Draw
        way={coordinateOffsetChainFrame.yAxis}
        zIndex={-1}
        style={{ stroke: 'lightgray', dashPattern: [1, 4], lineCap: 'round' }}
      />
      <Coordinate id="ca" position={[values.rootX, values.rootY]} />
      <Coordinate id="cb" position={{ of: 'ca', offset: [values.stepX, 0] }} />
      <Coordinate id="cc" position={{ of: 'cb', offset: [values.stepX, 0] }} />
      <Node id="A" position={{ of: 'ca', offset: [0, 0] }}>
        a
      </Node>
      <Node id="B" position={{ of: 'cb', offset: [0, 30] }}>
        b
      </Node>
      <Node id="C" position={{ of: 'cc', offset: [0, -30] }}>
        c
      </Node>
      <Draw way={['A', 'B']} arrow="->" style={{ stroke: 'gray' }} />
      <Draw way={['B', 'C']} arrow="->" style={{ stroke: 'gray' }} />
    </Layout>
  );
};
