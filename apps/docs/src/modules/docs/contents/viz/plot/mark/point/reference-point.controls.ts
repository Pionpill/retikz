import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import {
  referenceCoordinateControl,
  referenceCategoryControl,
  referenceContinuousCondition,
} from '../shared/reference-coordinate.controls';
import { referencePointI18n } from './reference-point.i18n';

/** 图元位置试验场的控件与稳定状态 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const text = referencePointI18n[lang];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      title: text.title,
      sections: [
        {
          controls: [
            referenceCoordinateControl(lang),
            referenceCategoryControl(lang, 'category', 'D'),
            {
              kind: 'select',
              id: 'orientation',
              label: text.orientation,
              visibleWhen: { controlId: 'coordinate', oneOf: ['polar-continuous', 'polar-discrete'] },
              defaultValue: 'screen',
              options: [
                { value: 'screen', label: text.screen },
                { value: 'x-tangent', label: text.xTangent },
                { value: 'x-normal', label: text.xNormal },
                { value: 'y-tangent', label: text.yTangent },
                { value: 'y-normal', label: text.yNormal },
              ],
            },
            {
              kind: 'select',
              id: 'preset',
              label: text.preset,
              defaultValue: 'shape',
              options: [
                { value: 'shape', label: text.geometry },
                { value: 'text', label: text.text },
              ],
            },
            {
              kind: 'range',
              id: 'fontSize',
              label: text.fontSize,
              defaultValue: 20,
              min: 12,
              max: 32,
              step: 2,
              visibleWhen: { controlId: 'preset', oneOf: ['text'] },
            },
            {
              kind: 'range',
              id: 'x',
              visibleWhen: referenceContinuousCondition,
              label: text.x,
              defaultValue: 50,
              min: 15,
              max: 85,
              step: 5,
            },
            { kind: 'range', id: 'y', label: text.y, defaultValue: 50, min: 15, max: 85, step: 5 },
            {
              kind: 'select',
              id: 'shape',
              visibleWhen: { controlId: 'preset', oneOf: ['shape'] },
              label: text.shape,
              defaultValue: 'circle',
              options: [
                { value: 'circle', label: text.shape0 },
                { value: 'rectangle', label: text.shape1 },
              ],
            },
            {
              kind: 'range',
              id: 'size',
              visibleWhen: { controlId: 'preset', oneOf: ['shape'] },
              label: text.size,
              defaultValue: 12,
              min: 6,
              max: 24,
              step: 2,
            },
            {
              kind: 'switch',
              id: 'showLabel',
              visibleWhen: { controlId: 'preset', oneOf: ['shape'] },
              label: text.showLabel,
              defaultValue: true,
            },
            {
              kind: 'select',
              id: 'labelPosition',
              visibleWhen: { controlId: 'preset', oneOf: ['shape'] },
              label: text.labelPosition,
              defaultValue: 'top',
              options: [
                { value: 'top', label: text.labelPosition0 },
                { value: 'right', label: text.labelPosition1 },
                { value: 'bottom', label: text.labelPosition2 },
                { value: 'left', label: text.labelPosition3 },
              ],
            },
            {
              kind: 'range',
              id: 'distance',
              visibleWhen: { controlId: 'preset', oneOf: ['shape'] },
              label: text.distance,
              defaultValue: 10,
              min: 0,
              max: 24,
              step: 2,
            },
          ],
        },
      ],
    }),
    canonicalValues: {
      coordinate: 'cartesian',
      category: 'D',
      orientation: 'screen',
      preset: 'shape',
      fontSize: 20,
      x: 50,
      y: 50,
      shape: 'circle',
      size: 12,
      showLabel: true,
      labelPosition: 'top',
      distance: 10,
    },
    relatedApis: [
      'PointMark.encodings.position.x',
      'PointMark.encodings.position.y',
      'PointMark.properties.shape',
      'PointMark.properties.size',
      'PointMark.properties.orientation',
      'PointMark.properties.label',
    ],
  } satisfies PreviewControlContract;
};
/** 默认控件契约 */
export const previewControlContract = createPreviewControlContract();
