import { Entity, Graph, Group, Relation } from '@retikz/graph-react';

import type { Lang } from '@/i18n';

import { groupBasicI18n } from './group-basic.i18n';

/** 图形参数 */
export type GroupBasicPreviewValues = {
  side: 'top' | 'bottom';
  direction: 'horizontal' | 'vertical';
  itemGap: number;
  bodyGap: number;
};

/** 绘制示例图形 */
export const GroupBasicPreview = (values: GroupBasicPreviewValues, lang: Lang) => {
  const side = values.side === 'bottom' ? 'bottom' : 'top';
  const direction = values.direction === 'vertical' ? 'vertical' : 'horizontal';
  const itemGap = typeof values.itemGap === 'number' ? values.itemGap : 4;
  const bodyGap = typeof values.bodyGap === 'number' ? values.bodyGap : 4;

  return (
    <Graph viewBox={{ x: -50, y: -36.6, width: 320, height: 150 }}>
      <Group
        id="runtime"
        caption={{
          side,
          direction,
          itemGap,
          bodyGap,
          title: { text: groupBasicI18n[lang].title },
          description: { text: groupBasicI18n[lang].description },
        }}
      >
        <Entity id="compiler" role="activity" position={[90, 110]} style={{ textColor: 'currentColor' }}>
          {groupBasicI18n[lang].compiler}
        </Entity>
        <Entity id="renderer" role="participant" position={[230, 110]} style={{ textColor: 'currentColor' }}>
          {groupBasicI18n[lang].renderer}
        </Entity>
        <Relation role="flow" source={{ id: 'compiler' }} target={{ id: 'renderer' }} />
      </Group>
    </Graph>
  );
};
