import { Draw, Layout, Node } from '@retikz/react';
import type { ReactNode } from 'react';

const connectionOf = (values: DrawOrthogonalPreviewValues): ReactNode => {
  if (values.connection === 'horizontal') {
    return <Draw way={['A', { horizontalTo: 'B' }]} style={{ stroke: '#2563eb', strokeWidth: 2 }} />;
  }

  if (values.connection === 'vertical') {
    return <Draw way={['A', { verticalTo: 'B' }]} style={{ stroke: '#2563eb', strokeWidth: 2 }} />;
  }

  if (values.via === '-|' || values.via === '|-') {
    return <Draw way={['A', values.via, 'B']} style={{ stroke: '#2563eb', strokeWidth: 2 }} />;
  }

  return (
    <Draw
      way={['A', { via: values.via, fraction: values.fraction }, 'B']}
      style={{ stroke: '#2563eb', strokeWidth: 2 }}
    />
  );
};

/** 图形参数 */
export type DrawOrthogonalPreviewValues = {
  connection: 'horizontal' | 'vertical' | 'fold';
  via: '-|' | '|-' | '-|-' | '|-|';
  fraction: number;
};

/** 绘制示例图形 */
export const DrawOrthogonalPreview = (values: DrawOrthogonalPreviewValues) => (
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
    <Draw way={['A.center', 'B.center']} style={{ stroke: 'gray', dashPattern: [1, 4], lineCap: 'round' }} />
    {connectionOf(values)}
  </Layout>
);
