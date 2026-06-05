import type { FC, ReactElement, ReactNode } from 'react';
import { createElement, isValidElement, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { docPathSegments, useDocLocation } from '@/layout/doc-layout/docLocation';
import type { IR } from '@retikz/core';
import { Layout, Scope, convertReactNodeToIR } from '@retikz/react';

import { ComponentRender } from './ComponentRender';
import { RawSvgFrame } from './DemoRenderer';
import { useDemoSegments } from './demoLocationContext';
import { irToVanillaCode } from './irToVanillaCode';
import {
  type AlignKey,
  type ComponentRenderSource,
  type ComponentSourceFile,
  type RendererMode,
  type SizeKey,
  type SourceLang,
  computeUnifiedDiff,
  formatIR,
} from './_shared';

/**
 * 收集 contents 下全部 demo 模块 + 源码字符串
 * @description 双 glob 同 key 一一对应：default 导出当渲染组件，?raw 取源码喂底部代码段。`undefined` 显式声明，让 TS 知道存在性检查不是冗余
 */
const demoModules: Record<string, { default: FC; previewIR?: IR } | undefined> = import.meta.glob<{
  default: FC;
  previewIR?: IR;
}>('../../../contents/**/*.demo.tsx', { eager: true });
const demoSources: Record<string, string | undefined> = import.meta.glob<string>('../../../contents/**/*.demo.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const localSourceFiles: Record<string, string | undefined> = import.meta.glob<string>(
  ['../../../contents/**/*.{ts,tsx}', '!../../../contents/**/*.demo.tsx'],
  {
    query: '?raw',
    import: 'default',
    eager: true,
  },
);
// vanilla 代码视图的手写覆盖：同级 `<name>.vanilla.ts`（命中则原文优先，否则走 IR codegen）
const vanillaOverrides: Record<string, string | undefined> = import.meta.glob<string>(
  '../../../contents/**/*.vanilla.ts',
  {
    query: '?raw',
    import: 'default',
    eager: true,
  },
);
// vanilla 视图的「真渲染」：同 `<name>.vanilla.ts` 导出的 `svg` 字符串（renderPlot 等 SSR 产物）；有则切到 vanilla 视图用它真渲染
const vanillaModules: Record<string, { svg?: unknown } | undefined> = import.meta.glob('../../../contents/**/*.vanilla.ts', {
  eager: true,
});
// IR 视图的手写覆盖：同级 `<name>.ir.json`（命中则该文本即 IR 源 + 真渲染来源，不论 interactive 与否）。
// 用途：interactive demo 带 hooks 无法静态求 IR，配一份初始态 IR.json 让 IR 视图照样出现（React + IR 两视图）。
// 语言无关（IR 里中文文本即中文）——单文件、两语共用，故 key 用 name 不含 lang。
const irJsonOverrides: Record<string, string | undefined> = import.meta.glob<string>(
  '../../../contents/**/*.ir.json',
  {
    query: '?raw',
    import: 'default',
    eager: true,
  },
);

const buildKey = (segments: Array<string>, name: string) => `../../../contents/${segments.join('/')}/${name}.demo.tsx`;
const buildLangKey = (segments: Array<string>, name: string, lang: string) =>
  `../../../contents/${segments.join('/')}/${name}.${lang}.demo.tsx`;
const buildSourceFileKey = (segments: Array<string>, filename: string) =>
  `../../../contents/${segments.join('/')}/${filename}`;
const buildVanillaKey = (segments: Array<string>, name: string) =>
  `../../../contents/${segments.join('/')}/${name}.vanilla.ts`;
const buildIrJsonKey = (segments: Array<string>, name: string) =>
  `../../../contents/${segments.join('/')}/${name}.ir.json`;
const filenameFromKey = (key: string) => key.slice(key.lastIndexOf('/') + 1);
const COMPONENT_EXPANSION_LIMIT = 16;

type PreviewRootProps = {
  children?: ReactNode;
  ir?: IR;
  viewBox?: IR['viewBox'];
};

type FunctionComponentProps = Record<string, unknown> & {
  children?: ReactNode;
};

const resolvePreviewRootElement = (
  node: ReactNode,
  depth = COMPONENT_EXPANSION_LIMIT,
): ReactElement<PreviewRootProps> | null => {
  if (!isValidElement(node)) return null;
  const element = node as ReactElement<FunctionComponentProps>;
  if (element.type === Layout || typeof element.type !== 'function' || depth <= 0) {
    return element as ReactElement<PreviewRootProps>;
  }
  const component = element.type as (props: FunctionComponentProps) => ReactNode;
  return resolvePreviewRootElement(component(element.props), depth - 1);
};

/**
 * `<Layout>` 自身（非级联样式）的 prop 名——从 root props 里剔除这些，剩下的就是级联样式子集
 * @description 与 `LayoutProps` 的非样式字段对齐；新增非样式 Layout prop 时需同步此集
 */
const LAYOUT_OWN_PROPS = new Set([
  'children',
  'ir',
  'width',
  'height',
  'viewBox',
  'className',
  'style',
  'nodeDistance',
  'shapes',
  'arrows',
  'patterns',
  'pathGenerators',
]);

/** buildPreviewIR 产物：派生的 IR + 根 `<Layout>` 的尺寸（供 IR 视图真渲染时对齐 demo 尺寸） */
type PreviewIR = { ir: IR; width?: number | string; height?: number | string };

const buildPreviewIR = (Component: FC): PreviewIR => {
  const rootElement = resolvePreviewRootElement(Component({}));
  const props = (rootElement?.props ?? {}) as PreviewRootProps & Record<string, unknown>;
  // 复刻 <Layout> 的隐式根 scope：设了任一级联样式 prop（非 Layout 专属 prop）时把 children 包一层合成 <Scope>，
  // 让"View Code → IR"与真实渲染一致（合成 scope 的字段由 Scope builder 按 SCOPE_FIELDS 自行拣选）。ir prop 在手时跳过包裹
  let childNode = props.children;
  if (props.ir === undefined) {
    const styleProps = Object.fromEntries(
      Object.entries(props).filter(([key, value]) => !LAYOUT_OWN_PROPS.has(key) && value !== undefined),
    );
    if (Object.keys(styleProps).length > 0) {
      childNode = createElement(Scope, styleProps, props.children);
    }
  }
  const base = props.ir ?? convertReactNodeToIR(childNode);
  const isLayout = rootElement?.type === Layout;
  const viewBox = isLayout ? rootElement.props.viewBox : undefined;
  const ir = viewBox !== undefined ? { ...base, viewBox } : base;
  const width = isLayout ? (props.width as number | string | undefined) : undefined;
  const height = isLayout ? (props.height as number | string | undefined) : undefined;
  return { ir, width, height };
};

/** IR 是否含 Tier 2 composite（带 namespace）顶层节点——含则无法仅凭 IR 独立渲染（外部数据不在 IR 内），IR 视图复用 React 渲染 */
const irHasComposite = (ir: IR): boolean => ir.children.some(child => 'namespace' in child);

/** 由文件名后缀推语法高亮语言 */
const langOfFilename = (filename: string): SourceLang =>
  filename.endsWith('.json') ? 'json' : filename.endsWith('.tsx') ? 'tsx' : 'ts';

/**
 * 解析 demo key
 * @description 优先 `<name>.<lang>.demo.tsx`，找不到回退到 `<name>.demo.tsx`；含展示文本的 demo 配双语副本，纯几何 demo 单文件即可
 */
const resolveDemoKey = (segments: Array<string>, name: string, lang: string): string => {
  const langKey = buildLangKey(segments, name, lang);
  if (demoModules[langKey] !== undefined) return langKey;
  return buildKey(segments, name);
};

export type ComponentPreviewProps = {
  /** demo 文件名（不含 `.demo.tsx` 后缀），相对当前 mdx 同级目录解析 */
  name: string;
  /** 渲染区垂直对齐，默认 center */
  align?: AlignKey;
  /** 渲染区高度档位（xs / sm / md / lg / xl），默认 `md` 与改造前一致 */
  size?: SizeKey;
  /** 透传到 demo 渲染区父级 div 的 className，可覆盖默认高度 / p-10 / 居中等 */
  componentClassName?: string;
  /** 隐藏底部「View Code / 源码 / IR」面板与 Dialog 右栏，只保留 demo 渲染区——用于叙述性插图 */
  hideCode?: boolean;
  /**
   * 与 demo 一起展示的附加源码文件，路径相对当前页面目录
   * @description 元素为 `string` 时展示单文件；为 `{ file, diffFrom }` 时展示 `file` 并高亮其相对 `diffFrom` 文件的差异（默认只看新增，同主 demo `diffFrom`）。`diffFrom` 文件找不到时静默退化为无 diff
   */
  sourceFiles?: Array<string | { file: string; diffFrom: string }>;
  /**
   * 另一个 demo 的 id（与 `name` 同名规则），作为 React 源码"新增行高亮"的 baseline
   * @description 用于 Example 类多 Step 教学页：让当前 step 的代码视图自动标出相比上一 step 新增的行（浅绿底 + 左侧色条）。
   *   baseline 同样走 `<id>.<lang>.demo.tsx` 优先、回退到 `<id>.demo.tsx` 的解析；找不到时静默关闭高亮、不报错
   */
  diffFrom?: string;
  /**
   * 交互式 demo：demo 自身用 hooks（`useState` / `useEffect` / 异步 fetch 外部数据等）
   * @description 默认 demo 必须是无 hooks 的纯 FC（IR / Vanilla 视图会 `Component({})` 静态执行一次求 IR）。
   *   交互 demo 无法被静态执行，故开启后：以真元素 `<Component/>` 渲染让 hooks 生效、隐藏 svg/canvas 切换、
   *   并跳过 IR / Vanilla 视图（异步数据无法静态求值），代码面板只保留 React 源码（+ `sourceFiles`）
   */
  interactive?: boolean;
};

/**
 * MDX 内的"渲染 + 源码"演示卡（薄壳）
 * @description 只负责 demo 文件 glob 加载 + IR 派生 + "Demo not found" 兜底；卡片 / pan&zoom / 代码面板 / 放大 dialog 全部走 `ComponentRender` 核心
 */
export const ComponentPreview: FC<ComponentPreviewProps> = props => {
  const { name, align = 'center', size = 'md', componentClassName, hideCode = false, sourceFiles, diffFrom, interactive = false } =
    props;
  const loc = useDocLocation();
  const { i18n } = useTranslation();
  const lang = i18n.language.startsWith('zh') ? 'zh' : 'en';

  // 允许「找不到」时为 undefined，不在这里 early return（hooks 顺序要稳）
  // segments 优先取 DemoLocationContext（与屏幕上正在渲染的那份 MDX 内容配对），缺省再回退实时路由——
  // 切页过渡窗口里旧内容仍挂着、实时路由已是新页，直接用实时路由会把旧 demo 名拼到新目录下误报 not found
  const ctxSegments = useDemoSegments();
  const segments = ctxSegments ?? (loc ? docPathSegments(loc) : null);
  const key = segments ? resolveDemoKey(segments, name, lang) : null;
  const mod = key ? demoModules[key] : undefined;
  const rawSource = key ? demoSources[key] : undefined;
  const Component = mod?.default;
  // baseline 走同样的 i18n 解析；找不到时 baselineRawSource = undefined，下游静默跳过染色
  const baselineKey = segments && diffFrom ? resolveDemoKey(segments, diffFrom, lang) : null;
  const baselineRawSource = baselineKey ? demoSources[baselineKey] : undefined;

  // IR 视图优先级：① 同级 `<name>.ir.json` 手写覆盖（不论 interactive，文本即 IR 源、解析后真渲染、尺寸交 <Layout ir> 自适配）；
  // ② interactive demo 静态执行不了组件（hooks 会抛），但可显式 `export const previewIR`（图形描述 IR、与数据无关）保留 IR 代码视图，
  //    此时 previewIr 仍为 null（不真渲染、预览区复用 live <Component/>）；③ 否则同步展开无 hooks 组件树求 IR。
  // 一次求值供 IR 代码 + IR 真渲染共用；失败回落错误文本
  const irJsonOverrideKey = segments ? buildIrJsonKey(segments, name) : null;
  const irJsonOverride = irJsonOverrideKey ? irJsonOverrides[irJsonOverrideKey] : undefined;
  const exportedPreviewIR = mod?.previewIR;
  const irState = useMemo<{ previewIr: PreviewIR | null; irJson: string }>(() => {
    if (!Component || hideCode) return { previewIr: null, irJson: '' };
    if (irJsonOverride !== undefined) {
      const irJson = irJsonOverride.replace(/\n$/, '');
      try {
        const ir = JSON.parse(irJson) as IR;
        return { previewIr: { ir, width: undefined, height: undefined }, irJson };
      } catch (err) {
        return { previewIr: null, irJson: `// Failed to parse IR override: ${err instanceof Error ? err.message : String(err)}` };
      }
    }
    if (interactive) return { previewIr: null, irJson: exportedPreviewIR !== undefined ? formatIR(exportedPreviewIR) : '' };
    try {
      const previewIr = buildPreviewIR(Component);
      return { previewIr, irJson: formatIR(previewIr.ir) };
    } catch (err) {
      return { previewIr: null, irJson: `// Failed to compute IR: ${err instanceof Error ? err.message : String(err)}` };
    }
  }, [Component, hideCode, interactive, irJsonOverride, exportedPreviewIR]);

  // Vanilla 视图：同级 `<name>.vanilla.ts` 手写覆盖优先，否则从同一份 IR codegen；失败回落错误文本
  const vanillaKey = segments ? buildVanillaKey(segments, name) : null;
  const vanillaOverride = vanillaKey ? vanillaOverrides[vanillaKey] : undefined;
  // 手写覆盖导出的 `svg` 字符串 → vanilla 视图真渲染（仅手写覆盖有；自动 codegen 无可执行产物，复用 React 渲染）
  const vanillaModule = vanillaKey ? vanillaModules[vanillaKey] : undefined;
  const vanillaSvg = typeof vanillaModule?.svg === 'string' ? vanillaModule.svg : undefined;
  const vanillaCode = useMemo(() => {
    if (!Component || hideCode) return '';
    // 手写覆盖不需静态求值，interactive demo 也可有 vanilla 视图；仅自动 codegen 依赖静态 IR（interactive 无法静态展开）
    if (vanillaOverride !== undefined) return vanillaOverride.replace(/\n$/, '');
    if (interactive || !irState.previewIr) return '';
    try {
      return irToVanillaCode(irState.previewIr.ir);
    } catch (err) {
      return `// Failed to generate vanilla code: ${err instanceof Error ? err.message : String(err)}`;
    }
  }, [Component, hideCode, vanillaOverride, interactive, irState]);

  if (!loc) return null;
  if (!segments) return null;

  if (!mod || rawSource == null || !key || !Component) {
    return (
      <div className="my-6 rounded-md border border-dashed px-4 py-3 text-sm text-muted-foreground">
        Demo <code className="rounded bg-muted px-1">{name}</code> not found at{' '}
        <code className="rounded bg-muted px-1">{key ?? '(unknown)'}</code>
      </div>
    );
  }

  const trimmedSource = rawSource.replace(/\n$/, '');
  // baseline 也裁尾换行后再 diff——和 trimmedSource 同口径，避免末行因 `\n` 差异被误判新增 / 删除
  const reactDiff =
    !hideCode && baselineRawSource !== undefined
      ? computeUnifiedDiff(baselineRawSource.replace(/\n$/, ''), trimmedSource)
      : undefined;
  const extraSourceFiles: Array<ComponentSourceFile> = (sourceFiles ?? []).map(entry => {
    const filename = typeof entry === 'string' ? entry : entry.file;
    const rawSourceFile = localSourceFiles[buildSourceFileKey(segments, filename)];
    const code = rawSourceFile?.replace(/\n$/, '') ?? `// Source file not found: ${filename}`;
    // diff baseline：对象项用显式 diffFrom；字符串项若是「当前 demo 名为前缀」的步内子文件，自动配对上一步 diffFrom 下的同名子文件（`<diffFrom>.<subName>`）。共享子文件（非该前缀）不 diff
    const baselineFilename =
      typeof entry !== 'string'
        ? entry.diffFrom
        : diffFrom !== undefined && filename.startsWith(`${name}.`)
          ? `${diffFrom}.${filename.slice(name.length + 1)}`
          : undefined;
    if (baselineFilename === undefined) return { filename, code, lang: langOfFilename(filename) };
    // baseline / 本文件任一缺失时静默退化为无 diff（同主 demo diffFrom）
    const baselineRaw = localSourceFiles[buildSourceFileKey(segments, baselineFilename)];
    const diff =
      !hideCode && rawSourceFile !== undefined && baselineRaw !== undefined
        ? computeUnifiedDiff(baselineRaw.replace(/\n$/, ''), code)
        : undefined;
    return { filename, code, lang: langOfFilename(filename), diff };
  });
  const mainFilename = filenameFromKey(key);
  const reactFiles: Array<ComponentSourceFile> = [
    { filename: mainFilename, code: trimmedSource, lang: langOfFilename(mainFilename), diff: reactDiff, isMain: true },
    ...extraSourceFiles,
  ];

  // 统一 source 模型：每个视图 = 一组文件 + 可选「对应 runtime 渲染」。
  // react 渲染走 ComponentRender 的 <Component/> 兜底（无 render thunk）；
  // ir 仅 Tier 1 可独立渲染（Tier 2 外部数据不在 IR 内 → 复用 React 渲染）；vanilla 有可执行 svg 导出时真渲染。
  const previewIr = irState.previewIr;
  const source: ComponentRenderSource | undefined = hideCode
    ? undefined
    : {
        react: { files: reactFiles },
        ...(irState.irJson.length > 0
          ? {
              ir: {
                files: [{ filename: `${name}.ir.json`, code: irState.irJson, lang: 'json' as const }],
                render:
                  previewIr !== null && !irHasComposite(previewIr.ir)
                    ? (mode: RendererMode) => (
                        <Layout ir={previewIr.ir} renderer={mode} width={previewIr.width} height={previewIr.height} />
                      )
                    : undefined,
              },
            }
          : {}),
        ...(vanillaCode.length > 0
          ? {
              vanilla: {
                // vanilla 复用同一份数据 sourceFiles（data 文件只此一份，react / vanilla 共享）
                files: [
                  { filename: `${name}.vanilla.ts`, code: vanillaCode, lang: 'ts' as const },
                  ...extraSourceFiles,
                ],
                render: vanillaSvg !== undefined ? () => <RawSvgFrame svg={vanillaSvg} /> : undefined,
              },
            }
          : {}),
      };

  return (
    <ComponentRender
      name={name}
      Component={Component}
      source={source}
      align={align}
      size={size}
      componentClassName={componentClassName}
      interactive={interactive}
    />
  );
};
