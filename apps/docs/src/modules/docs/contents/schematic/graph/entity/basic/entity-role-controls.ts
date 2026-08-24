import type { EntityProps } from '@retikz/graph-react';

import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** Entity role demo 共用的稳定字段 id */
export const EntityRoleControlId = {
  Color: 'color',
  Content: 'content',
} as const;

/** 只在用户选择具体颜色时写入单个 Entity 的精确 appearance */
export const defineEntityAppearanceProps = (color: string): Pick<EntityProps, 'color' | 'stroke'> =>
  color === 'currentColor' ? {} : { color, stroke: color };

type EntityRoleControlCopy = Readonly<{
  title: string;
  sectionLabel: string;
  colorLabel: string;
  contentLabel: string;
  contentPlaceholder: string;
  content: string;
}>;

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
      color: 'currentColor',
      content: copy.content,
    },
    relatedApis: ['Entity.color', 'Entity.children'],
  } satisfies PreviewControlContract;
};
