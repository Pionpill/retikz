import { Layout, Draw, Node } from '@retikz/react';
import { Queue, QueueItem, Matrix } from '@retikz/standard-react/collection';

/** 本节交互参数 */
export type QueuePreviewValues = { matrix: boolean; dashed: boolean; connect: boolean };
/** 只通过公开属性组合队列的当前快照 */
export const renderQueuePreview = (values: QueuePreviewValues) => (
  <Layout>
    <Queue layout={{ width: 80 }}>
      <QueueItem text="A" />
      <QueueItem
        id="selected"
        {...(values.dashed ? { style: { fill: 'none', stroke: 'dodgerblue', dashPattern: [4, 3] } } : {})}
      >
        {values.matrix ? (
          <Matrix skeleton={{ rows: 2, columns: 2 }} layout={{ width: 18, height: 18, padding: 0 }} />
        ) : (
          <Node text="B" />
        )}
      </QueueItem>
    </Queue>
    {values.connect && <Draw way={[[130, 115], 'selected']} arrow="->" style={{ stroke: 'dodgerblue' }} />}
  </Layout>
);
