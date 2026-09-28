import { Entity, Graph, Relation } from '@retikz/graph-react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { defineControlledPreview, withGraphPreviewSource } from '@/modules/docs/preview';

import { relationStatusOf } from './relation-role-controls';
import { createPreviewControlContract, previewControlContract } from './relation-style.controls';

export const previewControls = previewControlContract.controls;

const createPreview = (lang: Lang) =>
  defineControlledPreview(createPreviewControlContract(lang), values => {
    const role = typeof values.role === 'string' ? values.role : 'flow';
    const content = typeof values.content === 'string' ? values.content : 'Next step';
    const sourceColor = typeof values.sourceColor === 'string' ? values.sourceColor : 'currentColor';
    const targetColor = typeof values.targetColor === 'string' ? values.targetColor : 'currentColor';
    const stroke = typeof values.stroke === 'string' ? values.stroke : '#2563eb';
    const strokeWidth = typeof values.strokeWidth === 'number' ? values.strokeWidth : 2;
    const opacity = typeof values.opacity === 'number' ? values.opacity : 1;
    const labelTextColor = typeof values.labelTextColor === 'string' ? values.labelTextColor : '#334155';
    const labelOpacity = typeof values.labelOpacity === 'number' ? values.labelOpacity : 1;

    return (
      <Graph viewBox={{ x: 0, y: 0, width: 460, height: 220 }}>
        <Entity
          id="source"
          role="participant"
          position={[90, 110]}
          {...(sourceColor === 'currentColor'
            ? {}
            : {
                style: { color: sourceColor },
              })}
        >
          Source
        </Entity>
        <Entity
          id="target"
          role="resource"
          position={[370, 110]}
          {...(targetColor === 'currentColor'
            ? {}
            : {
                style: { color: targetColor },
              })}
        >
          Target
        </Entity>
        <Relation
          id="relation-style"
          role={role}
          status={relationStatusOf(values.status)}
          source={{ id: 'source' }}
          target={{ id: 'target' }}
          sourceMarker={{ color: stroke, fill: stroke }}
          targetMarker={{ color: stroke, fill: stroke }}
          labelTextForeground={labelTextColor}
          labelOpacity={labelOpacity}
          labels={[{ text: content, position: 0.5 }]}
          way={['source', 'target']}
          style={{
            stroke,
            strokeWidth,
            opacity,
            ...(values.dashed === true ? { dashPattern: [6, 4] } : {}),
          }}
        />
      </Graph>
    );
  });

const previews = { zh: createPreview('zh'), en: createPreview('en') };
export const previewSource = withGraphPreviewSource(previews.zh.source);
/** 关系样式示例语言 */
export type RelationStyleProps = { lang?: Lang };
/** 分别调整节点、路径与标签外观 */
const RelationStyle: FC<RelationStyleProps> = props => {
  const { lang = 'zh' } = props;
  const Preview = previews[lang].Component;
  return <Preview />;
};
export default RelationStyle;
