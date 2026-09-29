import type { IRNodeLabel } from '@retikz/core';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { defineControlledPreview, withGraphPreviewSource } from '@/modules/docs/preview';

import { GroupLabelControlId, groupLabelControls, createPreviewControlContract } from './group-label.controls';
import { GroupLabelPreview } from './group-label.preview';

export const previewControls = groupLabelControls;

/** 将位置控件值转换为 Core label position */
const positionOf = (value: unknown): IRNodeLabel['position'] => {
  if (value === 'top-left') return 'top-left';
  if (value === 'top-right') return 'top-right';
  if (value === 'bottom-left') return 'bottom-left';
  if (value === 'bottom-right') return 'bottom-right';
  if (value === 'top') return 'top';
  if (value === 'bottom') return 'bottom';
  if (value === 'left') return 'left';
  if (value === 'right') return 'right';
  return undefined;
};

const createPreview = (lang: Lang) =>
  defineControlledPreview(createPreviewControlContract(lang), values => {
    const primaryPosition = positionOf(values[GroupLabelControlId.PrimaryPosition]) ?? 'top-left';
    const secondaryPosition = positionOf(values[GroupLabelControlId.SecondaryPosition]) ?? 'bottom-right';
    const defaultPositionValue = values[GroupLabelControlId.DefaultPosition];
    const defaultPosition =
      defaultPositionValue === 'default' ? undefined : (positionOf(defaultPositionValue) ?? 'bottom-left');

    return GroupLabelPreview({ primaryPosition, secondaryPosition, defaultPosition }, lang);
  });

const previews = { zh: createPreview('zh'), en: createPreview('en') };
export const previewSource = withGraphPreviewSource(previews.zh.source);
/** 分组示例语言 */
export type GroupLabelProps = { lang?: Lang };
/** 分组交互示例 */
const Demo: FC<GroupLabelProps> = props => {
  const { lang = 'zh' } = props;
  const Preview = previews[lang].Component;
  return <Preview />;
};
export default Demo;
