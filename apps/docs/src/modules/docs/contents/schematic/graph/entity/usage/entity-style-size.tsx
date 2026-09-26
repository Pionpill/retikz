import { Entity, Graph } from '@retikz/graph-react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { defineControlledPreview, withGraphPreviewSource } from '@/modules/docs/preview';

import { createPreviewControlContract, previewControlContract } from './entity-style-size.controls';
import { entityStyleSizeI18n } from './entity-style-size.i18n';

const createPreview = (lang: Lang) =>
  defineControlledPreview(createPreviewControlContract(lang), values => (
    <Graph viewBox={{ x: 0, y: 0, width: 440, height: 200 }}>
      <Entity
        role="activity"
        position={[220, 100]}
        style={{ color: values.color, fill: values.fill, strokeWidth: values.strokeWidth }}
        layout={{
          maxTextWidth: values.maxTextWidth,
          lineHeight: values.lineHeight,
          minimumSize: { width: values.minimumWidth },
        }}
      >
        {entityStyleSizeI18n[lang].text}
      </Entity>
    </Graph>
  ));

const previews = { zh: createPreview('zh'), en: createPreview('en') };
export const previewControls = previewControlContract.controls;
export const previewSource = withGraphPreviewSource(previews.zh.source);

/** 样式与尺寸试验场的语言 */
export type EntityStyleSizeProps = { lang?: Lang };

/** 调整实体外观、文字排布与最小宽度 */
const EntityStyleSize: FC<EntityStyleSizeProps> = props => {
  const { lang = 'zh' } = props;
  const Preview = previews[lang].Component;
  return <Preview />;
};

export default EntityStyleSize;
