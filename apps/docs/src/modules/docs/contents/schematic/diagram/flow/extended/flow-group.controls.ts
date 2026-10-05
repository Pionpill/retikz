import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { flowGroupI18n } from './flow-group.i18n';

/** 建立可见 Group 的双语 controls 契约 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const copy = flowGroupI18n[lang];
  const controls = definePreviewControls({
    presentation: 'panel',
    defaultSize: 50,
    title: copy.title,
    sections: [
      {
        label: copy.textSection,
        controls: [
          { kind: 'switch', id: 'showTitle', label: copy.showTitleLabel, defaultValue: true },
          { kind: 'switch', id: 'showDescription', label: copy.showDescriptionLabel, defaultValue: true },
          { kind: 'switch', id: 'showLabels', label: copy.showLabelsLabel, defaultValue: true },
        ],
      },
      {
        label: copy.section,
        controls: [
          {
            kind: 'select',
            id: 'direction',
            label: copy.directionLabel,
            defaultValue: 'right',
            options: copy.directionOptions,
          },
          { kind: 'range', id: 'nodeGap', label: copy.nodeGapLabel, defaultValue: 24, min: 8, max: 64, step: 8 },
          { kind: 'range', id: 'rankGap', label: copy.rankGapLabel, defaultValue: 48, min: 24, max: 80, step: 8 },
        ],
      },
    ],
  });

  return {
    controls,
    canonicalValues: {
      showTitle: true,
      showDescription: true,
      showLabels: true,
      direction: 'right',
      nodeGap: 24,
      rankGap: 48,
    },
    relatedApis: [
      'FlowGroup.caption.title',
      'FlowGroup.caption.description',
      'FlowGroup.labels',
      'FlowGroup.layout.direction',
      'FlowGroup.layout.nodeGap',
      'FlowGroup.layout.rankGap',
    ],
  } satisfies PreviewControlContract;
};

export const previewControlContract = createPreviewControlContract();

export const previewControls = previewControlContract.controls;
