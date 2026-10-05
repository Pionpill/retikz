import { Layout } from '@retikz/react';
import { Matrix } from '@retikz/standard-react/collection';

/** 本节图形的交互参数 */
export type MatrixPreviewValues = { mode: 'items' | 'data' };
/** 按当前参数绘制矩阵 */
export const renderMatrixPreview = (values: MatrixPreviewValues) => {
  return (
    <Layout>
      <Matrix
        {...(values.mode === 'items'
          ? {
              items: [
                ['A', 'B'],
                ['C', 'D'],
              ],
            }
          : {
              data: [
                ['A', 'B'],
                [42, true],
              ],
            })}
      />
    </Layout>
  );
};
