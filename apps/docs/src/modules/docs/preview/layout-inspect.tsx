import type { InspectionSelection } from '@retikz/inspect';
import { LayoutInspectLayout } from '@retikz/layout-react/inspect';
import { createLayoutInspectionVanillaDriver } from '@retikz/layout-vanilla/inspect';
import type { LayoutProps } from '@retikz/react';
import { createInputScene } from '@retikz/react';
import { renderToSvgString } from '@retikz/vanilla';
import type { ReactElement } from 'react';

import type { Lang } from '@/i18n';

import type {
  PreviewSourceConfig,
  PreviewControlsDefinition,
  PreviewControlValues,
  PreviewControlValuesFor,
} from '../components/component-preview';
import { defineControlledPreview } from '../components/component-preview/author';
import { RawSvgFrame } from '../components/component-preview/source-panel';
import { PreviewThemeDefinitionBundle } from '../components/component-preview/theme';
import { buildPreviewIR, formatIR, formatVanillaValue, irToVanillaCode } from '../components/component-preview/utils';
import { browserMeasurer } from '../components/component-preview/vanilla-preview';

/** 为布局示例的 Vanilla 与 IR 视图复用独立于 Source IR 的检查配置 */
export const createLayoutInspectPreviewSource = (
  render: (lang?: Lang) => ReactElement<LayoutProps>,
  selection: InspectionSelection,
): PreviewSourceConfig => ({
  canonicalRender: render,
  buildViews: ({ lang, theme }) => {
    const element = render(lang);
    const preview = buildPreviewIR(() => element, lang);
    const authoring = createInputScene(element.props.children);
    const svg = renderToSvgString(
      {
        ...(element.props.ir ?? authoring.scene),
        viewBox: element.props.viewBox ?? element.props.ir?.viewBox,
        ...(theme === undefined ? {} : { theme }),
      },
      {
        adapters: authoring.adapters,
        compile: {
          measureText: browserMeasurer,
          themeStyles: PreviewThemeDefinitionBundle.core,
          composites: element.props.extensions?.composites,
        },
        compileDriver: createLayoutInspectionVanillaDriver({ selection }),
      },
    );
    const selectionCode = formatVanillaValue(selection);
    const code = `import { renderToSvgString } from '@retikz/vanilla';
import { createLayoutInspectionVanillaDriver } from '@retikz/layout-vanilla/inspect';
${irToVanillaCode(preview.sourceIr, { theme })}
// Inspection is runtime configuration, separate from the scene data.
export const svg = renderToSvgString(input, {
  adapters,
  compileDriver: createLayoutInspectionVanillaDriver({ selection: ${selectionCode} }),
});


`;
    const renderSource = () => <RawSvgFrame svg={svg} />;
    return {
      vanilla: {
        files: [{ filename: 'layout.vanilla.ts', code, lang: 'ts' }],
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

/** 让布局 controls 在三种 API 视图中驱动同一场景与检查配置 */
export const defineControlledLayoutInspectPreview = <const TDefinition extends PreviewControlsDefinition>(
  contract: { controls: TDefinition; canonicalValues: Readonly<PreviewControlValues> },
  render: (values: PreviewControlValuesFor<TDefinition>) => ReactElement<LayoutProps>,
  selection: (values: PreviewControlValuesFor<TDefinition>) => InspectionSelection,
) => {
  const controlled = defineControlledPreview(contract, values => {
    const element = render(values);
    return <LayoutInspectLayout {...element.props} selection={selection(values)} />;
  });
  const source: PreviewSourceConfig = {
    buildViews: context => {
      const values = { ...contract.canonicalValues, ...context.values } as PreviewControlValuesFor<TDefinition>;
      return createLayoutInspectPreviewSource(() => render(values), selection(values)).buildViews!(context);
    },
  };
  return { Component: controlled.Component, source };
};
