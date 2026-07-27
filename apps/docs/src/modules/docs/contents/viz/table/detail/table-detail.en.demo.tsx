import type { FC } from 'react';

import { DetailColumn, DetailTable } from '@retikz/table-react';

import { scoreRows } from './table-detail.data';

const Demo: FC = () => (
  <DetailTable
    id="score-detail"
    dataRef="scores"
    data={scoreRows}
    layout={{
      columnSize: { kind: 'auto' },
      rowSize: { kind: 'auto' },
      columns: [{ index: 2, size: { kind: 'fixed', value: 72 } }],
      columnGap: 6,
      rowGap: 4,
      borders: {
        outer: { kind: 'line', stroke: 'gray', width: 1 },
        horizontal: { kind: 'line', stroke: 'lightgray', width: 1 },
      },
    }}
    width={360}
    height={168}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <DetailColumn id="name" field="name" header="Name" bodyLayout={{ padding: 6, wrap: true }} />
    <DetailColumn id="group" field="group" header="Group" bodyLayout={{ padding: 6 }} />
    <DetailColumn
      id="score"
      field="score"
      header="Score"
      headerLayout={{ padding: 6 }}
      bodyLayout={{ padding: 6, horizontalAlign: 'end', overflow: 'clip' }}
    />
  </DetailTable>
);

export default Demo;
