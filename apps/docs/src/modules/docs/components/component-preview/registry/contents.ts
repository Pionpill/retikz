import type {
  ComponentPreviewDemoComponent,
  ComponentPreviewFileConfig,
  PreviewControlContract,
  PreviewControlsDefinition,
  PreviewSourceConfig,
  SourceLang,
} from '../types';

/** Vite glob 生成的异步模块加载器。 */
export type PreviewLoader<T> = () => Promise<T>;

/** 单个 demo 模块对 ComponentPreview 暴露的导出。 */
export type PreviewDemoModule = {
  default: ComponentPreviewDemoComponent;
  previewIR?: unknown;
  previewControlContract?: PreviewControlContract;
  previewControls?: PreviewControlsDefinition;
  previewSource?: PreviewSourceConfig;
};

/** 单个 Vanilla 覆盖模块。 */
export type PreviewVanillaModule = { svg?: unknown };

/**
 * 收集 contents 下全部 demo 模块与源码字符串。
 * @description 只在 component-preview 内部用于 demo、source、IR、vanilla 解析，不属于顶层公共 API。
 */
export const demoModuleLoaders: Record<string, PreviewLoader<PreviewDemoModule> | undefined> =
  import.meta.glob<PreviewDemoModule>('../../contents/**/*.tsx', { base: '../' });

export const demoSourceLoaders: Record<string, PreviewLoader<string> | undefined> = import.meta.glob<string>(
  '../../contents/**/*.tsx',
  {
    base: '../',
    query: '?raw',
    import: 'default',
  },
);

export const localSourceFileLoaders: Record<string, PreviewLoader<string> | undefined> = import.meta.glob<string>(
  ['../../contents/**/*.{ts,tsx}', '!../../contents/**/*.demo.tsx'],
  {
    base: '../',
    query: '?raw',
    import: 'default',
  },
);

/** vanilla 代码视图的手写覆盖：同级 `<name>.vanilla.ts`，命中则原文优先，否则走 IR codegen。 */
export const vanillaOverrideLoaders: Record<string, PreviewLoader<string> | undefined> = import.meta.glob<string>(
  '../../contents/**/*.vanilla.ts',
  {
    base: '../',
    query: '?raw',
    import: 'default',
  },
);

/** vanilla 视图的真渲染模块：同级 `<name>.vanilla.ts` 导出的 `svg` 字符串。 */
export const vanillaModuleLoaders: Record<string, PreviewLoader<PreviewVanillaModule> | undefined> =
  import.meta.glob<PreviewVanillaModule>('../../contents/**/*.vanilla.ts', { base: '../' });

/** IR 视图的手写覆盖：同级 `<name>.ir.json`，语言无关，单文件两语共用。 */
export const irJsonOverrideLoaders: Record<string, PreviewLoader<string> | undefined> = import.meta.glob<string>(
  '../../contents/**/*.ir.json',
  {
    base: '../',
    query: '?raw',
    import: 'default',
  },
);

export const buildKey = (segments: Array<string>, name: string) =>
  `../../contents/${segments.join('/')}/${name}.demo.tsx`;
export const buildComponentKey = (segments: Array<string>, name: string) =>
  `../../contents/${segments.join('/')}/${name}.tsx`;
export const buildLangKey = (segments: Array<string>, name: string, lang: string) =>
  `../../contents/${segments.join('/')}/${name}.${lang}.demo.tsx`;
export const buildSourceFileKey = (segments: Array<string>, filename: string) =>
  `../../contents/${segments.join('/')}/${filename}`;
export const buildVanillaKey = (segments: Array<string>, name: string) =>
  `../../contents/${segments.join('/')}/${name}.vanilla.ts`;
export const buildIrJsonKey = (segments: Array<string>, name: string) =>
  `../../contents/${segments.join('/')}/${name}.ir.json`;
export const filenameFromKey = (key: string) => key.slice(key.lastIndexOf('/') + 1);

/**
 * 解析 demo key。
 * @description 优先单文件 `<name>.tsx`，再回退旧的 `<name>.demo.tsx` 与 `<name>.<lang>.demo.tsx`。
 */
export const resolveDemoKey = (segments: Array<string>, name: string, lang: string): string => {
  const componentKey = buildComponentKey(segments, name);
  if (demoModuleLoaders[componentKey] !== undefined) return componentKey;
  const demoKey = buildKey(segments, name);
  if (demoModuleLoaders[demoKey] !== undefined) return demoKey;
  const langKey = buildLangKey(segments, name, lang);
  return demoModuleLoaders[langKey] !== undefined ? langKey : demoKey;
};

/** 解析附加源码文件对应的 diff baseline 文件名。 */
export const resolveSourceBaselineFilename = (
  entry: ComponentPreviewFileConfig,
  name: string,
  diffFrom?: string,
): string | undefined =>
  entry.diffFrom ??
  (diffFrom !== undefined && entry.file.startsWith(`${name}.`)
    ? `${diffFrom}.${entry.file.slice(name.length + 1)}`
    : undefined);

/** 由文件名后缀推断语法高亮语言。 */
export const langOfFilename = (filename: string): SourceLang =>
  filename.endsWith('.json') ? 'json' : filename.endsWith('.tsx') ? 'tsx' : 'ts';
