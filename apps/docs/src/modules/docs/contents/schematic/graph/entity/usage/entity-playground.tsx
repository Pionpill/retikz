import type { GraphStatusValue } from '@retikz/graph';
import { Entity, Graph } from '@retikz/graph-react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { defineControlledPreview, withGraphPreviewSource } from '@/modules/docs/preview';

import { createPreviewControlContract, previewControlContract } from './entity-playground.controls';
import { entityPlaygroundI18n } from './entity-playground.i18n';

const statusValues: Readonly<Record<string, GraphStatusValue | undefined>> = {
  '': undefined,
  error: 'error',
  success: 'success',
  warning: 'warning',
  disabled: 'disabled',
};
const createPreview = (lang: Lang) =>
  defineControlledPreview(createPreviewControlContract(lang), values => (
    <Graph viewBox={{ x: 0, y: 0, width: 360, height: 180 }}>
      <Entity
        role={values.role}
        status={statusValues[values.status]}
        group={values.group ? 'orders' : undefined}
        position={[180, 90]}
        style={values.override ? { color: values.color } : undefined}
      >
        {entityPlaygroundI18n[lang].defaultText}
      </Entity>
    </Graph>
  ));
const previews = { zh: createPreview('zh'), en: createPreview('en') };
export const previewControls = previewControlContract.controls;
export const previewSource = withGraphPreviewSource(previews.zh.source);
/** 实体试验场的语言 */
export type EntityPlaygroundProps = { lang?: Lang };
/** 固定位置比较角色、状态、分组色与显式外观 */
const EntityPlayground: FC<EntityPlaygroundProps> = props => {
  const { lang = 'zh' } = props;
  const Preview = previews[lang].Component;
  return <Preview />;
};
export default EntityPlayground;
