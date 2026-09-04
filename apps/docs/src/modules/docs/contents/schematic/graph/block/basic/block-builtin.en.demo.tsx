import type { FC } from 'react';

import { Block, BlockHeader, BlockRow, BlockSection, Graph } from '@retikz/graph-react';

import type { PreviewControlValuesFor } from '@/modules/docs/preview';

import { defineControlledPreview, withGraphPreviewSource } from '@/modules/docs/preview';

import { blockBuiltinControls, previewControlContract } from './block-builtin.en.controls';

export const previewControls = blockBuiltinControls;

/** Renders the built-in Block preview with the supplied control values */
export const BlockBuiltinPreview = (values: PreviewControlValuesFor<typeof blockBuiltinControls>) => {
  const showSecondSection = typeof values.showSecondSection === 'boolean' ? values.showSecondSection : false;
  const showExtraRow = typeof values.showExtraRow === 'boolean' ? values.showExtraRow : false;
  const blockGap = typeof values.blockGap === 'number' ? values.blockGap : 8;
  const headerDirection = values.headerDirection === 'horizontal' ? 'horizontal' : 'vertical';
  const sectionGap = typeof values.sectionGap === 'number' ? values.sectionGap : 4;
  const rowItemCount = values.rowItemCount === '1' || values.rowItemCount === '3' ? values.rowItemCount : '2';
  const rowGap = typeof values.rowGap === 'number' ? values.rowGap : 8;
  const primaryContent =
    rowItemCount === '1' ? ['name'] : rowItemCount === '3' ? ['name', 'string', 'required'] : ['name', 'string'];
  const extraContent =
    rowItemCount === '1' ? ['email'] : rowItemCount === '3' ? ['email', 'string', 'optional'] : ['email', 'string'];

  return (
    <Graph width={260} height="auto">
      <Block id="user" {...(blockGap === 8 ? {} : { gap: blockGap })}>
        <BlockHeader
          title="User"
          description="Domain entity"
          {...(headerDirection === 'vertical' ? {} : { direction: headerDirection })}
        />
        <BlockSection title="Fields" {...(sectionGap === 4 ? {} : { gap: sectionGap })}>
          <BlockRow content={primaryContent} {...(rowGap === 8 ? {} : { gap: rowGap })} />
          {showExtraRow ? <BlockRow content={extraContent} {...(rowGap === 8 ? {} : { gap: rowGap })} /> : null}
        </BlockSection>
        {showSecondSection ? (
          <BlockSection title="Methods" {...(sectionGap === 4 ? {} : { gap: sectionGap })}>
            <BlockRow content={['findById(id)', 'User']} {...(rowGap === 8 ? {} : { gap: rowGap })} />
          </BlockSection>
        ) : null}
      </Block>
    </Graph>
  );
};

const controlledPreview = defineControlledPreview(previewControlContract, BlockBuiltinPreview);

export const previewSource = withGraphPreviewSource(controlledPreview.source);

/** Built-in Block components controls demo */
const Demo: FC = controlledPreview.Component;

export default Demo;
