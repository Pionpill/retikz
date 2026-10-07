import { Layout } from '@retikz/react';
import { Queue } from '@retikz/standard-react/collection';

/** 本节交互参数 */
export type QueuePreviewValues = { input: 'items' | 'data' | 'skeleton'; empty: boolean; expand: boolean };
/** 只通过公开属性组合队列的当前快照 */
export const renderQueuePreview = (values: QueuePreviewValues) => (
  <Layout>
    <Queue
      {...(values.input === 'items'
        ? { items: values.empty ? [] : ['A', 'B', 'C'] }
        : values.input === 'data'
          ? { data: values.empty ? [] : ['A', { x: 1 }, [2, 3]], dataExpand: values.expand }
          : { skeleton: { labels: values.empty ? [] : ['A', '', 'C'] } })}
    />
  </Layout>
);
