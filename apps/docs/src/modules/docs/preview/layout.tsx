import type { LayoutProps } from '@retikz/react';
import type { ReactElement } from 'react';

import type { Lang } from '@/i18n';

import type {
  PreviewSourceConfig,
  PreviewControlsDefinition,
  PreviewControlValues,
  PreviewControlValuesFor,
} from '../components/component-preview';
import { defineControlledPreview } from '../components/component-preview/author';
import { buildPreviewControlDefaults } from '../components/component-preview/controls';
import { RawSvgFrame } from '../components/component-preview/source-panel';
import { buildPreviewIR, formatIR } from '../components/component-preview/utils';
import { buildVanillaPreview } from '../components/component-preview/vanilla-preview';

/** 普通 Layout 示例由统一预览基础设施生成各入口源码 */
export const createLayoutPreviewSource = (render: (lang?: Lang) => ReactElement<LayoutProps>): PreviewSourceConfig => ({
  canonicalRender: render,
  buildViews: ({ lang, theme }) => {
    const preview = buildPreviewIR(() => render(lang), lang);
    const vanilla = buildVanillaPreview(preview, { theme });
    const renderSource = () => <RawSvgFrame svg={vanilla.svg ?? ''} />;
    return {
      vanilla: {
        files: [{ filename: 'layout.vanilla.ts', code: vanilla.code, lang: 'ts' }],
        rendererMode: 'svg',
        render: renderSource,
      },
      ir: {
        files: [{ filename: 'layout.ir.json', code: formatIR(preview.sourceIr), lang: 'json' }],
        rendererMode: 'svg',
        render: renderSource,
      },
    };
  },
});

/** 布局 controls 与各源码视图共享当前普通绘图输入 */
export const defineControlledLayoutPreview = <const TDefinition extends PreviewControlsDefinition>(
  contract: { controls: TDefinition; canonicalValues: Readonly<PreviewControlValues> },
  render: (values: PreviewControlValuesFor<TDefinition>) => ReactElement<LayoutProps>,
) => {
  const controlled = defineControlledPreview(contract, render);
  const source: PreviewSourceConfig = {
    ...controlled.source,
    buildViews: context => {
      const values = {
        ...buildPreviewControlDefaults(contract.controls),
        ...contract.canonicalValues,
        ...context.values,
      } as PreviewControlValuesFor<TDefinition>;
      return createLayoutPreviewSource(() => render(values)).buildViews!(context);
    },
  };
  return { Component: controlled.Component, source };
};
