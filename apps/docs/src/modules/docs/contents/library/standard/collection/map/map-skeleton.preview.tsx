import { Layout } from '@retikz/react';
import { Map } from '@retikz/standard-react/collection';

/** 示意骨架的交互参数 */
export type MapSkeletonPreviewValues = { keys: string; empty: boolean };

/** 共用的骨架示例渲染入口 */
export const renderMapSkeletonPreview = (values: MapSkeletonPreviewValues) => {
  return (
    <Layout viewBox={{ x: -30, y: -20, width: 280, height: 200 }}>
      <Map skeleton={{ keys: values.empty ? [] : values.keys.split('|') }} layout={{ width: 64, height: 32 }} />
    </Layout>
  );
};
