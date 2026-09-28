import type { IRNodeLabel } from '@retikz/core';
import { Entity, Graph, Group, Relation } from '@retikz/graph-react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { defineControlledPreview, withGraphPreviewSource } from '@/modules/docs/preview';

import { GroupLabelControlId, groupLabelControls, createPreviewControlContract } from './group-label.controls';
import { groupLabelI18n } from './group-label.i18n';

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
    const defaultLabelPosition =
      defaultPositionValue === 'default' ? {} : { position: positionOf(defaultPositionValue) ?? 'bottom-left' };

    return (
      <Graph viewBox={{ x: -52, y: -63, width: 360, height: 190 }}>
        <Group
          id="boundary"
          labels={[
            { text: groupLabelI18n[lang].primary, position: primaryPosition },
            { text: groupLabelI18n[lang].secondary, position: secondaryPosition },
            { text: groupLabelI18n[lang].defaultLabel, ...defaultLabelPosition },
          ]}
        >
          <Entity id="input" role="resource" position={[90, 105]} style={{ textColor: 'currentColor' }}>
            {groupLabelI18n[lang].input}
          </Entity>
          <Entity id="output" role="resource" position={[270, 105]} style={{ textColor: 'currentColor' }}>
            {groupLabelI18n[lang].output}
          </Entity>
          <Relation role="flow" source={{ id: 'input' }} target={{ id: 'output' }} />
        </Group>
      </Graph>
    );
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
