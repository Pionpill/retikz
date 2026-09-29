import { Layout, Node, Path, Step } from '@retikz/react';
import type { ReactNode } from 'react';

const connectionOf = (values: AxisLinePreviewValues): ReactNode => {
  if (values.connection === 'fold') {
    if (values.via === '-|' || values.via === '|-') {
      return (
        <Path style={{ stroke: 'dodgerblue', strokeWidth: 2 }}>
          <Step kind="move" to="A" />
          <Step kind="fold" via={values.via} to="B" />
        </Path>
      );
    }

    return (
      <Path style={{ stroke: 'dodgerblue', strokeWidth: 2 }}>
        <Step kind="move" to="A" />
        <Step kind="fold" via={values.via} fraction={values.fraction} to="B" />
      </Path>
    );
  }

  return (
    <Path style={{ stroke: 'dodgerblue', strokeWidth: 2 }}>
      <Step kind="move" to="A" />
      <Step kind="axis-line" axis={values.connection} to="B" />
    </Path>
  );
};

/** 图形参数 */
export type AxisLinePreviewValues = {
  connection: 'horizontal' | 'vertical' | 'fold';
  via: '-|' | '|-' | '-|-' | '|-|';
  fraction: number;
};

/** 绘制示例图形 */
export const AxisLinePreview = (values: AxisLinePreviewValues) => (
  <Layout
    viewBox={{ x: -150, y: -100, width: 300, height: 200 }}
    rootScope={{
      defaults: {
        node: {
          shape: 'rectangle',
          style: { stroke: 'gray', dashed: true },
        },
      },
    }}
  >
    <Node id="A" position={[-100, -45]}>
      a
    </Node>
    <Node id="B" position={[100, 45]}>
      b
    </Node>
    <Path style={{ stroke: 'gray', dashPattern: [1, 4], lineCap: 'round' }}>
      <Step kind="move" to="A.center" />
      <Step kind="line" to="B.center" />
    </Path>
    {connectionOf(values)}
  </Layout>
);
