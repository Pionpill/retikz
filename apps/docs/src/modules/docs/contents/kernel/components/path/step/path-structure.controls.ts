import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { pathStructureControlsI18n } from './path-structure.i18n';

/** Path 基础结构 playground 的中文属性面板 */
const createControls = (lang: Lang) => {
  const i18n = pathStructureControlsI18n[lang];
  return definePreviewControls({
    presentation: 'panel',
    title: i18n.pathStructure,
    sections: [
      {
        label: i18n.structure,
        controls: [
          {
            kind: 'select',
            id: 'structure',
            label: i18n.structure2,
            defaultValue: 'polyline',
            options: [
              { value: 'polyline', label: i18n.polyline },
              { value: 'subpaths', label: i18n.multipleSubpaths },
              { value: 'fill', label: i18n.filledPath },
            ],
          },
          {
            kind: 'color',
            id: 'fill',
            label: i18n.fill,
            defaultValue: '#1e90ff',
            visibleWhen: { controlId: 'structure', oneOf: ['fill'] },
          },
        ],
      },
    ],
  });
};

/** 默认中文控件，用于推导控件值类型 */
export const pathStructureControls = createControls('zh');

/** 当前 controls 面板的稳定文档契约 */
export const createPreviewControlContract = (lang: Lang) =>
  ({
    controls: createControls(lang),
    canonicalValues: { structure: 'polyline', fill: '#1e90ff' },
    relatedApis: ['Path.children', 'Path.style.fill'],
  }) satisfies PreviewControlContract;

/** 默认中文预览契约 */
export const previewControlContract = createPreviewControlContract('zh');
