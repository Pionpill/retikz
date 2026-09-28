import { FlexLayout, FlexLayoutItem } from '@retikz/layout-react';
import { FLEX_LAYOUT_INSPECTOR_KEY } from '@retikz/layout/inspect';
import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

import { defineFlexPreview } from '../preview';
import { previewControlContract } from './flex-alignment.controls';

export { createPreviewControlContract } from './flex-alignment.controls';
export const previewControls = previewControlContract.controls;
const preview = defineFlexPreview(
  previewControlContract,
  values => (
    <Layout>
      <FlexLayout
        size={{ x: { kind: 'fixed', value: 300 }, y: { kind: 'fixed', value: 140 } }}
        padding={12}
        gap={8}
        justifyContent={values.justifyContent}
        alignItems={values.alignItems}
      >
        <FlexLayoutItem itemKey="a" basis={60} grow={0} shrink={0}>
          <Node
            position={[0, 0]}
            text="A"
            layout={{ minimumSize: { width: 36, height: 28 } }}
            style={{ stroke: 'dodgerblue' }}
          />
        </FlexLayoutItem>
        <FlexLayoutItem
          itemKey="b"
          basis={60}
          grow={0}
          shrink={0}
          {...(values.alignSelf === 'auto' ? {} : { alignSelf: values.alignSelf })}
        >
          <Node
            position={[0, 0]}
            text="B"
            layout={{ minimumSize: { width: 36, height: 44 } }}
            style={{ stroke: 'gray' }}
          />
        </FlexLayoutItem>
        <FlexLayoutItem itemKey="c" basis={60} grow={0} shrink={0}>
          <Node
            position={[0, 0]}
            text="C"
            layout={{ minimumSize: { width: 36, height: 64 } }}
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
