import type { FC } from 'react';

import { composeThemeTokenOverrides, defineCoreThemeTokens } from '@retikz/core';
import { Layout } from '@retikz/react';
import { defineTableThemeTokens, TableThemeToken } from '@retikz/table';
import { DetailColumn, DetailTable } from '@retikz/table-react';

import type { PreviewSourceConfig } from '@/modules/docs/preview';

import { scoreRows } from './table-detail.data';

type ScoreTableProps = { embedded?: boolean };

const rootThemeTokens = composeThemeTokenOverrides(
  defineCoreThemeTokens({ 'palette.categorical': ['#2563eb', '#f97316'] }),
  defineTableThemeTokens({ [TableThemeToken.CellContentFontFamily]: 'serif' }),
);

const rootTheme = { style: 'academic', mode: 'light', tokens: rootThemeTokens } as const;

/** 复用同一张表的 standalone 展示与 embedded 源码派生 */
const ScoreTable: FC<ScoreTableProps> = props => {
  const { embedded = false } = props;

  return (
    <DetailTable
      id="score-detail"
      dataRef="scores"
      data={scoreRows}
      tableThemeTokens={{ [TableThemeToken.CellContentColor]: '#1e3a8a' }}
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
