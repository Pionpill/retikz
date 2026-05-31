import type { FC, ReactElement, ReactNode } from 'react';
import { isValidElement, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { docPathSegments, useDocLocation } from '@/layout/doc-layout/docLocation';
import type { IR } from '@retikz/core';
import { Layout, convertReactNodeToIR } from '@retikz/react';

import { ComponentRender, type ComponentRenderSource } from './ComponentRender';
import {
  type AlignKey,
  type ComponentSourceFile,
  type SizeKey,
  computeUnifiedDiff,
  formatIR,
} from './_shared';

/**
 * 收集 contents 下全部 demo 模块 + 源码字符串
 * @description 双 glob 同 key 一一对应：default 导出当渲染组件，?raw 取源码喂底部代码段。`undefined` 显式声明，让 TS 知道存在性检查不是冗余
 */
const demoModules: Record<string, { default: FC } | undefined> = import.meta.glob<{
  default: FC;
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

const buildKey = (segments: Array<string>, name: string) => `../../../contents/${segments.join('/')}/${name}.demo.tsx`;
const buildLangKey = (segments: Array<string>, name: string, lang: string) =>
  `../../../contents/${segments.join('/')}/${name}.${lang}.demo.tsx`;
const buildSourceFileKey = (segments: Array<string>, filename: string) =>
  `../../../contents/${segments.join('/')}/${filename}`;
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

const buildPreviewIR = (Component: FC): IR => {
  const rootElement = resolvePreviewRootElement(Component({}));
  const base = rootElement?.props.ir ?? convertReactNodeToIR(rootElement?.props.children);
  const viewBox = rootElement?.type === Layout ? rootElement.props.viewBox : undefined;
  return viewBox !== undefined ? { ...base, viewBox } : base;
};

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
};

/**
 * MDX 内的"渲染 + 源码"演示卡（薄壳）
 * @description 只负责 demo 文件 glob 加载 + IR 派生 + "Demo not found" 兜底；卡片 / pan&zoom / 代码面板 / 放大 dialog 全部走 `ComponentRender` 核心
 */
export const ComponentPreview: FC<ComponentPreviewProps> = props => {
  const { name, align = 'center', size = 'md', componentClassName, hideCode = false, sourceFiles, diffFrom } =
    props;
  const loc = useDocLocation();
  const { i18n } = useTranslation();
  const lang = i18n.language.startsWith('zh') ? 'zh' : 'en';

  // 允许「找不到」时为 undefined，不在这里 early return（hooks 顺序要稳）
  const segments = loc ? docPathSegments(loc) : null;
  const key = segments ? resolveDemoKey(segments, name, lang) : null;
  const mod = key ? demoModules[key] : undefined;
  const rawSource = key ? demoSources[key] : undefined;
  const Component = mod?.default;
  // baseline 走同样的 i18n 解析；找不到时 baselineRawSource = undefined，下游静默跳过染色
  const baselineKey = segments && diffFrom ? resolveDemoKey(segments, diffFrom, lang) : null;
  const baselineRawSource = baselineKey ? demoSources[baselineKey] : undefined;

  // IR 视图：同步展开 demo 的无 hooks 组件树，停在 <Layout> 后读取 children / ir；失败回落到错误文本；hideCode 时跳过整次计算
  const irJson = useMemo(() => {
    if (!Component || hideCode) return '';
    try {
      return formatIR(buildPreviewIR(Component));
    } catch (err) {
      return `// Failed to compute IR: ${err instanceof Error ? err.message : String(err)}`;
    }
  }, [Component, hideCode]);

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
    if (typeof entry === 'string') return { filename, code };
    // 对象项：相对 diffFrom 文件计算教学 diff；baseline / 本文件任一缺失时静默退化为无 diff（同主 demo diffFrom）
    const baselineRaw = localSourceFiles[buildSourceFileKey(segments, entry.diffFrom)];
    const diff =
      !hideCode && rawSourceFile !== undefined && baselineRaw !== undefined
        ? computeUnifiedDiff(baselineRaw.replace(/\n$/, ''), code)
        : undefined;
    return { filename, code, diff };
  });
  const files: Array<ComponentSourceFile> = [
    ...extraSourceFiles,
    {
      filename: filenameFromKey(key),
      code: trimmedSource,
      diff: reactDiff,
    },
  ];
  const source: ComponentRenderSource | undefined = hideCode
    ? undefined
    : { reactFiles: files, ir: irJson };

  return (
    <ComponentRender
      name={name}
      Component={Component}
      source={source}
      align={align}
      size={size}
      componentClassName={componentClassName}
    />
  );
};
