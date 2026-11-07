import { FlexLayout, FlexLayoutItem } from '@retikz/layout-react';
import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

import { defineFlexPreview } from '../preview';
import { previewControlContract } from './flex-clipping.controls';

export { createPreviewControlContract } from './flex-clipping.controls';
export const previewControls = previewControlContract.controls;

const preview = defineFlexPreview(previewControlContract, values => (
  <Layout>
    <FlexLayout
      size={{ x: { kind: 'fixed', value: values.width }, y: { kind: 'fixed', value: 88 } }}
      padding={12}
      overflow={values.overflow}
    >
      <FlexLayoutItem itemKey="a" basis={values.basis} min={values.basis} max={values.basis}>
        <Node
          text="First Node"
          layout={{ minimumSize: { width: values.childWidth, height: 44 } }}
          style={{ stroke: 'dodgerblue' }}
        />
      </FlexLayoutItem>
    </FlexLayout>
  </Layout>
));

export const previewSource = preview.source;

/** 当前功能的交互示例 */
const Demo: FC = preview.Component;
export default Demo;
