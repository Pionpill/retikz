import { Entity, Graph, Group, Relation } from '@retikz/graph-react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { defineControlledPreview, withGraphPreviewSource } from '@/modules/docs/preview';

import { groupStyleControls, createPreviewControlContract } from './group-style.controls';
import { groupStyleI18n } from './group-style.i18n';

export const previewControls = groupStyleControls;

const createPreview = (lang: Lang) =>
  defineControlledPreview(createPreviewControlContract(lang), values => {
    const backgroundColor = typeof values.backgroundColor === 'string' ? values.backgroundColor : '#e2e8f0';
    const backgroundOpacity = typeof values.backgroundOpacity === 'number' ? values.backgroundOpacity : 0.08;
    const borderColor = typeof values.borderColor === 'string' ? values.borderColor : '#64748b';
    const borderWidth = typeof values.borderWidth === 'number' ? values.borderWidth : 1;
    const borderOpacity = typeof values.borderOpacity === 'number' ? values.borderOpacity : 1;
    const cornerRadius = typeof values.cornerRadius === 'number' ? values.cornerRadius : 4;
    const padding = typeof values.padding === 'number' ? values.padding : 10;
    const borderLineStyle =
      values.borderLineStyle === 'dotted'
        ? { dashPattern: [1, 4], lineCap: 'round' as const }
        : values.borderLineStyle === 'dashed'
          ? { dashPattern: [6, 4] }
          : {};

    return (
      <Graph viewBox={{ x: -90, y: -71.6, width: 440, height: 220 }}>
        <Group
          id="group-style"
          padding={padding}
          cornerRadius={cornerRadius}
          background={{ fill: backgroundColor, fillOpacity: backgroundOpacity }}
          border={{ stroke: borderColor, strokeWidth: borderWidth, strokeOpacity: borderOpacity, ...borderLineStyle }}
          caption={{
            title: { text: groupStyleI18n[lang].title },
            description: { text: groupStyleI18n[lang].description },
          }}
        >
          <Entity id="compiler" role="activity" position={[130, 145]} style={{ textColor: 'currentColor' }}>
            {groupStyleI18n[lang].compiler}
          </Entity>
          <Entity id="renderer" role="participant" position={[310, 145]} style={{ textColor: 'currentColor' }}>
            {groupStyleI18n[lang].renderer}
          </Entity>
          <Relation role="flow" source={{ id: 'compiler' }} target={{ id: 'renderer' }} />
        </Group>
      </Graph>
    );
  });

const previews = { zh: createPreview('zh'), en: createPreview('en') };
export const previewSource = withGraphPreviewSource(previews.zh.source);
/** 分组示例语言 */
export type GroupStyleProps = { lang?: Lang };
/** 分组交互示例 */
const Demo: FC<GroupStyleProps> = props => {
  const { lang = 'zh' } = props;
  const Preview = previews[lang].Component;
  return <Preview />;
};
export default Demo;
