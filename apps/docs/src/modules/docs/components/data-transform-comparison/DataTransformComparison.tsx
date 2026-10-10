import type { ExternalRow } from '@retikz/data';
import { Draw, Layout, Node, Scope } from '@retikz/react';
import type { DetailColumnProps, DetailTableProps } from '@retikz/table-react';
import { DetailColumn } from '@retikz/table-react';
import type { FC } from 'react';

import { PreviewDetailTable } from '../component-preview/theme';

/** 数据比较表的内容与标记配置 */
export type DataTransformComparisonTable = {
  /** 表格读取的数据源名称 */
  dataRef: string;
  /** 实际输入或输出记录 */
  rows: Array<ExternalRow>;
  /** 展示列及其格式；空结果也保留列定义 */
  columns: Array<Pick<DetailColumnProps, 'id' | 'field' | 'header' | 'formatter'>>;
  /** 表格下方的说明；组件追加行列数 */
  caption: string;
  /** 固定列宽，默认 70 */
  columnWidth?: number;
  /** 需要标记的列与行；省略行索引时包含表头，数据行索引从 1 开始 */
  highlight?: { columnIds: Array<string>; rowIndices?: Array<number> };
};

/** 左右 Table 比较图的展示输入；算子计算与高亮判定由 demo 提供 */
export type DataTransformComparisonProps = {
  /** 原始数据表；需要标记的内容显示为橙色 */
  source: DataTransformComparisonTable;
  /** 实际结果表；需要标记的内容显示为蓝色 */
  result: DataTransformComparisonTable & {
    /** 交互可能出现的最大输出列数，用于稳定取景宽度 */
    maxColumns?: number;
  };
  /** 中间节点显示的算子名称 */
  operation: string;
  /** 节点上方的宿主名称，如 summarize、select */
  host: string;
  /** 节点下方的分组或执行范围说明 */
  context: string;
  /** 空结果提示；提供时在结果表头下预留提示空间 */
  emptyLabel?: string;
};

/** 将 demo 提供的标记位置转换为 Table 的主色规则 */
const createHighlightRules = (
  highlight: DataTransformComparisonTable['highlight'],
  color: string,
): DetailTableProps['rules'] =>
  !highlight || highlight.columnIds.length === 0 || highlight.rowIndices?.length === 0
    ? []
    : [
        {
          selector: highlight,
          appearance: {
            background: { fill: color, fillOpacity: 0.12 },
            content: { style: { color } },
          },
        },
      ];

/** 统一绘制输入表、紧凑算子节点与输出表，保留真实 Table 渲染和主题 */
export const DataTransformComparison: FC<DataTransformComparisonProps> = props => {
  const { source, result, operation, host, context, emptyLabel } = props;
  const sourceWidth = source.columns.length * (source.columnWidth ?? 70);
  const resultWidth = (result.maxColumns ?? result.columns.length) * (result.columnWidth ?? 70);
  const showEmptyResult = result.rows.length === 0 && emptyLabel !== undefined;
  const sourceHeight = (source.rows.length + 1) * 26;
  const resultHeight = showEmptyResult ? 78 : (result.rows.length + 1) * 26;
  const maxTableHeight = Math.max(sourceHeight, resultHeight);
  const tables = [
    { id: 'source', config: source, x: -95 - sourceWidth, height: sourceHeight, color: 'darkorange', showEmpty: false },
    { id: 'result', config: result, x: 95, height: resultHeight, color: 'dodgerblue', showEmpty: showEmptyResult },
  ];

  return (
    <Layout
      theme={{ style: 'docs.logic' }}
      viewBox={{
        x: -115 - sourceWidth,
        y: -maxTableHeight / 2 - 20,
        width: sourceWidth + resultWidth + 230,
        height: maxTableHeight + 66,
      }}
    >
      {tables.map(table => {
        const { id, config, x, height, color, showEmpty } = table;
        const width = config.columns.length * (config.columnWidth ?? 70);
        return (
          <Scope key={id} position={[x, -height / 2]}>
            <PreviewDetailTable
              id={id}
              dataRef={config.dataRef}
              data={config.rows}
              layout={{
                columnSize: { kind: 'fixed', value: config.columnWidth ?? 70 },
                rowSize: { kind: 'fixed', value: 26 },
                headerRowSize: { kind: 'fixed', value: 26 },
              }}
              rules={createHighlightRules(config.highlight, color)}
            >
              {config.columns.map(column => (
                <DetailColumn key={column.id} {...column} />
              ))}
            </PreviewDetailTable>
            {showEmpty && (
              <Node position={[width / 2, 52]} style={{ stroke: 'none', textColor: 'gray', font: { size: 12 } }}>
                {emptyLabel}
              </Node>
            )}
            <Node position={[width / 2, height + 21]} style={{ stroke: 'none', textColor: 'gray' }}>
              {`${config.caption} · ${config.rows.length} × ${config.columns.length}`}
            </Node>
          </Scope>
        );
      })}
      <Node
        id="operator"
        position={[0, 0]}
        layout={{ minimumSize: { width: 64, height: 30 }, padding: { left: 12, right: 12, top: 6, bottom: 6 } }}
        shape={{ type: 'rectangle', params: { cornerRadius: 6 } }}
        style={{ stroke: 'gray', fill: 'lightgray', fillOpacity: 0.16, font: { size: 12 } }}
      >
        {operation}
      </Node>
      <Node position={[0, -32]} style={{ stroke: 'none', textColor: 'gray', font: { size: 12 } }}>
        {host}
      </Node>
      <Node position={[0, 32]} style={{ stroke: 'none', textColor: 'gray', font: { size: 12 } }}>
        {context}
      </Node>
      <Draw
        way={[{ id: 'source', anchor: 'right' }, '-|-', { id: 'operator', anchor: 'left' }]}
        style={{ stroke: 'gray' }}
        arrow="->"
      />
      <Draw
        way={[{ id: 'operator', anchor: 'right' }, '-|-', { id: 'result', anchor: 'left' }]}
        style={{ stroke: 'gray' }}
        arrow="->"
      />
    </Layout>
  );
};
