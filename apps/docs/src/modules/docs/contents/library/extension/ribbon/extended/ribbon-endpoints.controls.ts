import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { ribbonEndpointsI18n } from './ribbon-endpoints.i18n';

/** 按文档语言生成宽度对齐与端帽控件 */
export const createPreviewControlContract = (lang: Lang) => {
  const text = ribbonEndpointsI18n[lang];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      title: text.title,
      sections: [
        {
          label: text.path,
          controls: [
            {
              kind: 'select',
              id: 'centerline',
              label: text.centerline,
              defaultValue: 'curve',
              options: [
                { value: 'curve', label: text.curve },
                { value: 'line', label: text.line },
              ],
            },
          ],
        },
        {
          label: text.start,
          controls: [
            {
              kind: 'select',
              id: 'startDirection',
              label: text.direction,
              defaultValue: 'auto',
              options: [
                { value: 'auto', label: text.auto },
                { value: 'angle', label: text.angle },
              ],
            },
            {
              kind: 'range',
              id: 'startAngle',
              label: text.sectionAngle,
              defaultValue: 90,
              min: 45,
              max: 135,
              step: 15,
              visibleWhen: { controlId: 'startDirection', oneOf: ['angle'] },
            },
          ],
        },
        {
          label: text.end,
          controls: [
            {
              kind: 'select',
              id: 'endDirection',
              label: text.direction,
              defaultValue: 'auto',
              options: [
                { value: 'auto', label: text.auto },
                { value: 'angle', label: text.angle },
              ],
            },
            {
              kind: 'range',
              id: 'endAngle',
              label: text.sectionAngle,
              defaultValue: 90,
              min: 45,
              max: 135,
              step: 15,
              visibleWhen: { controlId: 'endDirection', oneOf: ['angle'] },
            },
          ],
        },
        {
          label: text.alignment,
          controls: [
            {
              kind: 'select',
              id: 'align',
              label: text.align,
              defaultValue: 'center',
              options: [
                { value: 'left', label: text.left },
                { value: 'center', label: text.center },
                { value: 'right', label: text.right },
              ],
            },
          ],
        },
        {
          label: text.caps,
          controls: [
            {
              kind: 'select',
              id: 'cap',
              label: text.cap,
              defaultValue: 'round',
              options: [
                { value: 'butt', label: text.butt },
                { value: 'square', label: text.square },
                { value: 'round', label: text.round },
                { value: 'arc', label: text.arc },
              ],
            },
            { kind: 'range', id: 'width', label: text.width, defaultValue: 30, min: 8, max: 60, step: 2 },
            {
              kind: 'range',
              id: 'arcAngle',
              label: text.arcAngle,
              defaultValue: 120,
              min: 30,
              max: 270,
              step: 15,
              visibleWhen: { controlId: 'cap', oneOf: ['arc'] },
            },
          ],
        },
      ],
    }),
    canonicalValues: {
      centerline: 'curve',
      align: 'center',
      cap: 'round',
      width: 30,
      arcAngle: 120,
      startDirection: 'auto',
      endDirection: 'auto',
      startAngle: 90,
      endAngle: 90,
    },
    relatedApis: [
      'Step.kind',
      'Step.control1',
      'Step.control2',
      'Path.kindOptions.start.direction',
      'Path.kindOptions.end.direction',
      'Path.kindOptions.align',
      'Path.kindOptions.width',
      'Path.kindOptions.start.cap',
      'Path.kindOptions.end.cap',
    ],
  } satisfies PreviewControlContract;
};

/** 默认中文控件契约 */
export const previewControlContract = createPreviewControlContract('zh');
