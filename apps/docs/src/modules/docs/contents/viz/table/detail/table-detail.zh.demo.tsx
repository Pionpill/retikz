import type { FC } from 'react';

import { Layout } from '@retikz/react';
import { TableThemeToken } from '@retikz/table';
import { DetailColumn } from '@retikz/table-react';

import type { PreviewSourceConfig } from '@/modules/docs/preview';

import { PreviewDetailTable as DetailTable } from '@/modules/docs/components/component-preview/theme';

import { scoreRows } from './table-detail.data';

type ScoreTableProps = { embedded?: boolean };

const rootTheme = { style: 'academic', mode: 'light' } as const;
const tableThemeTokens = {
  [TableThemeToken.CellContentFontFamily]: 'serif',
  [TableThemeToken.CellContentColor]: '#1e3a8a',
  [TableThemeToken.CellBackgroundFill]: 0.08,
  [TableThemeToken.ColumnHeaderContentColor]: '#7c2d12',
  [TableThemeToken.ColumnHeaderBackgroundFill]: 0.12,
};

/** 复用同一张表的 standalone 展示与 embedded 源码派生 */
const ScoreTable: FC<ScoreTableProps> = props => {
  const { embedded = false } = props;

  return (
    <DetailTable
      id="score-detail"
      dataRef="scores"
      data={scoreRows}
      tableThemeTokens={tableThemeTokens}
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
          outer: { kind: 'line', stroke: 0.45, width: 1 },
          horizontal: { kind: 'line', stroke: 0.18, width: 1 },
        },
      }}
      {...(embedded
        ? {}
        : {
            theme: rootTheme,
            width: 360,
            height: 168,
            containerStyle: { maxWidth: '100%', height: 'auto' },
          })}
    >
      <DetailColumn id="name" field="name" header="姓名" bodyLayout={{ padding: 6, wrap: true }} />
      <DetailColumn id="group" field="group" header="分组" bodyLayout={{ padding: 6 }} />
      <DetailColumn
        id="score"
        field="score"
        header="分数"
        formatter={{ name: 'number', options: { specifier: '+.0f' } }}
        headerLayout={{ padding: 6 }}
        bodyLayout={{ padding: 6, horizontalAlign: 'end', overflow: 'clip' }}
      />
    </DetailTable>
  );
};

/** 使用 embedded Table 派生稳定的 IR 与 Vanilla 源码 */
export const previewSource = {
  canonicalRender: () => (
    <Layout width={360} height={168} theme={rootTheme}>
      <ScoreTable embedded />
    </Layout>
  ),
  datasetImports: {
    scores: { from: './table-detail.data', name: 'scoreRows' },
  },
} satisfies PreviewSourceConfig;

const Demo: FC = () => <ScoreTable />;

export default Demo;
