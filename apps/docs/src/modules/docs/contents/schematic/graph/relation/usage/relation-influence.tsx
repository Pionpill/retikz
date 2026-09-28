import { RelationDirection } from '@retikz/graph';
import { Entity, Graph, Relation } from '@retikz/graph-react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { defineControlledPreview, withGraphPreviewSource } from '@/modules/docs/preview';

import { createPreviewControlContract, previewControlContract } from './relation-influence.controls';
import { relationInfluenceI18n } from './relation-influence.i18n';
import { relationStatusOf } from './relation-role-controls';

export const previewControls = previewControlContract.controls;

const createPreview = (lang: Lang) =>
  defineControlledPreview(createPreviewControlContract(lang), values => {
    const directionValue = typeof values.direction === 'string' ? values.direction : 'forward';
    const color = typeof values.color === 'string' ? values.color : 'currentColor';
    const direction =
      directionValue === 'reverse'
        ? RelationDirection.Reverse
        : directionValue === 'both'
          ? RelationDirection.Both
          : RelationDirection.Forward;
    const relationDefaults =
      color === 'currentColor'
        ? {}
        : {
            style: { stroke: color },
            sourceMarker: { color, fill: color },
            targetMarker: { color, fill: color },
            labelTextForeground: color,
          };

    return (
      <Graph
        viewBox={{ x: 0, y: 0, width: 420, height: 180 }}
        {...(color === 'currentColor' ? {} : { graphDefaults: { relation: relationDefaults } })}
      >
        <Entity id="source" role="concept" position={[80, 90]}>
          {relationInfluenceI18n[lang].source}
        </Entity>
        <Entity id="target" role="state" position={[340, 90]}>
          {relationInfluenceI18n[lang].target}
        </Entity>
        <Relation
          id="influence-demo"
          role="influence"
          status={relationStatusOf(values.status)}
          direction={direction}
          source={{ id: 'source' }}
          target={{ id: 'target' }}
          way={['source', 'target']}
        />
      </Graph>
    );
  });

const previews = { zh: createPreview('zh'), en: createPreview('en') };
export const previewSource = withGraphPreviewSource(previews.zh.source);
/** 关系示例语言 */
export type RelationInfluenceProps = { lang?: Lang };
/** 比较关系方向与外观 */
const RelationInfluence: FC<RelationInfluenceProps> = props => {
  const { lang = 'zh' } = props;
  const Preview = previews[lang].Component;
  return <Preview />;
};
export default RelationInfluence;
