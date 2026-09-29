import { Coordinate, Draw, Layout, Node } from '@retikz/react';

/** 图形参数 */
export type CoordinateBetweenPreviewValues = {
  fraction: number;
};

/** 绘制示例图形 */
export const CoordinateBetweenPreview = (values: CoordinateBetweenPreviewValues) => {
  return (
    <Layout>
      <Node
        id="A"
        position={[-140, 0]}
        shape="circle"
        style={{ fill: 'dodgerblue', textColor: 'white' }}
        layout={{ minimumSize: 32 }}
      >
        a
      </Node>
      <Node
        id="B"
        position={[140, 0]}
        shape="circle"
        style={{ fill: 'green', textColor: 'white' }}
        layout={{ minimumSize: 32 }}
      >
        b
      </Node>
      <Draw way={['A', 'B']} zIndex={-1} style={{ stroke: 'lightgray' }} />
      <Coordinate id="Q" position={{ between: [{ id: 'A' }, { id: 'B' }], fraction: values.fraction }} />
      <Node
        id="marker"
        position={{ of: 'Q', offset: [0, 0] }}
        shape="circle"
        style={{ fill: 'darkorange', textColor: 'white' }}
        layout={{ minimumSize: 24 }}
      >
        q
      </Node>
    </Layout>
  );
};
