import { Entity, Graph, Group, Relation } from '@retikz/graph-react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { defineControlledPreview, withGraphPreviewSource } from '@/modules/docs/preview';

import { groupCaptionControls, createPreviewControlContract } from './group-basic.controls';
import { groupBasicI18n } from './group-basic.i18n';

export const previewControls = groupCaptionControls;

const createPreview = (lang: Lang) =>
  defineControlledPreview(createPreviewControlContract(lang), values => {
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
  });

const previews = { zh: createPreview('zh'), en: createPreview('en') };
export const previewSource = withGraphPreviewSource(previews.zh.source);
/** 分组示例语言 */
export type GroupBasicProps = { lang?: Lang };
/** 分组交互示例 */
const Demo: FC<GroupBasicProps> = props => {
  const { lang = 'zh' } = props;
  const Preview = previews[lang].Component;
  return <Preview />;
};
export default Demo;
