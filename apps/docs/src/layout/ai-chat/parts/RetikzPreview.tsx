import { AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import {
  type FC,
  type ReactElement,
  type ReactNode,
  useMemo,
  useState,
} from 'react';

import { CodeBlock } from '@/components/shared/highlight-code';
import {
  ComponentRender,
  type ComponentRenderSource,
  formatIR,
} from '@/components/shared/component-preview';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { parseRetikzJsx } from '@/lib/jsx-to-ir';
import type { IR } from '@retikz/core';
import { TikZ, convertReactNodeToIR } from '@retikz/react';

export type RetikzPreviewFormat = 'ir' | 'tsx';

export type RetikzPreviewProps = {
  /** 源码语义：`ir` 走 JSON.parse；`tsx` 走 jsx-to-ir AST 静态转换 */
  format: RetikzPreviewFormat;
  /** AI 原文（已闭合的 fenced 块体） */
  source: string;
};

type Resolved =
  | { ok: true; Component: FC; renderSource: ComponentRenderSource }
  | { ok: false; error: string };

const resolveIr = (source: string): Resolved => {
  let ir: IR;
  try {
    ir = JSON.parse(source) as IR;
  } catch (err) {
    return {
      ok: false,
      error: `IR JSON 解析失败：${err instanceof Error ? err.message : String(err)}`,
    };
  }
  const Component: FC = () => <TikZ ir={ir} />;
  // ComponentRender 只展示 IR 视图：source.react 留空即可触发"单视图、不出 toggle"分支
  return { ok: true, Component, renderSource: { ir: formatIR(ir) } };
};

const resolveTsx = (source: string): Resolved => {
  const parsed = parseRetikzJsx(source);
  if (!parsed.ok) return { ok: false, error: `JSX → IR 失败：${parsed.error}` };
  const element = parsed.element as ReactElement<{ children?: ReactNode }>;
  const Component: FC = () => element;
  let irJson: string;
  try {
    irJson = formatIR(convertReactNodeToIR(element.props.children));
  } catch (err) {
    irJson = `// Failed to compute IR: ${err instanceof Error ? err.message : String(err)}`;
  }
  return { ok: true, Component, renderSource: { react: source, ir: irJson } };
};

/**
 * AI 消息中的 retikz fenced block 渲染器
 * @description `format` 决定解析路径，成功后喂 `ComponentRender` 共用卡片骨架；
 *   失败时退化为错误卡：红色 banner + 可展开的 View source（让用户能复制原文 / 让 AI 重试）
 */
export const RetikzPreview: FC<RetikzPreviewProps> = props => {
  const { format, source } = props;
  const resolved = useMemo<Resolved>(
    () => (format === 'ir' ? resolveIr(source) : resolveTsx(source)),
    [format, source],
  );

  if (!resolved.ok) {
    return <RetikzPreviewError format={format} source={source} error={resolved.error} />;
  }
  return (
    <ComponentRender
      name={`retikz-${format}`}
      Component={resolved.Component}
      source={resolved.renderSource}
      align="center"
      size="sm"
    />
  );
};

type RetikzPreviewErrorProps = {
  format: RetikzPreviewFormat;
  source: string;
  error: string;
};

const RetikzPreviewError: FC<RetikzPreviewErrorProps> = props => {
  const { format, source, error } = props;
  const [expanded, setExpanded] = useState(false);
  const lang = format === 'ir' ? 'json' : 'tsx';
  return (
    <div className="my-3 overflow-hidden rounded-lg border border-destructive/30 bg-destructive/5">
      <div className="flex items-start gap-2 px-3 py-2 text-xs text-destructive">
        <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
        <span className="break-all">{error}</span>
      </div>
      <div className="border-t border-destructive/20 px-2 py-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            'h-6 cursor-pointer gap-1 px-2 text-xs text-muted-foreground hover:text-foreground',
          )}
          onClick={() => setExpanded(prev => !prev)}
        >
          {expanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
          {expanded ? 'Hide source' : 'View source'}
        </Button>
        {expanded ? (
          <div className="mt-1">
            <CodeBlock lang={lang} code={source} />
          </div>
        ) : null}
      </div>
    </div>
  );
};

/**
 * 流式生成中、retikz fenced 块未闭合时的骨架占位
 * @description 与 `RetikzPreview` 同尺寸的 card 外壳 + 中央 shimmer，闭合后由父级整段 markdown 重渲染替换为真图
 */
export const RetikzPreviewPending: FC<{ format: RetikzPreviewFormat }> = props => {
  const { format } = props;
  return (
    <div className="my-3 overflow-hidden rounded-xl border">
      <div className="relative flex h-44 w-full items-center justify-center overflow-hidden bg-muted/20 p-6 sm:h-56 sm:p-10">
        {/* Tailwind animate-pulse 直接做最简 shimmer，无需自定义 keyframes */}
        <div className="absolute inset-0 animate-pulse bg-muted/40" />
        <span className="relative font-mono text-xs text-muted-foreground">
          {`retikz-${format} generating…`}
        </span>
      </div>
    </div>
  );
};
