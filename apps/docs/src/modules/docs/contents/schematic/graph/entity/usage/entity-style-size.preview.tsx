import { Entity, Graph } from '@retikz/graph-react';

import type { Lang } from '@/i18n';

import { entityStyleSizeI18n } from './entity-style-size.i18n';

/** 图形参数 */
export type EntityStyleSizePreviewValues = {
  color: string;
  fill: number;
  strokeWidth: number;
  maxTextWidth: number;
  lineHeight: number;
  minimumWidth: number;
};

/** 绘制示例图形 */
export const EntityStyleSizePreview = (values: EntityStyleSizePreviewValues, lang: Lang) => (
  <Graph viewBox={{ x: 0, y: 0, width: 440, height: 200 }}>
    <Entity
      role="activity"
      position={[220, 100]}
      style={{ color: values.color, fill: values.fill, strokeWidth: values.strokeWidth }}
      layout={{
        maxTextWidth: values.maxTextWidth,
        lineHeight: values.lineHeight,
        minimumSize: { width: values.minimumWidth },
      }}
    >
      {entityStyleSizeI18n[lang].text}
    </Entity>
  </Graph>
);
