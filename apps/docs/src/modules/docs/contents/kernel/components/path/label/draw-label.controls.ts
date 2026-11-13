import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { drawLabelControlsI18n } from './draw-label.i18n';

/** Draw label playground 的中文属性面板 */
const createControls = (lang: Lang) => {
  const i18n = drawLabelControlsI18n[lang];
  return definePreviewControls({
    presentation: 'panel',
    title: i18n.drawEdgeLabel,
    sections: [
      {
        label: i18n.segmentAndPosition,
        controls: [
          {
            kind: 'select',
            id: 'segmentKind',
            label: i18n.segmentKind,
            defaultValue: 'line',
            options: [
              { value: 'corner', label: i18n.corner },
              { value: 'line', label: i18n.line },
              { value: '-|', label: i18n.horizontalThenVertical },
              { value: '|-', label: i18n.verticalThenHorizontal },
              { value: 'curve', label: i18n.quadraticBezier },
            ],
          },
          {
            kind: 'select',
            id: 'positionMode',
            label: i18n.positionMode,
            defaultValue: 'step',
            options: [
              { value: 'step', label: i18n.step },
              { value: 'length', label: i18n.length },
            ],
          },
          {
            kind: 'select',
            id: 'positionGeometry',
            label: i18n.positionGeometry,
            defaultValue: 'default',
            options: [
              { value: 'default', label: i18n.defaultGeometry },
              { value: 'original', label: i18n.original },
              { value: 'rounded', label: i18n.rounded },
            ],
          },
          { kind: 'range', id: 'cornerRadius', label: i18n.cornerRadius, defaultValue: 25, min: 0, max: 40, step: 1 },
          {
            kind: 'range',
            id: 'position',
            label: i18n.position,
            defaultValue: 0.5,
            min: 0,
            max: 1,
            step: 0.05,
          },
          {
            kind: 'select',
            id: 'side',
            label: i18n.side,
            defaultValue: 'top',
            options: [
              { value: 'center', label: i18n.center },
              { value: 'top', label: i18n.top },
              { value: 'bottom', label: i18n.bottom },
              { value: 'left', label: i18n.left },
              { value: 'right', label: i18n.right },
            ],
          },
        ],
      },
      {
        label: i18n.text,
        controls: [
          { kind: 'switch', id: 'sloped', label: i18n.rotateAlongPath, defaultValue: false },
          { kind: 'color', id: 'textColor', label: i18n.textColor, defaultValue: '#6b7280' },
          {
            kind: 'select',
            id: 'textAlign',
            label: i18n.textAlign,
            defaultValue: 'middle',
            options: [
              { value: 'start', label: i18n.left },
              { value: 'middle', label: i18n.center },
              { value: 'end', label: i18n.right },
            ],
          },
          { kind: 'range', id: 'lineHeight', label: i18n.lineHeight, defaultValue: 20, min: 10, max: 40, step: 1 },
          { kind: 'range', id: 'maxTextWidth', label: i18n.maxTextWidth, defaultValue: 80, min: 30, max: 160, step: 5 },
        ],
      },
    ],
  });
};

/** 默认中文控件，用于推导控件值类型 */
export const drawLabelControls = createControls('zh');

/** 当前 controls 面板的稳定文档契约 */
export const createPreviewControlContract = (lang: Lang) =>
  ({
    controls: createControls(lang),
    canonicalValues: {
      segmentKind: 'line',
      position: 0.5,
      positionMode: 'step',
      positionGeometry: 'default',
      cornerRadius: 25,
      side: 'top',
      sloped: false,
      textColor: '#6b7280',
      textAlign: 'middle',
      lineHeight: 20,
      maxTextWidth: 80,
    },
    relatedApis: ['Draw.label'],
  }) satisfies PreviewControlContract;

/** 默认中文预览契约 */
export const previewControlContract = createPreviewControlContract('zh');
