import type { FC } from 'react';

import { Layout, Node, Rectangle } from '@retikz/react';

import type { PreviewSourceConfig } from '@/modules/docs/components/component-preview/author';

import { usePreviewControls } from '@/modules/docs/components/component-preview/author';

import { layoutViewboxControls } from './layout-viewbox.controls';

export const previewControls = layoutViewboxControls;

const VIEWBOX_GUIDE_INSET = 2;

export const previewSource = {
  deriveIR: false,
} satisfies PreviewSourceConfig;

/**
 * 自定义 viewBox 固定视框
 * @description 内容只有两个小圆，但显式 viewBox 定死 240×240 的视框（中心在原点）——内容不再撑满、四周留白由视框决定。
 *   有 viewBox 则覆盖自动算的 layout、忽略 padding。
 */
const Demo: FC = () => {
  const values = usePreviewControls(layoutViewboxControls);
  const viewBoxGuideWidth = Math.max(0, values.viewBoxWidth - VIEWBOX_GUIDE_INSET * 2);
  const viewBoxGuideHeight = Math.max(0, values.viewBoxHeight - VIEWBOX_GUIDE_INSET * 2);

  return (
    <Layout
      width={values.width}
      height={values.height}
      style={{ outline: '1px dashed gray', outlineOffset: '-1px' }}
      viewBox={{
        x: values.viewBoxX,
        y: values.viewBoxY,
        width: values.viewBoxWidth,
        height: values.viewBoxHeight,
      }}
    >
      <Node id="o" position={[0, 0]} shape="circle" minimumSize={44} fill="dodgerblue" textColor="white">
        0,0
      </Node>
      <Node id="c" position={[70, 70]} shape="circle" minimumSize={24} fill="darkorange" />
      <Rectangle
        center={[values.viewBoxX + values.viewBoxWidth / 2, values.viewBoxY + values.viewBoxHeight / 2]}
        width={viewBoxGuideWidth}
        height={viewBoxGuideHeight}
        fill="none"
        stroke="lightgray"
        dashPattern={[1, 4]}
        lineCap="round"
      />
    </Layout>
  );
};

export default Demo;
