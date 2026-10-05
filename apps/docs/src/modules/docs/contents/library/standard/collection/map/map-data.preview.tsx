import { Layout } from '@retikz/react';
import { Map } from '@retikz/standard-react/collection';

/** 嵌套数据展开的演示选择 */
export type MapDataPreviewValues = { dataExpand: 'all' | 'none' | 'map' | 'array' };

/** 按展开选择绘制 JSON 对象 */
export const renderMapDataPreview = (values: MapDataPreviewValues) => (
  <Layout>
    <Map
      data={{ state: 'resolved', layout: { width: 60, height: 32 }, values: [0, false] }}
      dataExpand={values.dataExpand === 'all' ? true : values.dataExpand === 'none' ? false : [values.dataExpand]}
    />
  </Layout>
);
