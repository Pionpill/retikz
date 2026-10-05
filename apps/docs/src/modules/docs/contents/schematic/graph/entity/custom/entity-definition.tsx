import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { defineControlledPreview, withGraphPreviewSource } from '@/modules/docs/preview';

import { createPreviewControlContract, previewControlContract } from './entity-definition.controls';
import { EntityDefinitionPreview } from './entity-definition.preview';

const createPreview = (lang: Lang) =>
  defineControlledPreview(createPreviewControlContract(lang), values =>
    EntityDefinitionPreview(
      {
        status: values.status,
        critical: values.critical,
      },
      lang,
    ),
  );

const previews = { zh: createPreview('zh'), en: createPreview('en') };

export const previewControls = previewControlContract.controls;

export const previewSource = withGraphPreviewSource(previews.zh.source);

/** 自定义实体示例的语言 */
export type EntityDefinitionProps = { lang?: Lang };

/** 通过 predicate 输入驱动固定的主题规则 */
const EntityDefinition: FC<EntityDefinitionProps> = props => {
  const { lang = 'zh' } = props;
  const Preview = previews[lang].Component;
  return <Preview />;
};
export default EntityDefinition;
