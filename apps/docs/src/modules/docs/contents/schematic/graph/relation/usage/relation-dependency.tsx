import { Entity, Graph, Relation } from '@retikz/graph-react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { defineControlledPreview, withGraphPreviewSource } from '@/modules/docs/preview';

import { createPreviewControlContract, previewControlContract } from './relation-dependency.controls';
import { relationDependencyI18n } from './relation-dependency.i18n';
import { defineRelationSemanticProps, relationStatusOf } from './relation-role-controls';

export const previewControls = previewControlContract.controls;

const createPreview = (lang: Lang) =>
  defineControlledPreview(createPreviewControlContract(lang), values => {
    const kindValue = typeof values.kind === 'string' ? values.kind : '';
    const color = typeof values.color === 'string' ? values.color : 'currentColor';
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
        <Entity id="source" role="activity" position={[80, 90]}>
          {relationDependencyI18n[lang].source}
        </Entity>
        <Entity id="target" role="resource" position={[340, 90]}>
          {relationDependencyI18n[lang].target}
        </Entity>
        <Relation
          id="dependency-demo"
          role="dependency"
          status={relationStatusOf(values.status)}
          {...defineRelationSemanticProps(kindValue.length === 0 ? undefined : kindValue, undefined)}
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
export type RelationDependencyProps = { lang?: Lang };
/** 比较关系方向与外观 */
const RelationDependency: FC<RelationDependencyProps> = props => {
  const { lang = 'zh' } = props;
  const Preview = previews[lang].Component;
  return <Preview />;
};
export default RelationDependency;
