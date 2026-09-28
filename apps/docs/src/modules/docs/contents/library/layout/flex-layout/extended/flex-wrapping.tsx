import { FlexLayout, FlexLayoutItem } from '@retikz/layout-react';
import { FLEX_LAYOUT_INSPECTOR_KEY } from '@retikz/layout/inspect';
import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

import { defineFlexPreview } from '../preview';
import { previewControlContract } from './flex-wrapping.controls';

export { createPreviewControlContract } from './flex-wrapping.controls';
export const previewControls = previewControlContract.controls;
const preview = defineFlexPreview(
  previewControlContract,
  values => (
    <Layout>
      <FlexLayout
        size={{ x: { kind: 'fixed', value: values.width }, y: { kind: 'fixed', value: 190 } }}
        padding={12}
        gap={8}
        wrap={values.wrap}
        alignContent={values.alignContent}
        justifyContent={values.justifyContent}
        alignItems="center"
      >
        <FlexLayoutItem itemKey="a" basis={values.basis} grow={0} shrink={1} min={32}>
          <Node
            position={[0, 0]}
            text="First Node"
            layout={{ minimumSize: { width: 32, height: 32 } }}
            style={{ stroke: 'dodgerblue' }}
          />
        </FlexLayoutItem>
        <FlexLayoutItem itemKey="b" basis={values.basis} grow={0} shrink={1} min={32}>
          <Node
            position={[0, 0]}
            text="Secondary Node"
            layout={{ minimumSize: { width: 32, height: 44 } }}
            style={{ stroke: 'gray' }}
          />
        </FlexLayoutItem>
        <FlexLayoutItem itemKey="c" basis={values.basis} grow={0} shrink={1} min={32}>
          <Node
            position={[0, 0]}
            text="Third Node"
            layout={{ minimumSize: { width: 32, height: 36 } }}
            style={{ stroke: 'gray' }}
          />
        </FlexLayoutItem>
        <FlexLayoutItem itemKey="d" basis={values.basis} grow={0} shrink={1} min={32}>
          <Node
            position={[0, 0]}
            text="Fourth Node"
            layout={{ minimumSize: { width: 32, height: 40 } }}
            style={{ stroke: 'gray' }}
          />
        </FlexLayoutItem>
      </FlexLayout>
    </Layout>
  ),
  () => ({
    rules: [
      {
        kind: 'request',
        inspector: FLEX_LAYOUT_INSPECTOR_KEY,
        target: { kind: 'scene' },
        options: {
          bounds: { container: true, content: false, slot: true, allocation: false, visual: false },
          spacing: { padding: true, margin: false },
          lines: true,
          gaps: true,
          distributedSpace: true,
          overflow: false,
          alignmentGuides: false,
        },
      },
    ],
  }),
);
export const previewSource = preview.source;
/** 当前功能的交互示例 */
const Demo: FC = preview.Component;
export default Demo;
