import type { IRScene } from '@retikz/core';
import type { InspectionRequest, InspectorRegistry } from '@retikz/inspect';
import { createDefaultInspectorRegistry } from '@retikz/inspect';
import { prepareInspectionPresentation, renderInspectionToSvgString } from '@retikz/inspect/vanilla';
import type { LayoutProps } from '@retikz/react';
import { createInputScene } from '@retikz/react';
import { toSceneResult, renderToSvgString } from '@retikz/vanilla';
import type { FC, ReactNode } from 'react';
import { isValidElement } from 'react';

import type { Lang } from '@/i18n';
import { synchronousInputAdaptersOf } from '@/modules/docs/lib';

import type {
  PreviewControlsDefinition,
  PreviewControlValues,
  PreviewControlValuesFor,
  PreviewSourceConfig,
} from '../components/component-preview';
import { usePreviewControls } from '../components/component-preview/context';
import { buildPreviewControlDefaults } from '../components/component-preview/controls';
import { RawSvgFrame } from '../components/component-preview/source-panel';
import { PreviewThemeDefinitionBundle } from '../components/component-preview/theme';
import { browserMeasurer } from '../components/component-preview/vanilla-preview';

/** 文档示例显式提供普通绘图输入与独立检查请求 */
export type InspectionResultPreviewProps = Pick<LayoutProps, 'children' | 'ir' | 'viewBox' | 'extensions'> & {
  registry?: InspectorRegistry;
  requests: ReadonlyArray<InspectionRequest>;
};

/** 先完成普通绘图，再独立生成辅助层 */
export const buildInspectionPreview = (
  props: InspectionResultPreviewProps,
  idPrefix: string,
  theme?: IRScene['theme'],
) => {
  const authored = createInputScene(props.children);
  const input = {
    ...(props.ir ?? authored.scene),
    viewBox: props.viewBox ?? props.ir?.viewBox,
    ...(theme === undefined ? {} : { theme }),
  };
  const compile = {
    ...props.extensions,
    themeDefinitions: PreviewThemeDefinitionBundle.core,
    measureText: browserMeasurer,
  };
  const output = toSceneResult(input, { adapters: synchronousInputAdaptersOf(authored.adapters), compile });
  const result = output.compileResult ?? { scene: output.scene, artifacts: [] };
  const options = {
    registry: props.registry ?? createDefaultInspectorRegistry(),
    requests: props.requests,
    compileOptions: compile,
    idPrefix: idPrefix + '-inspection',
  };
  const primary = renderToSvgString(result.scene, {
    output: { idPrefix: idPrefix + '-primary' },
    animation: { enabled: false },
  });
  const presentation = prepareInspectionPresentation(result, options);
  const auxiliary = renderInspectionToSvgString(presentation, options);
  return { primary, auxiliary, input };
};

/** 以结果消费为例生成文档源码视图 */
export const createBuiltinInspectPreviewSource = (
  Component: FC<{ lang?: Lang; values?: Readonly<PreviewControlValues> }>,
  name: string,
): PreviewSourceConfig => ({
  deriveIR: false,
  buildViews: ({ lang, values, theme }) => {
    const element = Component({ lang, values });
    if (!isValidElement<InspectionResultPreviewProps>(element)) throw new Error('Expected a result inspection preview');
    const output = buildInspectionPreview(element.props, name, theme);
    const config = JSON.stringify({ input: output.input, requests: element.props.requests }, null, 2);
    const render = () => (
      <div style={{ position: 'relative' }}>
        <RawSvgFrame svg={output.primary} />
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <RawSvgFrame svg={output.auxiliary} />
        </div>
      </div>
    );
    const code = `import { toSceneResult, renderToSvgString } from '@retikz/vanilla';
import type { InputScene } from '@retikz/vanilla';
import { createDefaultInspectorRegistry } from '@retikz/inspect';
import type { InspectionRequest } from '@retikz/inspect';
import { prepareInspectionPresentation, renderInspectionToSvgString } from '@retikz/inspect/vanilla';
import { pathClipDefinition } from '@retikz/extension';
import { PreviewThemeDefinitionBundle } from '@/modules/docs/components/component-preview/theme';
import { browserMeasurer } from '@/modules/docs/components/component-preview/vanilla-preview';

const input: InputScene = ${JSON.stringify(output.input, null, 2)};
const requests: ReadonlyArray<InspectionRequest> = ${JSON.stringify(element.props.requests, null, 2)};
const compile = { clips: [pathClipDefinition], themeDefinitions: PreviewThemeDefinitionBundle.core, measureText: browserMeasurer };
const primary = toSceneResult(input, { compile });
const result = primary.compileResult ?? { scene: primary.scene, artifacts: [] };
const options = { registry: createDefaultInspectorRegistry(), requests, compileOptions: compile, idPrefix: '${name}-inspection' };
const auxiliary = prepareInspectionPresentation(result, options);
export const primarySvg = renderToSvgString(result.scene, { output: { idPrefix: '${name}-primary' }, animation: { enabled: false } });
export const overlay = renderInspectionToSvgString(auxiliary, options);
// 将 primarySvg 和 overlay 放入两个使用相同视口的独立容器`;
    const configFile = { filename: name + '.config.json', code: config, lang: 'json' as const };
    return {
      vanilla: {
        files: [{ filename: name + '.vanilla.ts', code, lang: 'ts' }, configFile],
        rendererMode: 'svg',
        render,
      },
      config: { files: [configFile], rendererMode: 'svg', render },
    };
  },
});

/** controls 与各源码视图共用同一当前输入 */
export const defineControlledBuiltinInspectPreview = <const TDefinition extends PreviewControlsDefinition>(
  contractFor: (lang: Lang) => { controls: TDefinition; canonicalValues: Readonly<PreviewControlValues> },
  render: (values: PreviewControlValuesFor<TDefinition>, lang: Lang) => ReactNode,
  name: string,
): { Component: FC<{ lang?: Lang }>; source: PreviewSourceConfig } => {
  const Component: FC<{ lang?: Lang }> = props => {
    const lang = props.lang ?? 'zh';
    return render(usePreviewControls(contractFor(lang).controls), lang);
  };
  const sourceRender: FC<{ lang?: Lang; values?: Readonly<PreviewControlValues> }> = props => {
    const lang = props.lang ?? 'zh';
    const contract = contractFor(lang);
    return render(
      {
        ...buildPreviewControlDefaults(contract.controls),
        ...contract.canonicalValues,
        ...props.values,
      } as PreviewControlValuesFor<TDefinition>,
      lang,
    );
  };
  return {
    Component,
    source: {
      ...createBuiltinInspectPreviewSource(sourceRender, name),
      canonicalRender: lang => sourceRender({ lang }),
    },
  };
};
