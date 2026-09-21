import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { nodeShapeI18n } from './node-shape.i18n';

/** node-shape playground 使用的稳定字段 id */
export const NodeShapeControlId = {
  Shape: 'shape',
  Sides: 'sides',
} as const;

/** 按语言创建 Node 形状属性面板 */
export const createNodeShapeControls = (i18n: typeof nodeShapeI18n.zh) =>
  definePreviewControls({
    presentation: 'panel',
    title: i18n.title,
    sections: [
      {
        label: i18n.section,
        controls: [
          {
            kind: 'select',
            id: NodeShapeControlId.Shape,
            label: i18n.shape,
            defaultValue: 'rectangle',
            options: [
              { value: 'rectangle', label: i18n.rectangle },
              { value: 'circle', label: i18n.circle },
              { value: 'ellipse', label: i18n.ellipse },
              { value: 'diamond', label: i18n.diamond },
              { value: 'polygon', label: i18n.polygon },
            ],
          },
          {
            kind: 'range',
            id: NodeShapeControlId.Sides,
            label: i18n.sides,
            defaultValue: 6,
            min: 3,
            max: 8,
            step: 1,
            visibleWhen: { controlId: NodeShapeControlId.Shape, oneOf: ['polygon'] },
          },
        ],
      },
    ],
  });

export const nodeShapeControls = createNodeShapeControls(nodeShapeI18n.zh);

/** 按文档语言生成 Node 形状 playground 的稳定契约 */
export const createPreviewControlContract = (lang: Lang) =>
  ({
    controls: createNodeShapeControls(nodeShapeI18n[lang]),
    canonicalValues: { shape: 'rectangle', sides: 6 },
    relatedApis: ['Node.shape'],
  }) satisfies PreviewControlContract;

export const previewControlContract = createPreviewControlContract('zh');
