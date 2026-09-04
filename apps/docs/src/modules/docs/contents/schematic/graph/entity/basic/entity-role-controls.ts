import type { EntityProps } from '@retikz/graph-react';

import { GraphStatus } from '@retikz/graph';

import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** Entity role demo 共用的稳定字段 id */
export const EntityRoleControlId = {
  Status: 'status',
  Color: 'color',
  Content: 'content',
} as const;

/** 只在用户选择具体颜色时写入单个 Entity 的精确 appearance */
export const defineEntityAppearanceProps = (color: string): Pick<EntityProps, 'color' | 'stroke'> =>
  color === 'currentColor' ? {} : { color, stroke: color };

type EntityRoleControlCopy = Readonly<{
  title: string;
  sectionLabel: string;
  statusLocale: 'zh' | 'en';
  colorLabel: string;
  contentLabel: string;
  contentPlaceholder: string;
  content: string;
}>;

const entityStatusOptions = {
  zh: [
    { value: '', label: '无状态' },
    { value: GraphStatus.Error, label: '错误 - error' },
    { value: GraphStatus.Success, label: '成功 - success' },
    { value: GraphStatus.Warning, label: '警告 - warning' },
    { value: GraphStatus.Disabled, label: '禁用 - disabled' },
  ],
  en: [
    { value: '', label: 'No status' },
    { value: GraphStatus.Error, label: 'Error' },
    { value: GraphStatus.Success, label: 'Success' },
    { value: GraphStatus.Warning, label: 'Warning' },
    { value: GraphStatus.Disabled, label: 'Disabled' },
  ],
} as const;

/** 建立一个本地化 Entity role controls 契约 */
export const defineEntityRoleControlContract = <const TCopy extends EntityRoleControlCopy>(copy: TCopy) => {
  const controls = definePreviewControls({
    presentation: 'panel',
    title: copy.title,
    sections: [
      {
        label: copy.sectionLabel,
        controls: [
          {
            kind: 'select',
            id: EntityRoleControlId.Status,
            label: copy.statusLocale === 'zh' ? '状态' : 'Status',
            defaultValue: '',
            options: entityStatusOptions[copy.statusLocale],
          },
          {
            kind: 'color',
            id: EntityRoleControlId.Color,
            label: copy.colorLabel,
            defaultValue: 'currentColor',
          },
          {
            kind: 'text',
            id: EntityRoleControlId.Content,
            label: copy.contentLabel,
            defaultValue: copy.content,
            placeholder: copy.contentPlaceholder,
          },
        ],
      },
    ],
  });

  return {
    controls,
    canonicalValues: {
      status: '',
      color: 'currentColor',
      content: copy.content,
    },
    relatedApis: ['Entity.status', 'Entity.color', 'Entity.children'],
  } satisfies PreviewControlContract;
};
