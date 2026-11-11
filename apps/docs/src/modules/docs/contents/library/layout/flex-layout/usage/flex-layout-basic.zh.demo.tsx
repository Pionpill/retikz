import { FlexLayout, FlexLayoutItem } from '@retikz/layout-react';
import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

import { createLayoutPreviewSource } from '@/modules/docs/preview';

/** 用 React authoring 展示 FlexLayout 的 grow、gap 与 cross alignment */
const renderPreview = () => {
  return (
    <Layout viewBox={{ x: -20, y: -20, width: 400, height: 136 }}>
      <FlexLayout
        size={{ x: { kind: 'fixed', value: 360 }, y: { kind: 'fixed', value: 96 } }}
        padding={12}
        gap={{ column: 8, row: 4 }}
        alignItems="center"
      >
        <FlexLayoutItem basis={48} shrink={0}>
          <Node shape="circle" text="A" style={{ fill: '#dbeafe', stroke: '#2563eb' }} layout={{ minimumSize: 36 }} />
        </FlexLayoutItem>
        <FlexLayoutItem grow={1} min={80}>
          <Node
            text="可伸缩标签"
            style={{ fill: '#f8fafc', stroke: '#94a3b8' }}
            layout={{ padding: { x: 12, y: 8 } }}
          />
        </FlexLayoutItem>
        <FlexLayoutItem shrink={0}>
          <Node text="42%" style={{ fill: '#dcfce7', stroke: '#16a34a' }} layout={{ padding: { x: 10, y: 8 } }} />
        </FlexLayoutItem>
      </FlexLayout>
    </Layout>
  );
};

export const previewSource = createLayoutPreviewSource(() => renderPreview());

const Demo: FC = () => renderPreview();

export default Demo;
