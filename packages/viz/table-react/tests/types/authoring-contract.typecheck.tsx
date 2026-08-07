import { createManualTableSpec } from '@retikz/table';

import type { DetailTableProps } from '../../src';

import { Cell, DetailTable, ManualTable, Table } from '../../src';

const spec = createManualTableSpec({ rows: [[1]], tableThemeTokens: { 'cell.content.color': '#18181b' } });

const rejectedDetailStyleTokensProps = {
  dataRef: 'people',
  data: [],
  columns: [{ id: 'score', field: 'score' }],
  // @ts-expect-error DetailTable 不接受旧 styleTokens，Table token 通过 tableThemeTokens 传入
  styleTokens: { 'cell.content.color': '#18181b' },
} satisfies DetailTableProps;

const acceptedAuthoring = (
  <>
    <Table spec={spec} containerStyle={{ color: 'rebeccapurple' }} />
    <DetailTable
      dataRef="people"
      data={[{ score: 98 }]}
      columns={[{ id: 'score', field: 'score' }]}
      theme={{ style: 'academic', mode: 'dark' }}
      tableThemeTokens={{ 'cell.content.color': '#fafafa' }}
      encodings={[
        {
          id: 'score-color',
          selector: { fields: ['score'] },
          channel: 'backgroundFill',
          scale: { name: 'ordinal-color' },
          legend: false,
        },
      ]}
      containerStyle={{ color: 'rebeccapurple' }}
    />
    <ManualTable
      rows={[[1]]}
      tableThemeTokens={{ 'cell.content.color': '#18181b' }}
      containerStyle={{ color: 'rebeccapurple' }}
    />
    <Cell value={1} formatter={{ name: 'number' }} />
    <Cell formatter={{ name: 'number' }}>{1}</Cell>
  </>
);

const rejectedAuthoring = (
  <>
    {/* @ts-expect-error Table 顶层 style 已迁移为 containerStyle */}
    <Table spec={spec} style={{ color: 'rebeccapurple' }} />
    {/* @ts-expect-error DetailTable 顶层 style 已迁移为 containerStyle */}
    <DetailTable dataRef="people" data={[]} columns={[{ id: 'score', field: 'score' }]} style={{ color: 'red' }} />
    {/* @ts-expect-error ManualTable 顶层 style 已迁移为 containerStyle */}
    <ManualTable rows={[[1]]} style={{ color: 'rebeccapurple' }} />
    {/* @ts-expect-error 不提供旧 tableStyle alias */}
    <ManualTable rows={[[1]]} tableStyle={{ color: 'rebeccapurple' }} />
    {/* @ts-expect-error DetailTable 不接受旧 themeMode，Core Theme 通过 theme 传入 */}
    <DetailTable dataRef="people" data={[]} columns={[{ id: 'score', field: 'score' }]} themeMode="dark" />
    <DetailTable {...rejectedDetailStyleTokensProps} />
    {/* @ts-expect-error ManualTable 不接受旧 themeMode，Core Theme 通过 theme 传入 */}
    <ManualTable rows={[[1]]} themeMode="dark" />
    {/* @ts-expect-error ManualTable 不接受旧 styleTokens，Table token 通过 tableThemeTokens 传入 */}
    <ManualTable rows={[[1]]} styleTokens={{ 'cell.content.color': '#18181b' }} />
    {/* @ts-expect-error content Cell 绕过 formatter */}
    <Cell content={{ type: 'node', position: [0, 0] }} formatter={{ name: 'number' }} />
    {/* @ts-expect-error content Cell 绕过 presentation */}
    <Cell content={{ type: 'node', position: [0, 0] }} presentation={{ name: 'text' }} />
  </>
);

void acceptedAuthoring;
void rejectedAuthoring;
