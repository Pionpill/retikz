import { Layout } from '@retikz/react';
import { Matrix, MatrixRow, MatrixCell, Map } from '@retikz/standard-react/collection';

/** 本节图形的交互参数 */
export type MatrixPreviewValues = { mode: 'data' | 'jsx'; expand: 'all' | 'none' | 'map' | 'array' };
/** 按当前参数绘制矩阵 */
export const renderMatrixPreview = (values: MatrixPreviewValues) => {
  return (
    <Layout>
      {values.mode === 'data' ? (
        <Matrix
          data={[
            [{ key: [1, 2] }, [3, 4]],
            [null, 'text'],
          ]}
          dataExpand={values.expand === 'all' ? true : values.expand === 'none' ? false : [values.expand]}
        />
      ) : (
        <Matrix>
          <MatrixRow>
            <MatrixCell text="A" />
            <MatrixCell>
              <Map data={{ key: 42 }} />
            </MatrixCell>
          </MatrixRow>
          <MatrixRow>
            <MatrixCell />
            <MatrixCell text="B" />
          </MatrixRow>
        </Matrix>
      )}
    </Layout>
  );
};
