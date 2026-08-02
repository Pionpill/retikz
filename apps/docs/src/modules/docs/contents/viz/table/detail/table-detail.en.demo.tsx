import type { FC } from 'react';

import { Layout } from '@retikz/react';
import { DetailColumn, DetailTable } from '@retikz/table-react';

import type { PreviewSourceConfig } from '@/modules/docs/preview';

import { scoreRows } from './table-detail.data';

type ScoreTableProps = { embedded?: boolean };

/** Reuses one Table definition for standalone display and embedded source derivation */
const ScoreTable: FC<ScoreTableProps> = props => {
  const { embedded = false } = props;

  return (
    <DetailTable
      id="score-detail"
      dataRef="scores"
      data={scoreRows}
      style="neutral"
      rules={[
        {
          selector: { fields: ['score'], value: { kind: 'compare', operator: 'lt', value: 0 } },
          appearance: { content: { color: 'crimson' } },
        },
      ]}
      encodings={[
        {
          id: 'group-background',
          selector: { fields: ['group'], payloadKinds: ['value'] },
          channel: 'backgroundFill',
          scale: { name: 'ordinal-color' },
          legend: false,
        },
      ]}
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
      {...(embedded ? {} : { width: 360, height: 168, containerStyle: { maxWidth: '100%', height: 'auto' } })}
    >
      <DetailColumn id="name" field="name" header="Name" bodyLayout={{ padding: 6, wrap: true }} />
      <DetailColumn id="group" field="group" header="Group" bodyLayout={{ padding: 6 }} />
      <DetailColumn
        id="score"
        field="score"
        header="Score"
        formatter={{ name: 'number', options: { specifier: '+.0f' } }}
        headerLayout={{ padding: 6 }}
        bodyLayout={{ padding: 6, horizontalAlign: 'end', overflow: 'clip' }}
      />
    </DetailTable>
  );
};

/** Derives stable IR and Vanilla source from the embedded Table path */
export const previewSource = {
  canonicalRender: () => (
    <Layout width={360} height={168}>
      <ScoreTable embedded />
    </Layout>
  ),
  datasetImports: {
    scores: { from: './table-detail.data', name: 'scoreRows' },
  },
} satisfies PreviewSourceConfig;

const Demo: FC = () => <ScoreTable />;

export default Demo;
