import type { FC } from 'react';

import { Block, BlockCell, BlockHeader, BlockRow, BlockSection, Graph } from '@retikz/graph-react';
import { Node } from '@retikz/react';

import { defineControlledPreview, withGraphPreviewSource } from '@/modules/docs/preview';

import { blockBasicControls, previewControlContract } from './block-basic.controls';

export const previewControls = blockBasicControls;

const HEADER_ACCENT = '#f97316';

const CellText: FC<{ children: string }> = ({ children }) => (
  <Node position={[0, 0]} padding={0} fill="none" stroke="none">
    {children}
  </Node>
);

const HeaderIcon: FC = () => (
  <Node
    position={[0, 0]}
    shape="circle"
    minimumSize={24}
    padding={4}
    fill={HEADER_ACCENT}
    fillOpacity={0.1}
    stroke="none"
    textColor={HEADER_ACCENT}
  >
    B
  </Node>
);

const HeaderTrailing: FC = () => (
  <Node
    position={[0, 0]}
    padding={{ x: 6, y: 2 }}
    fill={HEADER_ACCENT}
    fillOpacity={0.1}
    stroke="none"
    textColor={HEADER_ACCENT}
    font={{ size: 'sm' }}
    cornerRadius={4}
  >
    public
  </Node>
);

const headerJustifyContentValues = ['start', 'center', 'end', 'space-between', 'space-around', 'space-evenly'] as const;

const isHeaderJustifyContent = (value: unknown): value is (typeof headerJustifyContentValues)[number] =>
  headerJustifyContentValues.some(candidate => candidate === value);

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const showIcon = typeof values.showIcon === 'boolean' ? values.showIcon : true;
  const showTrailing = typeof values.showTrailing === 'boolean' ? values.showTrailing : true;
  const direction = values.headerDirection === 'horizontal' ? 'horizontal' : 'vertical';
  const itemGap = typeof values.headerItemGap === 'number' ? values.headerItemGap : 4;
  const justifyContent = isHeaderJustifyContent(values.headerJustifyContent) ? values.headerJustifyContent : 'start';
  const showExtraField = typeof values.showExtraField === 'boolean' ? values.showExtraField : true;
  const fieldName = typeof values.fieldName === 'string' ? values.fieldName : 'email';
  const fieldType = typeof values.fieldType === 'string' ? values.fieldType : 'string?';

  return (
    <Graph width={400} height={280} viewBox={{ x: -110, y: -60, width: 460, height: 300 }}>
      <Block id="user" width={240}>
        <BlockHeader
          icon={showIcon ? <HeaderIcon /> : undefined}
          title={{ text: 'User' }}
          description={{ text: '领域实体' }}
          {...(direction === 'vertical' ? {} : { direction })}
          {...(itemGap === 4 ? {} : { itemGap })}
          {...(justifyContent === 'start' ? {} : { justifyContent })}
          trailing={showTrailing ? <HeaderTrailing /> : undefined}
        />
        <BlockSection id="user.fields" title={{ text: '字段' }}>
          <BlockRow id="user.name">
            <BlockCell itemKey="name">
              <CellText>name</CellText>
            </BlockCell>
            <BlockCell itemKey="name-type">
              <CellText>string</CellText>
            </BlockCell>
          </BlockRow>
          {showExtraField ? (
            <BlockRow id="user.email">
              <BlockCell itemKey="email">
                <CellText>{fieldName}</CellText>
              </BlockCell>
              <BlockCell itemKey="email-type">
                <CellText>{fieldType}</CellText>
              </BlockCell>
            </BlockRow>
          ) : null}
        </BlockSection>
      </Block>
    </Graph>
  );
});

export const previewSource = withGraphPreviewSource(controlledPreview.source);

/** Block 基础结构 controls demo */
const Demo: FC = controlledPreview.Component;

export default Demo;
