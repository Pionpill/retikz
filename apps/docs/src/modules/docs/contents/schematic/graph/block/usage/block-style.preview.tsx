import { Block, BlockHeader, BlockRow, BlockSection, Graph } from '@retikz/graph-react';

import type { Lang } from '@/i18n';

import { blockStyleI18n } from './block-style.i18n';

/** 图形参数 */
export type BlockStylePreviewValues = {
  backgroundOpacity: number;
  borderWidth: number;
  cornerRadius: number;
  padding: number;
  headerTitleTextColor: string;
  headerTitleFontSize: 'sm' | 'xs' | 'base' | 'lg';
  headerTitleFontWeight: 'bold' | 'normal';
  headerTitleFontStyle: 'normal' | 'italic';
  headerTitleOpacity: number;
  headerDescriptionTextColor: string;
  headerDescriptionFontSize: 'sm' | 'xs' | 'base' | 'lg';
  headerDescriptionFontWeight: 'bold' | 'normal';
  headerDescriptionFontStyle: 'normal' | 'italic';
  headerDescriptionOpacity: number;
  rowContentTextColor: string;
  rowContentFontSize: 'sm' | 'xs' | 'base' | 'lg';
  rowContentFontWeight: 'bold' | 'normal';
  rowContentFontStyle: 'normal' | 'italic';
  rowContentOpacity: number;
};

/** 使用给定 controls 值渲染 Block 样式预览 */
export const BlockStylePreview = (values: BlockStylePreviewValues, lang: Lang = 'zh') => {
  const backgroundOpacity = typeof values.backgroundOpacity === 'number' ? values.backgroundOpacity : 0.04;
  const borderWidth = typeof values.borderWidth === 'number' ? values.borderWidth : 1;
  const cornerRadius = typeof values.cornerRadius === 'number' ? values.cornerRadius : 8;
  const padding = typeof values.padding === 'number' ? values.padding : 8;

  const headerTitleTextColor =
    typeof values.headerTitleTextColor === 'string' ? values.headerTitleTextColor : 'currentColor';
  const headerTitleFontSize =
    values.headerTitleFontSize === 'xs' || values.headerTitleFontSize === 'sm' || values.headerTitleFontSize === 'lg'
      ? values.headerTitleFontSize
      : 'base';
  const headerTitleFontWeight = values.headerTitleFontWeight === 'normal' ? 'normal' : 'bold';
  const headerTitleFontStyle = values.headerTitleFontStyle === 'italic' ? 'italic' : 'normal';
  const headerTitleOpacity = typeof values.headerTitleOpacity === 'number' ? values.headerTitleOpacity : 1;

  const headerDescriptionTextColor =
    typeof values.headerDescriptionTextColor === 'string' ? values.headerDescriptionTextColor : 'currentColor';
  const headerDescriptionFontSize =
    values.headerDescriptionFontSize === 'sm' ||
    values.headerDescriptionFontSize === 'base' ||
    values.headerDescriptionFontSize === 'lg'
      ? values.headerDescriptionFontSize
      : 'xs';
  const headerDescriptionFontWeight = values.headerDescriptionFontWeight === 'bold' ? 'bold' : 'normal';
  const headerDescriptionFontStyle = values.headerDescriptionFontStyle === 'italic' ? 'italic' : 'normal';
  const headerDescriptionOpacity =
    typeof values.headerDescriptionOpacity === 'number' ? values.headerDescriptionOpacity : 0.7;

  const rowContentTextColor = typeof values.rowContentTextColor === 'string' ? values.rowContentTextColor : '#64748b';
  const rowContentFontSize =
    values.rowContentFontSize === 'xs' || values.rowContentFontSize === 'base' || values.rowContentFontSize === 'lg'
      ? values.rowContentFontSize
      : 'sm';
  const rowContentFontWeight = values.rowContentFontWeight === 'bold' ? 'bold' : 'normal';
  const rowContentFontStyle = values.rowContentFontStyle === 'normal' ? 'normal' : 'italic';
  const rowContentOpacity = typeof values.rowContentOpacity === 'number' ? values.rowContentOpacity : 0.8;

  return (
    <Graph viewBox={{ x: -90, y: padding - 68, width: 420, height: 230 }}>
      <Block
        padding={padding}
        cornerRadius={cornerRadius}
        background={{ fill: '#64748b', fillOpacity: backgroundOpacity }}
        border={{ stroke: '#64748b', strokeOpacity: 0.5, strokeWidth: borderWidth }}
      >
        <BlockHeader
          title={{
            text: 'UserRepository',
            textColor: headerTitleTextColor,
            font: {
              size: headerTitleFontSize,
              weight: headerTitleFontWeight,
              style: headerTitleFontStyle,
            },
            opacity: headerTitleOpacity,
          }}
          description={{
            text: blockStyleI18n[lang].description,
            textColor: headerDescriptionTextColor,
            font: {
              size: headerDescriptionFontSize,
              weight: headerDescriptionFontWeight,
              style: headerDescriptionFontStyle,
            },
            opacity: headerDescriptionOpacity,
          }}
        />
        <BlockSection title={blockStyleI18n[lang].methods}>
          <BlockRow
            content={{
              text: 'findById(id)',
              textColor: rowContentTextColor,
              font: {
                size: rowContentFontSize,
                weight: rowContentFontWeight,
                style: rowContentFontStyle,
              },
              opacity: rowContentOpacity,
            }}
          />
        </BlockSection>
      </Block>
    </Graph>
  );
};
