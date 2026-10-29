import { FlexLayout, FlexLayoutItem } from '@retikz/layout-react';
import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

import { defineFlexPreview } from '../preview';
import { previewControlContract } from './flex-geometry.controls';

export { createPreviewControlContract } from './flex-geometry.controls';
export const previewControls = previewControlContract.controls;

const preview = defineFlexPreview(previewControlContract, values => (
  <Layout>
    <FlexLayout
      direction={values.direction}
      size={{
        x: values.widthMode === 'fixed' ? { kind: 'fixed', value: values.width } : { kind: 'content' },
        y: values.heightMode === 'fixed' ? { kind: 'fixed', value: values.height } : { kind: 'content' },
      }}
      padding={values.padding}
      gap={values.gap}
    >
      <FlexLayoutItem itemKey="a">
        <Node text="First Node" layout={{ minimumSize: { width: 36, height: 36 } }} style={{ stroke: 'dodgerblue' }} />
      </FlexLayoutItem>
      <FlexLayoutItem itemKey="b">
        <Node text="Secondary Node" layout={{ minimumSize: { width: 36, height: 36 } }} style={{ stroke: 'gray' }} />
      </FlexLayoutItem>
      <FlexLayoutItem itemKey="c">
        <Node text="Third Node" layout={{ minimumSize: { width: 36, height: 36 } }} style={{ stroke: 'gray' }} />
      </FlexLayoutItem>
    </FlexLayout>
  </Layout>
));

export const previewSource = preview.source;

/** 当前功能的交互示例 */
const Demo: FC = preview.Component;
export default Demo;
