import { Layout } from '@retikz/react';
import { Chain } from '@retikz/standard-react/collection';

/** 本节交互参数 */
export type ChainPreviewValues = { mode: 'items' | 'data' | 'count' | 'labels' | 'branches' };

/** 由公开参数绘制链 */
export const renderChainPreview = (values: ChainPreviewValues) => (
  <Layout>
    <Chain
      {...(values.mode === 'data'
        ? { data: [1, { key: 2 }, [3, 4]] }
        : values.mode === 'count'
          ? { skeleton: { count: 4 } }
          : values.mode === 'labels'
            ? { skeleton: { labels: ['A', '', 'C'] } }
            : values.mode === 'branches'
              ? { skeleton: { items: ['A', { branches: [['B', 'C'], ['D']] }, 'E'] } }
              : { items: ['A', 'B', 'C'] })}
    />
  </Layout>
);
