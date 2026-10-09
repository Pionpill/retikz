import { applyTransforms } from '@retikz/data';
import type { IRDataTransform } from '@retikz/data';
import { Layout, Scope, Node } from '@retikz/react';
import { DetailColumn } from '@retikz/table-react';
import type { FC } from 'react';

import { PreviewDetailTable } from '@/modules/docs/components/component-preview/theme';

import { mechanismRows } from './transform-mechanism.data';

/** 真实变换前后的表格对照 */
export type TransformTableComparisonProps = {
  operations: Array<IRDataTransform>;
  before: string;
  after: string;
};

/** Table 仅显示 Data 执行结果，不参与统计计算 */
export const TransformTableComparison: FC<TransformTableComparisonProps> = props => {
  const { operations, before, after } = props;
  const result = applyTransforms(mechanismRows, operations);
  const layout = {
    columnSize: { kind: 'fixed' as const, value: 72 },
    rowSize: { kind: 'fixed' as const, value: 28 },
    headerRowSize: { kind: 'fixed' as const, value: 28 },
  };
  return (
    <Layout theme={{ style: 'docs.logic' }}>
      <Node position={[-140, -24]} style={{ stroke: 'none' }}>
        {before}
      </Node>
      <Node position={[140, -24]} style={{ stroke: 'none' }}>
        {after}
      </Node>
      <Scope position={[-248, 0]}>
        <PreviewDetailTable id="before" dataRef="before" data={mechanismRows} layout={layout}>
          {Object.keys(mechanismRows[0]).map(field => (
            <DetailColumn key={field} id={field} field={field} header={{ kind: 'value', value: field }} />
          ))}
        </PreviewDetailTable>
      </Scope>
      <Scope position={[32, 0]}>
        <PreviewDetailTable id="after" dataRef="after" data={result} layout={layout}>
          {Object.keys(result[0]).map(field => (
            <DetailColumn key={field} id={field} field={field} header={{ kind: 'value', value: field }} />
          ))}
        </PreviewDetailTable>
      </Scope>
    </Layout>
  );
};
