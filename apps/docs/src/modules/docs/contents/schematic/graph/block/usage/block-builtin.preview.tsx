import { Block, BlockHeader, BlockRow, BlockSection, Graph } from '@retikz/graph-react';

import type { Lang } from '@/i18n';

import { blockBuiltinI18n } from './block-builtin.i18n';

/** 图形参数 */
export type BlockBuiltinPreviewValues = {
  showSecondSection: boolean;
  showExtraRow: boolean;
  blockGap: number;
  headerDirection: 'vertical' | 'horizontal';
  sectionGap: number;
  rowItemCount: '1' | '2' | '3';
  rowGap: number;
};

/** 使用给定 controls 值渲染 Block 内置组件预览 */
export const BlockBuiltinPreview = (values: BlockBuiltinPreviewValues, lang: Lang = 'zh') => {
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
