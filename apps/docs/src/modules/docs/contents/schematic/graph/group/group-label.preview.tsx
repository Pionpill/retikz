import type { IRNodeLabel } from '@retikz/core';
import { Entity, Graph, Group, Relation } from '@retikz/graph-react';

import type { Lang } from '@/i18n';

import { groupLabelI18n } from './group-label.i18n';

/** 分组标注的图形参数 */
export type GroupLabelPreviewValues = {
  primaryPosition: IRNodeLabel['position'];
  secondaryPosition: IRNodeLabel['position'];
  defaultPosition?: IRNodeLabel['position'];
};

/** 绘制分组标注示例 */
export const GroupLabelPreview = (values: GroupLabelPreviewValues, lang: Lang) => (
  <Graph viewBox={{ x: -52, y: -63, width: 360, height: 190 }}>
    <Group
      id="boundary"
      labels={[
        { text: groupLabelI18n[lang].primary, position: values.primaryPosition },
        { text: groupLabelI18n[lang].secondary, position: values.secondaryPosition },
        {
          text: groupLabelI18n[lang].defaultLabel,
          ...(values.defaultPosition === undefined ? {} : { position: values.defaultPosition }),
        },
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
