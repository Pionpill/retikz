import { AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import {
  type ErrorInfo,
  type FC,
  Component as ReactComponent,
  type ReactElement,
  type ReactNode,
  cloneElement,
  isValidElement,
  useMemo,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import { CodeBlock } from '@/components/shared/highlight-code';
import {
  ComponentRender,
  type ComponentRenderSource,
  formatIR,
} from '@/components/shared/component-preview';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { parseRetikzJsx } from '@/lib/jsx-to-ir';
import { type IR, SceneSchema } from '@retikz/core';
import { Layout, convertReactNodeToIR } from '@retikz/react';

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

/**
 * AI 生成的 retikz 渲染默认 SVG 尺寸
 * @description IR 路径 AI 不会主动写 width/height；TSX 路径 AI 偶尔也漏。给个兜底让 SVG 有 intrinsic size，配合 `[&_svg]:max-w-full [&_svg]:h-auto` 缩放
 */
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
  // zod schema 校验：AI 常凭训练记忆编一套不同形状的 IR（如 `entities` / `paths` 顶层、version `"0.1"`），不挡的话进 TikZ 直接 runtime 炸
  const parsed = SceneSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      errorKind: 'ir',
      errorDetail: `schema mismatch — ${formatZodError(parsed.error)}`,
    };
  }
  const ir: IR = parsed.data;
  // 强制传 width/height：SVG 不带 width/height attr 时 flex 容器里浏览器算 intrinsic size 不一致（Chrome 偶尔 0×0），导致看似"没渲染"
  const Component: FC = () => <Layout ir={ir} width={DEFAULT_TIKZ_WIDTH} height={DEFAULT_TIKZ_HEIGHT} />;
  // 只给 IR 视图（单视图、不出 toggle）；无 render thunk → 渲染走 Component（即 <Layout ir>）
  return { ok: true, Component, renderSource: { ir: { files: [{ filename: 'scene.ir.json', code: formatIR(ir), lang: 'json' }] } } };
};

const resolveTsx = (source: string): Resolved => {
  const parsed = parseRetikzJsx(source);
  if (!parsed.ok) return { ok: false, errorKind: 'tsx', errorDetail: parsed.error };
  const element = parsed.element as ReactElement<{ children?: ReactNode; width?: number; height?: number }>;
  // 同 IR 路径：AI 偶尔写 `<Layout>...` 不带 width/height，cloneElement 补默认。已有的 width/height 不动
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
    // AI 经常用 retikz-tsx 围栏块写"改动片段"（裸的几行 <Node>，不带 <Layout> 外壳）来说明 diff——
    // 这种情况 parser 报 "Adjacent JSX elements must be wrapped in an enclosing tag"。
    // 降级成 plain code block：用户看的是改动片段，不是要再跑一次预览
    if (
      resolved.errorKind === 'tsx' &&
      /Adjacent JSX elements must be wrapped/i.test(resolved.errorDetail)
    ) {
      // w-full + min-w-0 + overflow-hidden 三件套防止长代码行撑宽 AI 侧栏，内部 pre 自带横向滚动
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
    // key=source：source 变（AI 流式追加 / 重发）时 boundary 重新挂载，否则错过一次后 error 状态会一直锁住
    <RetikzRenderErrorBoundary key={source} format={format} source={source}>
      <ComponentRender
        name={`retikz-${format}`}
        Component={resolved.Component}
        source={resolved.renderSource}
        align="center"
        size="sm"
        // AI 面板宽度有限，AI 生成的 TikZ 常自带 `width/height` 像素值，让 svg max-width 跟容器、height 按 viewBox 比例自适应，避免撑大侧栏
        componentClassName="min-w-0 [&_svg]:max-w-full [&_svg]:h-auto"
        // AI 面板内自指无意义：用户已经在跟 AI 对话，不需要再点 Ask AI 弹回 prompt
        showAskAi={false}
      />
    </RetikzRenderErrorBoundary>
  );
};

/**
 * 局部 ErrorBoundary：抓 ComponentRender 子树里 TikZ 编译 / 渲染抛的 runtime 异常
 * @description AI 生成的 IR 可能解析成功（JSON 合法）但 compileToScene 后字段不全 / 不一致，render 阶段抛错。
 *   不拦的话整个 AI 面板崩；这里降级为同款 RetikzPreviewError 错误卡，让用户能看到原文 + 报错并让 AI 重试
 */
type RetikzRenderErrorBoundaryProps = {
  format: RetikzPreviewFormat;
  source: string;
  children: ReactNode;
};

type RetikzRenderErrorBoundaryState = { error: Error | null };

class RetikzRenderErrorBoundary extends ReactComponent<
  RetikzRenderErrorBoundaryProps,
  RetikzRenderErrorBoundaryState
> {
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
  /** 解析器原始错误细节；目前为中文（acorn 报的解析错为英文），i18n 包外层前缀 */
  errorDetail: string;
};

const RetikzPreviewError: FC<RetikzPreviewErrorProps> = props => {
  const { format, source, errorKind, errorDetail } = props;
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const lang = format === 'ir' ? 'json' : 'tsx';
  const prefix = errorKind === 'ir' ? t('ai.diagramErrorIr') : t('ai.diagramErrorJsx');
  return (
    // w-full + min-w-0 + max-w-full：error 卡严格占父宽，不让里面长错误信息 / 源码撑大 AI 侧栏
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
          className={cn(
            'h-6 cursor-pointer gap-1 px-2 text-xs text-muted-foreground hover:text-foreground',
          )}
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

/**
 * 流式生成中、retikz fenced 块未闭合时的骨架占位
 * @description 与 `RetikzPreview` 同尺寸的 card 外壳 + 中央 shimmer，闭合后由父级整段 markdown 重渲染替换为真图
 */
export const RetikzPreviewPending: FC<{ format: RetikzPreviewFormat }> = props => {
  const { format } = props;
  const { t } = useTranslation();
  return (
    <div className="my-3 overflow-hidden rounded-xl border">
      <div className="relative flex h-44 w-full items-center justify-center overflow-hidden bg-muted/20 p-6 sm:h-56 sm:p-10">
        {/* Tailwind animate-pulse 直接做最简 shimmer，无需自定义 keyframes */}
        <div className="absolute inset-0 animate-pulse bg-muted/40" />
        <span className="relative font-mono text-xs text-muted-foreground">
          {t('ai.diagramGenerating', { lang: `retikz-${format}` })}
        </span>
      </div>
    </div>
  );
};
