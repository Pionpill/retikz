import { Layout } from '@retikz/react';
import { Matrix } from '@retikz/standard-react/collection';
/** 本节图形的交互参数 */
export type MatrixPreviewValues = { rows: number; columns: number; mode: 'empty' | 'symbols'; index: 'none' | 'auto' };
/** 按当前参数绘制矩阵 */
export const renderMatrixPreview = (values: MatrixPreviewValues) => {
  const skeleton =
    values.mode === 'empty'
      ? { rows: values.rows, columns: values.columns }
      : {
          labels: globalThis.Array.from({ length: values.rows }, (_, r) =>
            globalThis.Array.from({ length: values.columns }, (_cell, c) =>
              r === 0 && c === 1 ? '' : `x${r + 1}${c + 1}`,
            ),
          ),
        };
  return (
    <Layout viewBox={{ x: -35, y: -35, width: 360, height: 250 }}>
      <Matrix skeleton={skeleton} index={values.index === 'auto'} layout={{ width: 48, height: 36 }} />
    </Layout>
  );
};
