import { Layout } from '@retikz/react';
import { Matrix } from '@retikz/standard-react/collection';
/** 本节图形的交互参数 */
export type MatrixPreviewValues = {
  rowGap: number;
  columnGap: number;
  width: 'auto' | 'fixed';
  row: 'none' | 'before' | 'after';
  column: 'none' | 'before' | 'after';
};
/** 按当前参数绘制矩阵 */
export const renderMatrixPreview = (values: MatrixPreviewValues) => {
  return (
    <Layout viewBox={{ x: -30, y: -25, width: 410, height: 210 }}>
      <Matrix
        items={[
          [{ content: 'A', layout: { width: 30 } }, 'longer'],
          ['wide cell', 'B'],
        ]}
        layout={{
          width: values.width === 'fixed' ? 90 : 'auto',
          height: 40,
          gap: { row: values.rowGap, column: values.columnGap },
        }}
        index={{
          row: values.row === 'none' ? false : { position: values.row, labels: ['r₁', 'r₂'] },
          column: values.column === 'none' ? false : { position: values.column, start: 1 },
        }}
        style={{ fill: 'dodgerblue', fillOpacity: 0.14, stroke: 'dodgerblue' }}
      />
    </Layout>
  );
};
