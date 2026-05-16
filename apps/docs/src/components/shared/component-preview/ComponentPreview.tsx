import type { FC, ReactElement, ReactNode } from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { docPathSegments, useDocLocation } from '@/layout/doc-layout/docLocation';
import type { IR } from '@retikz/core';
import { convertReactNodeToIR } from '@retikz/react';

import { ComponentRender, type ComponentRenderSource } from './ComponentRender';
import { type AlignKey, type SizeKey, computeUnifiedDiff, formatIR } from './_shared';

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

const buildKey = (segments: Array<string>, name: string) => `../../../contents/${segments.join('/')}/${name}.demo.tsx`;
const buildLangKey = (segments: Array<string>, name: string, lang: string) =>
  `../../../contents/${segments.join('/')}/${name}.${lang}.demo.tsx`;

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
  const { name, align = 'center', size = 'md', componentClassName, hideCode = false, diffFrom } = props;
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

  // IR 视图：调一次 Component()（demo 是无 hooks 的纯 FC）；优先看 TikZ 的 ir prop，否则把 children 喂给 convertReactNodeToIR；失败回落到错误文本；hideCode 时跳过整次计算
  const irJson = useMemo(() => {
    if (!Component || hideCode) return '';
    try {
      const tikzElement = Component({}) as ReactElement<{ children?: ReactNode; ir?: IR }> | null;
      const irFromProp = tikzElement?.props.ir;
      const ir = irFromProp ?? convertReactNodeToIR(tikzElement?.props.children);
      return formatIR(ir);
    } catch (err) {
      return `// Failed to compute IR: ${err instanceof Error ? err.message : String(err)}`;
    }
  }, [Component, hideCode]);

  if (!loc) return null;

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
  const source: ComponentRenderSource | undefined = hideCode
    ? undefined
    : { react: trimmedSource, ir: irJson, reactDiff };

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
