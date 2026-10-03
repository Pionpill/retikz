import { Layout } from '@retikz/react';
import { List } from '@retikz/standard-react/collection';

/** 图形参数 */
export type ListDataPreviewValues = {
  dataObjectDisplay: 'map' | 'text';
};

/** 绘制示例图形 */
export const renderListDataPreview = (values: ListDataPreviewValues) => (
  <Layout>
    <List
      data={['a', 'a', null, { ready: false }, [1, { active: true }]]}
      dataObjectDisplay={values.dataObjectDisplay}
      layout={{ width: 'content' }}
    />
  </Layout>
);
