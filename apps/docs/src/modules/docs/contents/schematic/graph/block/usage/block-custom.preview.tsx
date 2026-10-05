import { Block, BlockHeader, Graph } from '@retikz/graph-react';
import { Node } from '@retikz/react';

import type { Lang } from '@/i18n';

import { blockCustomI18n } from './block-custom.i18n';

const ACCENT = '#f97316';

/** 图形参数 */
export type BlockCustomPreviewValues = {
  content: string;
  fontSize: 'sm' | 'xs' | 'base' | 'lg';
  shape: 'diamond' | 'rectangle' | 'circle' | 'ellipse';
  padding: number;
  minimumWidth: number;
  minimumHeight: number;
  rotate: number;
  cornerRadius: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  dashed: boolean;
  opacity: number;
  shadow: 'sm' | 'none' | 'lg' | 'md';
  textColor: string;
};

/** 使用开放 slot 与普通 Core Node 组合自定义 Block 内容 */
export const BlockCustomPreview = (values: BlockCustomPreviewValues, lang: Lang = 'zh') => (
  <Graph viewBox={{ x: -90, y: -64, width: 420, height: 340 }}>
    <Block id="user-service">
      <BlockHeader
        icon={
          <Node
            position={[0, 0]}
            shape="circle"
            style={{ fill: ACCENT, fillOpacity: 0.1, stroke: 'none', textColor: ACCENT }}
            layout={{ minimumSize: 24, padding: 4 }}
          >
            U
          </Node>
        }
        title="UserService"
        description={blockCustomI18n[lang].description}
        trail={
          <Node
            position={[0, 0]}
            cornerRadius={4}
            style={{ fill: ACCENT, fillOpacity: 0.1, stroke: 'none', textColor: ACCENT, font: { size: 'sm' } }}
            layout={{ padding: { x: 6, y: 2 } }}
          >
            public
          </Node>
        }
      />
      <Node
        position={[0, 0]}
        shape={values.shape}
        rotate={values.rotate}
        cornerRadius={values.cornerRadius}
        style={{
          fill: values.fill,
          stroke: values.stroke,
          strokeWidth: values.strokeWidth,
          dashed: values.dashed,
          opacity: values.opacity,
          shadow: values.shadow,
          textColor: values.textColor,
          font: { size: values.fontSize },
        }}
        layout={{ padding: values.padding, minimumSize: { width: values.minimumWidth, height: values.minimumHeight } }}
      >
        {values.content}
      </Node>
    </Block>
  </Graph>
);
