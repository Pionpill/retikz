import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { listLabelsI18n } from './list-labels.i18n';

/** 按文档语言创建交互面板 */
const createControls = (lang: Lang) => {
  const t = listLabelsI18n[lang];
  return definePreviewControls({
    presentation: 'panel',
    defaultSize: 50,
    title: t.title,
    sections: [
      {
        label: t.label,
        controls: [
          { kind: 'text', id: 'text', label: t.text, defaultValue: 'values' },
          {
            kind: 'select',
            id: 'positionMode',
            label: t.positionMode,
            defaultValue: 'direction',
            options: [
              { value: 'direction', label: t.namedDirection },
              { value: 'boundary', label: t.boundaryFraction },
            ],
          },
          {
            kind: 'select',
            id: 'direction',
            label: t.direction,
            defaultValue: 'top',
            visibleWhen: { controlId: 'positionMode', oneOf: ['direction'] },
            options: [
              { value: 'top', label: t.top },
              { value: 'right', label: t.right },
              { value: 'bottom', label: t.bottom },
              { value: 'left', label: t.left },
            ],
          },
          {
            kind: 'select',
            id: 'boundary',
            label: t.boundary,
            defaultValue: 'top',
            visibleWhen: { controlId: 'positionMode', oneOf: ['boundary'] },
            options: [
              { value: 'top', label: t.topBoundary },
              { value: 'right', label: t.rightBoundary },
              { value: 'bottom', label: t.bottomBoundary },
              { value: 'left', label: t.leftBoundary },
            ],
          },
          {
            kind: 'range',
            id: 'fraction',
            label: t.fraction,
            defaultValue: 0.5,
            min: 0,
            max: 1,
            step: 0.05,
            visibleWhen: { controlId: 'positionMode', oneOf: ['boundary'] },
          },
          {
            kind: 'select',
            id: 'align',
            label: t.align,
            defaultValue: 'middle',
            options: [
              { value: 'start', label: t.start },
              { value: 'middle', label: t.middle },
              { value: 'end', label: t.end },
            ],
          },
          { kind: 'range', id: 'distance', label: t.distance, defaultValue: 16, min: 0, max: 40, step: 1 },
          { kind: 'range', id: 'rotate', label: t.rotate, defaultValue: 0, min: -180, max: 180, step: 15 },
        ],
      },
      {
        label: t.appearance,
        controls: [
          { kind: 'range', id: 'fontSize', label: t.fontSize, defaultValue: 16, min: 10, max: 24, step: 1 },
          { kind: 'color', id: 'color', label: t.color, defaultValue: '#2563eb' },
          { kind: 'switch', id: 'pin', label: t.pin, defaultValue: true },
        ],
      },
    ],
  });
};
/** 交互示例的稳定状态和 API 覆盖 */
export const createPreviewControlContract = (lang: Lang) =>
  ({
    controls: createControls(lang),
    canonicalValues: {
      text: 'values',
      positionMode: 'direction',
      direction: 'top',
      boundary: 'top',
      fraction: 0.5,
      align: 'middle',
      distance: 16,
      rotate: 0,
      fontSize: 16,
      color: '#2563eb',
      pin: true,
    },
    relatedApis: ['List.label'],
  }) satisfies PreviewControlContract;
/** 注册与源码派生使用的默认契约 */
export const previewControlContract = createPreviewControlContract('zh');
