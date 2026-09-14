import type { EntityProps } from '@retikz/graph-react';

import { GraphStatus } from '@retikz/graph';

import type { LogicFigureEntityKindValue } from '@/modules/docs/components/logic-figure';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { LogicFigureEntityKind } from '@/modules/docs/components/logic-figure';
import { definePreviewControls } from '@/modules/docs/preview';

/** Entity role demo 共用的稳定字段 id */
export const EntityRoleControlId = {
  Kind: 'kind',
  Status: 'status',
  Color: 'color',
  Content: 'content',
} as const;

/** 只在用户选择具体颜色时写入单个 Entity 的精确 appearance */
export const defineEntityAppearanceProps = (color: string): Pick<EntityProps, 'style'> =>
  color === 'currentColor' ? {} : { style: { color, stroke: color } };

type EntityRoleControlCopy = Readonly<{
  title: string;
  sectionLabel: string;
  statusLocale: 'zh' | 'en';
  colorLabel: string;
  contentLabel: string;
  contentPlaceholder: string;
  content: string;
  kinds: ReadonlyArray<LogicFigureEntityKindValue>;
}>;

const entityKindLabels = {
  zh: {
    [LogicFigureEntityKind.Important]: '重要逻辑内容 - docs.logic.important',
    [LogicFigureEntityKind.ImportantData]: '重要的数据、数据结构、类型或 schema - docs.logic.importantData',
    [LogicFigureEntityKind.Secondary]: '次要或背景内容 - docs.logic.secondary',
    [LogicFigureEntityKind.Algorithm]: '算法、高复杂度或性能逻辑 - docs.logic.algorithm',
  },
  en: {
    [LogicFigureEntityKind.Important]: 'Important logic - docs.logic.important',
    [LogicFigureEntityKind.ImportantData]: 'Important data, data structure, type, or schema - docs.logic.importantData',
    [LogicFigureEntityKind.Secondary]: 'Secondary or background content - docs.logic.secondary',
    [LogicFigureEntityKind.Algorithm]: 'Algorithm, high-complexity, or performance logic - docs.logic.algorithm',
  },
} satisfies Record<'zh' | 'en', Record<LogicFigureEntityKindValue, string>>;

/** 返回 role 当前站点 kind 的本地化选项，不提供跨 role 候选项 */
const entityKindOptionOf = (kind: LogicFigureEntityKindValue, locale: 'zh' | 'en') => ({
  value: kind,
  label: entityKindLabels[locale][kind],
});

const noKindOption = (locale: 'zh' | 'en') => ({
  value: '',
  label: locale === 'zh' ? '无 kind' : 'No kind',
});

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
            kind: 'select' as const,
            id: EntityRoleControlId.Kind,
            label: copy.statusLocale === 'zh' ? '类型' : 'Kind',
            defaultValue: '',
            options: [
              noKindOption(copy.statusLocale),
              ...copy.kinds.map(kind => entityKindOptionOf(kind, copy.statusLocale)),
            ],
          },
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
      kind: '',
      status: '',
      color: 'currentColor',
      content: copy.content,
    },
    relatedApis: ['Entity.kind', 'Entity.status', 'Entity.color', 'Entity.children'],
  } satisfies PreviewControlContract;
};
