import { Block, BlockHeader, BlockRow, BlockSection, Graph } from '@retikz/graph-react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import type { PreviewControlValuesFor } from '@/modules/docs/preview';
import { defineControlledPreview, withGraphPreviewSource } from '@/modules/docs/preview';

import { blockBuiltinControls, createPreviewControlContract } from './block-builtin.controls';
import { blockBuiltinI18n } from './block-builtin.i18n';

export const previewControls = blockBuiltinControls;

/** 使用给定 controls 值渲染 Block 内置组件预览 */
export const BlockBuiltinPreview = (
  values: PreviewControlValuesFor<typeof blockBuiltinControls>,
  lang: Lang = 'zh',
) => {
  const showSecondSection = typeof values.showSecondSection === 'boolean' ? values.showSecondSection : false;
  const showExtraRow = typeof values.showExtraRow === 'boolean' ? values.showExtraRow : false;
  const blockGap = typeof values.blockGap === 'number' ? values.blockGap : 8;
  const headerDirection = values.headerDirection === 'horizontal' ? 'horizontal' : 'vertical';
  const sectionGap = typeof values.sectionGap === 'number' ? values.sectionGap : 4;
  const rowItemCount = values.rowItemCount === '1' || values.rowItemCount === '3' ? values.rowItemCount : '2';
  const rowGap = typeof values.rowGap === 'number' ? values.rowGap : 8;
  const primaryContent =
    rowItemCount === '1'
      ? ['name']
      : rowItemCount === '3'
        ? ['name', 'string', blockBuiltinI18n[lang].required]
        : ['name', 'string'];
  const extraContent =
    rowItemCount === '1'
      ? ['email']
      : rowItemCount === '3'
        ? ['email', 'string', blockBuiltinI18n[lang].optional]
        : ['email', 'string'];

  return (
    <Graph>
      <Block id="user" {...(blockGap === 8 ? {} : { gap: blockGap })}>
        <BlockHeader
          title="User"
          description={blockBuiltinI18n[lang].description}
          {...(headerDirection === 'vertical' ? {} : { direction: headerDirection })}
        />
        <BlockSection title={blockBuiltinI18n[lang].fields} {...(sectionGap === 4 ? {} : { gap: sectionGap })}>
          <BlockRow content={primaryContent} {...(rowGap === 8 ? {} : { gap: rowGap })} />
          {showExtraRow ? <BlockRow content={extraContent} {...(rowGap === 8 ? {} : { gap: rowGap })} /> : null}
        </BlockSection>
        {showSecondSection ? (
          <BlockSection title={blockBuiltinI18n[lang].methods} {...(sectionGap === 4 ? {} : { gap: sectionGap })}>
            <BlockRow content={['findById(id)', 'User']} {...(rowGap === 8 ? {} : { gap: rowGap })} />
          </BlockSection>
        ) : null}
      </Block>
    </Graph>
  );
};

const createPreview = (lang: Lang) =>
  defineControlledPreview(createPreviewControlContract(lang), values => BlockBuiltinPreview(values, lang));
const previews = { zh: createPreview('zh'), en: createPreview('en') };
export const previewSource = withGraphPreviewSource(previews.zh.source);
/** 示例语言 */
export type BlockBuiltinProps = { lang?: Lang };
/** 结构块交互示例 */
const Demo: FC<BlockBuiltinProps> = props => {
  const { lang = 'zh' } = props;
  const Preview = previews[lang].Component;
  return <Preview />;
};
export default Demo;
