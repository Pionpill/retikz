import { Layout } from '@retikz/react';
import { Array } from '@retikz/standard-react/collection';

/** 图形参数 */
export type ArrayDataPreviewValues = {
  dataExpand: 'all' | 'none' | 'map' | 'array';
};

/** 绘制示例图形 */
export const renderArrayDataPreview = (values: ArrayDataPreviewValues) => (
  <Layout>
    <Array
      data={['a', 'a', null, { ready: false }, [1, { active: true }]]}
      dataExpand={values.dataExpand === 'all' ? true : values.dataExpand === 'none' ? false : [values.dataExpand]}
      layout={{ width: 'content' }}
    />
  </Layout>
);
