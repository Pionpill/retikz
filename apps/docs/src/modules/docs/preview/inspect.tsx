import type { InspectionSelection } from '@retikz/inspect';
import type { InspectLayoutProps } from '@retikz/inspect/react';
import { InspectLayout } from '@retikz/inspect/react';
import { createInspectionVanillaAuthoring, createInspectionVanillaDriver } from '@retikz/inspect/vanilla';
import { createInputScene } from '@retikz/react';
import type { InputScene } from '@retikz/vanilla';
import { renderToSvgString } from '@retikz/vanilla';
import type { FC, ReactNode } from 'react';
import { isValidElement } from 'react';

import type { Lang } from '@/i18n';

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

/** 从内置 Inspect demo 的同一 JSX 派生 Vanilla 输入及可重放的运行时配置 */
export const createBuiltinInspectPreviewSource = (
  Component: FC<{ lang?: Lang; values?: Readonly<PreviewControlValues> }>,
  name: string,
): PreviewSourceConfig => ({
  deriveIR: false,
  buildViews: ({ lang, theme, values }) => {
    const element = Component({ lang, values });
    if (!isValidElement<InspectLayoutProps>(element) || element.type !== InspectLayout) {
      throw new Error('An Inspect preview must return InspectLayout directly.');
    }
    const props = element.props;
    const authoring = createInputScene(props.children);
    const input: InputScene = {
      ...authoring.scene,
      viewBox: props.viewBox,
      ...(theme === undefined ? {} : { theme }),
      ...(props.request === undefined ? {} : { authoring: createInspectionVanillaAuthoring(props.request) }),
    };
    // 本入口只消费内置 Inspect demo；序列化公开 request 参数，不序列化 opaque token
    const configCode = JSON.stringify(
      { input, selection: props.selection ?? { rules: [] } },
      (key, value: unknown) =>
        key === 'authoring' && value !== undefined
          ? (value as ReturnType<typeof createInspectionVanillaAuthoring>).input
          : value,
      2,
    );
    const config = JSON.parse(configCode) as { input: unknown; selection: InspectionSelection };
    const restoredInput: InputScene = JSON.parse(JSON.stringify(config.input), (key, value) =>
      key === 'authoring' ? createInspectionVanillaAuthoring(value) : value,
    );
    const svg = renderToSvgString(restoredInput, {
      adapters: authoring.adapters,
      compile: { clips: props.extensions?.clips, themeStyles: PreviewThemeDefinitionBundle.core, measureText: browserMeasurer },
      compileDriver: createInspectionVanillaDriver({ registry: props.registry, selection: config.selection }),
    });
    const configFile = { filename: `${name}.config.json`, code: configCode, lang: 'json' as const };
    const hasClip = (props.extensions?.clips?.length ?? 0) > 0;
    const vanillaCode = `import type { InputScene } from '@retikz/vanilla';
import type { InspectionSelection } from '@retikz/inspect';
import { PreviewThemeDefinitionBundle } from '@/modules/docs/components/component-preview/theme';
import { browserMeasurer } from '@/modules/docs/components/component-preview/vanilla-preview';
import { renderToSvgString } from '@retikz/vanilla';
import { createDefaultInspectorRegistry } from '@retikz/inspect';
import { createInspectionVanillaAuthoring, createInspectionVanillaDriver } from '@retikz/inspect/vanilla';
${hasClip ? "import { PathClipDefinition } from '@retikz/standard/clip';\n" : ''}import config from './${name}.config.json';

// Restore runtime authoring markers; they are not persisted Core IR fields.
const input: InputScene = JSON.parse(JSON.stringify(config.input), (key, value) =>
  key === 'authoring' ? createInspectionVanillaAuthoring(value) : value,
);

export const svg = renderToSvgString(input, {
  compile: { ${hasClip ? 'clips: [PathClipDefinition], ' : ''}themeStyles: PreviewThemeDefinitionBundle.core, measureText: browserMeasurer },
  compileDriver: createInspectionVanillaDriver({
    registry: createDefaultInspectorRegistry(),
    selection: config.selection as InspectionSelection,
  }),
});`;
    const render = () => <RawSvgFrame svg={svg} />;
    return {
      vanilla: {
        files: [{ filename: `${name}.vanilla.ts`, code: vanillaCode, lang: 'ts' }, configFile],
        rendererMode: 'svg',
        render,
      },
      config: { files: [configFile], rendererMode: 'svg', render },
    };
  },
});

/** 为内置 Inspect demo 复用实时绘图、稳定基线和三种源码视图 */
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
    const values = {
      ...buildPreviewControlDefaults(contract.controls),
      ...contract.canonicalValues,
      ...props.values,
    } as PreviewControlValuesFor<TDefinition>;
    return render(values, lang);
  };
  return {
    Component,
    source: {
      ...createBuiltinInspectPreviewSource(sourceRender, name),
      canonicalRender: lang => sourceRender({ lang }),
    },
  };
};
