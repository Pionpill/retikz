import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { flowCompoundI18n } from './flow-compound.i18n';

/** Flow 分组排布 demo 的稳定 control id */
export const FlowCompoundControlId = {
  GroupDirection: 'groupDirection',
  GroupNodeGap: 'groupNodeGap',
  GroupRankGap: 'groupRankGap',
  LayoutDirection: 'layoutDirection',
  LayoutGap: 'layoutGap',
} as const;

type FlowCompoundControlOption = Readonly<{
  value: string;
  label: string;
}>;

type FlowCompoundControlCopy = Readonly<{
  title: string;
  groupSection: string;
  groupDirectionLabel: string;
  directionOptions: ReadonlyArray<FlowCompoundControlOption>;
  groupNodeGapLabel: string;
  groupRankGapLabel: string;
  layoutSection: string;
  layoutDirectionLabel: string;
  layoutGapLabel: string;
}>;

/** 建立双语同构的 Flow 分组排布 controls 契约 */
export const defineFlowCompoundControlContract = (copy: FlowCompoundControlCopy) => {
  const controls = definePreviewControls({
    presentation: 'panel',
    title: copy.title,
    sections: [
      {
        label: copy.groupSection,
        controls: [
          {
            kind: 'select',
            id: FlowCompoundControlId.GroupDirection,
            label: copy.groupDirectionLabel,
            defaultValue: 'right',
            options: copy.directionOptions,
          },
          {
            kind: 'range',
            id: FlowCompoundControlId.GroupNodeGap,
            label: copy.groupNodeGapLabel,
            defaultValue: 20,
            min: 12,
            max: 32,
            step: 4,
          },
          {
            kind: 'range',
            id: FlowCompoundControlId.GroupRankGap,
            label: copy.groupRankGapLabel,
            defaultValue: 36,
            min: 24,
            max: 48,
            step: 4,
          },
        ],
      },
      {
        label: copy.layoutSection,
        controls: [
          {
            kind: 'select',
            id: FlowCompoundControlId.LayoutDirection,
            label: copy.layoutDirectionLabel,
            defaultValue: 'right',
            options: copy.directionOptions,
          },
          {
            kind: 'range',
            id: FlowCompoundControlId.LayoutGap,
            label: copy.layoutGapLabel,
            defaultValue: 24,
            min: 12,
            max: 32,
            step: 4,
          },
        ],
      },
    ],
  });

  return {
    controls,
    canonicalValues: {
      groupDirection: 'right',
      groupNodeGap: 20,
      groupRankGap: 36,
      layoutDirection: 'right',
      layoutGap: 24,
    },
    relatedApis: [
      'FlowGroup.layout.direction',
      'FlowGroup.layout.nodeGap',
      'FlowGroup.layout.rankGap',
      'FlowLayout.direction',
      'FlowLayout.gap',
    ],
  } satisfies PreviewControlContract;
};

/** 按当前文档语言建立面板契约 */
export const createPreviewControlContract = (lang: Lang = 'zh') =>
  defineFlowCompoundControlContract(flowCompoundI18n[lang].controls);

export const previewControlContract = createPreviewControlContract();
export const flowCompoundControls = previewControlContract.controls;
