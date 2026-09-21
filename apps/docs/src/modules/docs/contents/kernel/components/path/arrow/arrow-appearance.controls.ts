import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { arrowAppearanceControlsI18n } from './arrow-appearance.i18n';

/** Arrow 方向、形状、起末覆盖与外观的中文属性面板 */
const createControls = (lang: Lang) => {
  const i18n = arrowAppearanceControlsI18n[lang];
  const shapeOptions = [
    { label: i18n.solidTriangle, value: 'normal' },
    { label: i18n.hollowTriangle, value: 'open' },
    { label: i18n.solidStealth, value: 'stealth' },
    { label: i18n.hollowStealth, value: 'openStealth' },
    { label: i18n.solidDiamond, value: 'diamond' },
    { label: i18n.hollowDiamond, value: 'openDiamond' },
    { label: i18n.solidCircle, value: 'circle' },
    { label: i18n.hollowCircle, value: 'openCircle' },
  ] as const;
  return definePreviewControls({
    presentation: 'panel',
    defaultSize: 50,
    title: i18n.arrow,
    sections: [
      {
        label: i18n.endpoints,
        controls: [
          {
            kind: 'select',
            id: 'direction',
            label: i18n.direction,
            defaultValue: '<->',
            options: [
              { label: i18n.none, value: 'none' },
              { label: i18n.end, value: '->' },
              { label: i18n.start, value: '<-' },
              { label: i18n.both, value: '<->' },
            ],
          },
          { kind: 'select', id: 'shape', label: i18n.sharedShape, defaultValue: 'stealth', options: shapeOptions },
          { kind: 'switch', id: 'separateEnds', label: i18n.configureEndsSeparately, defaultValue: false },
          {
            kind: 'select',
            id: 'startShape',
            label: i18n.startShape,
            defaultValue: 'diamond',
            options: shapeOptions,
            visibleWhen: { controlId: 'separateEnds', oneOf: [true] },
          },
          {
            kind: 'select',
            id: 'endShape',
            label: i18n.endShape,
            defaultValue: 'open',
            options: shapeOptions,
            visibleWhen: { controlId: 'separateEnds', oneOf: [true] },
          },
        ],
      },
      {
        label: i18n.colorAndOpacity,
        controls: [
          { kind: 'color', id: 'color', label: i18n.sharedColor, defaultValue: '#1e90ff' },
          {
            kind: 'color',
            id: 'startColor',
            label: i18n.startColor,
            defaultValue: '#e63946',
            visibleWhen: { controlId: 'separateEnds', oneOf: [true] },
          },
          {
            kind: 'color',
            id: 'endColor',
            label: i18n.endColor,
            defaultValue: '#1e90ff',
            visibleWhen: { controlId: 'separateEnds', oneOf: [true] },
          },
          { kind: 'range', id: 'opacity', label: i18n.arrowOpacity, defaultValue: 1, min: 0.1, max: 1, step: 0.1 },
        ],
      },
      {
        label: i18n.size,
        controls: [
          { kind: 'range', id: 'scale', label: i18n.scale, defaultValue: 1, min: 0.5, max: 2.5, step: 0.1 },
          { kind: 'range', id: 'length', label: i18n.length, defaultValue: 10, min: 2, max: 24, step: 1 },
          { kind: 'range', id: 'width', label: i18n.width, defaultValue: 8, min: 2, max: 20, step: 1 },
        ],
      },
    ],
  });
};

/** 默认中文控件，用于推导控件值类型 */
export const arrowAppearanceControls = createControls('zh');

/** 当前 controls 面板的稳定文档契约 */
export const createPreviewControlContract = (lang: Lang) =>
  ({
    controls: createControls(lang),
    canonicalValues: {
      direction: '<->',
      shape: 'stealth',
      separateEnds: false,
      startShape: 'diamond',
      endShape: 'open',
      color: '#1e90ff',
      startColor: '#e63946',
      endColor: '#1e90ff',
      opacity: 1,
      scale: 1,
      length: 10,
      width: 8,
    },
    relatedApis: ['Draw.arrow', 'Draw.arrowDetail', 'Path.arrow', 'Path.arrowDetail'],
  }) satisfies PreviewControlContract;

/** 默认中文预览契约 */
export const previewControlContract = createPreviewControlContract('zh');
