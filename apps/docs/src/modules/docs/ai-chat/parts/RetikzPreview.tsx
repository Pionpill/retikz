import type { IRScene } from '@retikz/core';
import type { ErrorInfo, FC, ReactElement, ReactNode } from 'react';

import { SceneSchema } from '@retikz/core';
import { convertReactNodeToIR, Layout } from '@retikz/react';
import { AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { cloneElement, Component as ReactComponent, isValidElement, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { ComponentRenderSource } from '@/modules/docs/components';

import { Button } from '@/components/ui/button';
import { parseRetikzJsx } from '@/lib';
import { cn } from '@/lib';
import { CodeBlock, ComponentPreviewCard, formatIR } from '@/modules/docs/components';

import { formatZodError } from '../retikz-validation';

export type RetikzPreviewFormat = 'ir' | 'tsx';

export type RetikzPreviewProps = {
  /** 源码语义：`ir` 走 JSON.parse；`tsx` 走 jsx-to-ir AST 静态转换 */
  format: RetikzPreviewFormat;
  /** AI 原文（已闭合的 fenced 块体） */
  source: string;
};

type Resolved =
  | { ok: true; Component: FC; renderSource: ComponentRenderSource }
  | { ok: false; errorKind: 'ir' | 'tsx'; errorDetail: string };

/** AI 生成图的默认尺寸。 */
const DEFAULT_TIKZ_WIDTH = 400;
const DEFAULT_TIKZ_HEIGHT = 300;

const resolveIr = (source: string): Resolved => {
  let raw: unknown;
  try {
    raw = JSON.parse(source);
  } catch (err) {
    return {
      ok: false,
      errorKind: 'ir',
      errorDetail: err instanceof Error ? err.message : String(err),
    };
  }
  const parsed = SceneSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      errorKind: 'ir',
      errorDetail: `schema mismatch — ${formatZodError(parsed.error)}`,
    };
  }
  const ir: IRScene = parsed.data;
  const Component: FC = () => <Layout ir={ir} width={DEFAULT_TIKZ_WIDTH} height={DEFAULT_TIKZ_HEIGHT} />;
  return {
    ok: true,
    Component,
    renderSource: { ir: { files: [{ filename: 'scene.ir.json', code: formatIR(ir), lang: 'json' }] } },
  };
};

const resolveTsx = (source: string): Resolved => {
  const parsed = parseRetikzJsx(source);
  if (!parsed.ok) return { ok: false, errorKind: 'tsx', errorDetail: parsed.error };
  const element = parsed.element as ReactElement<{ children?: ReactNode; width?: number; height?: number }>;
  const enriched = isValidElement(element)
    ? cloneElement(element, {
        width: element.props.width ?? DEFAULT_TIKZ_WIDTH,
        height: element.props.height ?? DEFAULT_TIKZ_HEIGHT,
      })
    : element;
  const Component: FC = () => enriched;
  let irJson: string;
  try {
    irJson = formatIR(convertReactNodeToIR(element.props.children));
  } catch (err) {
    irJson = `// Failed to compute IR: ${err instanceof Error ? err.message : String(err)}`;
  }
  return {
    ok: true,
    Component,
    renderSource: {
      react: { files: [{ filename: 'diagram.tsx', code: source, lang: 'tsx' }] },
      ir: { files: [{ filename: 'scene.ir.json', code: irJson, lang: 'json' }] },
    },
  };
};

/** AI 消息中的 retikz fenced block 渲染器。 */
export const RetikzPreview: FC<RetikzPreviewProps> = props => {
  const { format, source } = props;
  const resolved = useMemo<Resolved>(
    () => (format === 'ir' ? resolveIr(source) : resolveTsx(source)),
    [format, source],
  );

  if (!resolved.ok) {
    if (resolved.errorKind === 'tsx' && /Adjacent JSX elements must be wrapped/i.test(resolved.errorDetail)) {
      return (
        <div className="my-3 w-full min-w-0 max-w-full overflow-hidden">
          <CodeBlock lang="tsx" code={source} />
        </div>
      );
    }
    return (
      <RetikzPreviewError
        format={format}
        source={source}
        errorKind={resolved.errorKind}
        errorDetail={resolved.errorDetail}
      />
    );
  }
  return (
    <RetikzRenderErrorBoundary key={source} format={format} source={source}>
      <ComponentPreviewCard
        name={`retikz-${format}`}
        Component={resolved.Component}
        source={resolved.renderSource}
        align="center"
        size="sm"
        previewClassName="min-w-0 [&_svg]:max-w-full [&_svg]:h-auto"
        showAskAi={false}
      />
    </RetikzRenderErrorBoundary>
  );
};

type RetikzRenderErrorBoundaryProps = {
  format: RetikzPreviewFormat;
  source: string;
  children: ReactNode;
};

type RetikzRenderErrorBoundaryState = { error: Error | null };

class RetikzRenderErrorBoundary extends ReactComponent<RetikzRenderErrorBoundaryProps, RetikzRenderErrorBoundaryState> {
  override state: RetikzRenderErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): RetikzRenderErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[RetikzPreview] render error:', error, info.componentStack);
  }

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <RetikzPreviewError
        format={this.props.format}
        source={this.props.source}
        errorKind={this.props.format}
        errorDetail={error.message}
      />
    );
  }
}

type RetikzPreviewErrorProps = {
  format: RetikzPreviewFormat;
  source: string;
  errorKind: 'ir' | 'tsx';
  /** 解析器原始错误细节。 */
  errorDetail: string;
};

const RetikzPreviewError: FC<RetikzPreviewErrorProps> = props => {
  const { format, source, errorKind, errorDetail } = props;
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const lang = format === 'ir' ? 'json' : 'tsx';
  const prefix = errorKind === 'ir' ? t('ai.diagramErrorIr') : t('ai.diagramErrorJsx');
  return (
    <div className="my-3 w-full min-w-0 max-w-full overflow-hidden rounded-lg border border-destructive/30 bg-destructive/5">
      <div className="flex items-start gap-2 px-3 py-2 text-xs text-destructive">
        <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
        <span className="min-w-0 break-all">{`${prefix}：${errorDetail}`}</span>
      </div>
      <div className="border-t border-destructive/20 px-2 py-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn('h-6 cursor-pointer gap-1 px-2 text-xs text-muted-foreground hover:text-foreground')}
          onClick={() => setExpanded(prev => !prev)}
        >
          {expanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
          {expanded ? t('ai.diagramHideSource') : t('ai.diagramViewSource')}
        </Button>
        {expanded ? (
          <div className="mt-1 w-full min-w-0 max-w-full overflow-hidden">
            <CodeBlock lang={lang} code={source} />
          </div>
        ) : null}
      </div>
    </div>
  );
};

/** retikz fenced block 未闭合时的占位。 */
export const RetikzPreviewPending: FC<{ format: RetikzPreviewFormat }> = props => {
  const { format } = props;
  const { t } = useTranslation();
  return (
    <div className="my-3 overflow-hidden rounded-xl border">
      <div className="relative flex h-44 w-full items-center justify-center overflow-hidden bg-muted/20 p-6 sm:h-56 sm:p-10">
        <div className="absolute inset-0 animate-pulse bg-muted/40" />
        <span className="relative font-mono text-xs text-muted-foreground">
          {t('ai.diagramGenerating', { lang: `retikz-${format}` })}
        </span>
      </div>
    </div>
  );
};
