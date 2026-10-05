import { Layout, Draw } from '@retikz/react';
import { Matrix } from '@retikz/standard-react/collection';

/** 本节图形的交互参数 */
export type MatrixPreviewValues = { row: number; column: number; overflow: 'clip' | 'visible'; label: string };
/** 按当前参数绘制矩阵 */
export const renderMatrixPreview = (values: MatrixPreviewValues) => {
  return (
    <Layout viewBox={{ x: -40, y: -35, width: 480, height: 208 }}>
      <Matrix
        id="m"
        cellIdMode="index"
        items={[
          [{ content: 'long text outside', id: 'named' }, 'B', 'C', 'D', 'E'],
          ['F', 'G', 'H', 'I', 'J'],
          ['K', 'L', 'M', 'N', 'O'],
          ['P', 'Q', 'R', 'S', 'T'],
        ]}
        layout={{ width: 65, height: 36, gap: 6, overflow: values.overflow }}
        label={{ text: values.label, position: 'top' }}
        style={{ fill: 'dodgerblue', fillOpacity: 0.14, stroke: 'dodgerblue' }}
      />
      <Draw way={[[410, 100], `m-${values.row}-${values.column}.right`]} arrow="->" style={{ stroke: 'dodgerblue' }} />
    </Layout>
  );
};
