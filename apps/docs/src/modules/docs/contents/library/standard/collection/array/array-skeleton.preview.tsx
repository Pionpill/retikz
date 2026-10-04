import { Layout } from '@retikz/react';
import { Array } from '@retikz/standard-react/collection';

/** 示意骨架的交互参数 */
export type ArraySkeletonPreviewValues = {
  mode: 'count' | 'labels';
  count: number;
  labels: string;
  index: 'none' | 'auto' | 'labels';
};
/** 共用的骨架示例渲染入口 */
export const renderArraySkeletonPreview = (values: ArraySkeletonPreviewValues) => {
  const skeleton = values.mode === 'count' ? { count: values.count } : { labels: values.labels.split('|') };
  const count = skeleton.labels === undefined ? skeleton.count : skeleton.labels.length;
  const index =
    values.index === 'none'
      ? false
      : values.index === 'auto'
        ? { start: 1 }
        : { labels: globalThis.Array.from({ length: count }, (_, i) => `i${i + 1}`) };
  return (
    <Layout viewBox={{ x: -30, y: -40, width: 380, height: 140 }}>
      <Array skeleton={skeleton} index={index} layout={{ width: 42, height: 36 }} />
    </Layout>
  );
};
