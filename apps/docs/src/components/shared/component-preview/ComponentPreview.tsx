import { JsonIcon, ReactIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { convertReactNodeToIR } from '@retikz/react';
import { Check, ChevronsDownUp, ChevronsUpDown, Copy, X } from 'lucide-react';
import type { FC, ReactElement, ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router';
import { HighlightedCode } from '../highlight-code';

/**
 * 收集 contents/<...>/<name>.demo.tsx 下的所有 demo（demo 文件与 mdx 同级，靠 .demo.tsx 后缀甄别）：
 * - demoModules：模块本体，用 default 导出当作渲染组件
 * - demoSources：?raw 取源码字符串，作为 ComponentPreview 底部代码段展示
 * 双 glob 同 key 一一对应，build 时由 vite 处理，零自定义脚本。
 */
// import.meta.glob 默认类型 Record<string, T>，但运行时未匹配的 key 是 undefined，
// 显式声明为 `T | undefined` 让 TS 知道下面的存在性检查不是冗余。
const demoModules: Record<string, { default: FC } | undefined> = import.meta.glob<{
  default: FC;
}>('../../../contents/**/*.demo.tsx', { eager: true });
const demoSources: Record<string, string | undefined> = import.meta.glob<string>('../../../contents/**/*.demo.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const buildKey = (segments: Array<string>, name: string) => `../../../contents/${segments.join('/')}/${name}.demo.tsx`;

const alignClass = {
  center: 'items-center',
  start: 'items-start',
  end: 'items-end',
} as const;

/** 折叠态显示前几行 */
const PREVIEW_MAX_LINES = 3;
/** 已 View Code 之后默认折叠状态下的代码区高度上限（按 ~15 行 × 1.5em line-height + 一点点 padding 算）*/
const COLLAPSED_CODE_MAX_H = '[&_pre]:max-h-[15rem] [&_pre]:overflow-y-auto';
/** 触发「展开/收起」按钮的最小行数门槛 */
const COLLAPSE_THRESHOLD_LINES = 10;

/** 源码视图切换：React 源码 / IR JSON */
type SourceView = 'react' | 'ir';

/**
 * `JSON.stringify(_, null, 2)` 会把数组无脑拆成 4 行（`position: [0, 0]` 也变 4 行），
 * IR 输出特别冗长。这里 post-process：把不含嵌套对象/数组的纯标量短数组压回单行（限 60 字符以内
 * 避免长数组内联反而难读）。
 */
const formatIR = (ir: unknown): string =>
  JSON.stringify(ir, null, 2).replace(/\[\s*([^[\]{}]+?)\s*\]/g, (match, contents: string) => {
    const inlined = `[${contents
      .replace(/\s+/g, ' ')
      .replace(/\s*,\s*/g, ', ')
      .trim()}]`;
    return inlined.length <= 60 ? inlined : match;
  });

export type ComponentPreviewProps = {
  /** demo 文件名（不含 `.demo.tsx` 后缀），相对当前 mdx 同级目录解析 */
  name: string;
  /** 渲染区垂直对齐，默认 center */
  align?: keyof typeof alignClass;
  /** 透传到 demo 渲染区父级 div 的 className，可覆盖默认的 h-72 / p-10 / 居中等 */
  componentClassName?: string;
};

/** MDX 内的"渲染 + 源码"演示卡，下半段对齐 shadcn v4 的 View Code 一次性切换 */
export const ComponentPreview: FC<ComponentPreviewProps> = props => {
  const { name, align = 'center', componentClassName } = props;
  // ALL hooks 必须无条件先于 early return 调用
  const [isCodeVisible, setIsCodeVisible] = useState(false);
  const [view, setView] = useState<SourceView>('react');
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const { moduleId, sectionId, pageId, subPageId } = useParams<'moduleId' | 'sectionId' | 'pageId' | 'subPageId'>();

  // demo 解析需要在 useMemo 之前算出 Component 引用，所以这里允许「找不到」时为 undefined，
  // 不在这里 early return（hooks 顺序要稳）；最终的"找不到"分支由下面的 if (!mod || ...) 走
  const segments =
    moduleId && sectionId && pageId
      ? subPageId
        ? [moduleId, sectionId, pageId, subPageId]
        : [moduleId, sectionId, pageId]
      : null;
  const key = segments ? buildKey(segments, name) : null;
  const mod = key ? demoModules[key] : undefined;
  const source = key ? demoSources[key] : undefined;
  const Component = mod?.default;

  // IR 视图：调一次 Component()（demo 是一个直接返回 <Tikz>...</Tikz> 的纯 FC，无 hooks 不会出问题），
  // 取 Tikz 的 children 喂给 convertReactNodeToIR；失败回落给一段错误文本而不是抛出
  const irJson = useMemo(() => {
    if (!Component) return '';
    try {
      const tikzElement = Component({}) as ReactElement<{ children?: ReactNode }> | null;
      const tikzChildren = tikzElement?.props.children;
      const ir = convertReactNodeToIR(tikzChildren);
      return formatIR(ir);
    } catch (err) {
      return `// Failed to compute IR: ${err instanceof Error ? err.message : String(err)}`;
    }
  }, [Component]);

  if (!moduleId || !sectionId || !pageId) return null;

  if (!mod || source == null || !key || !Component) {
    return (
      <div className="my-6 rounded-md border border-dashed px-4 py-3 text-sm text-muted-foreground">
        Demo <code className="rounded bg-muted px-1">{name}</code> not found at{' '}
        <code className="rounded bg-muted px-1">{key ?? '(unknown)'}</code>
      </div>
    );
  }

  // 行数足够（> PREVIEW_MAX_LINES）才进入「截断 + View Code 揭开」流；不够就直接全开
  const trimmedSource = source.replace(/\n$/, '');
  const lineCount = trimmedSource.split('\n').length;
  const hasMoreLines = lineCount > PREVIEW_MAX_LINES;
  const sourcePreview = trimmedSource.split('\n').slice(0, PREVIEW_MAX_LINES).join('\n');
  const showFull = isCodeVisible || !hasMoreLines;

  // 工具栏可见时按 view 选展示内容（react 源码 vs IR JSON）；折叠态（View Code 之前）始终给 React 截断片
  const fullCode = view === 'ir' ? irJson : trimmedSource;
  const fullLang = view === 'ir' ? 'json' : 'tsx';
  const displayedCode = showFull ? fullCode : sourcePreview;
  const displayedLang = showFull ? fullLang : 'tsx';
  const displayedLineCount = displayedCode.split('\n').length;

  // 复制逻辑沿用 CodeBlock：useRef 持有 timer，点击重置 + unmount 清；3s 后回到 Copy。
  // 复制内容跟随当前视图（IR 模式复制 IR JSON，React 模式复制源码）
  const handleCopy = () => {
    void navigator.clipboard.writeText(fullCode);
    setCopied(true);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setCopied(false), 3000);
  };

  // 折叠源码区回到 View Code 占位状态：重置所有源码相关 state
  const handleHideAll = () => {
    setIsCodeVisible(false);
    setIsExpanded(false);
    setView('react');
  };

  return (
    <div className="my-6 overflow-hidden rounded-xl border">
      <div className={cn('flex h-72 w-full justify-center p-10', alignClass[align], componentClassName)}>
        <Component />
      </div>
      <div className="relative overflow-hidden border-t bg-muted/50 text-sm">
        {showFull ? (
          <>
            <div className="flex items-center justify-between p-1 px-2">
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant={view === 'react' ? 'outline' : 'ghost'}
                  className={view === 'react' ? '' : 'border border-transparent'}
                  aria-pressed={view === 'react'}
                  aria-label="React source"
                  onClick={() => setView('react')}
                >
                  <ReactIcon className="size-3.5" />
                  React
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={view === 'ir' ? 'outline' : 'ghost'}
                  className={view === 'ir' ? '' : 'border border-transparent'}
                  aria-pressed={view === 'ir'}
                  aria-label="IR JSON"
                  onClick={() => setView('ir')}
                >
                  <JsonIcon className="size-3.5" />
                  IR
                </Button>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label={copied ? 'Copied' : 'Copy'}
                  className="size-7 cursor-pointer rounded-sm text-muted-foreground"
                  onClick={handleCopy}
                >
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                </Button>
                {displayedLineCount > COLLAPSE_THRESHOLD_LINES && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={isExpanded ? 'Collapse' : 'Expand'}
                    className="size-7 cursor-pointer rounded-sm text-muted-foreground"
                    onClick={() => setIsExpanded(prev => !prev)}
                  >
                    {isExpanded ? <ChevronsDownUp className="size-4" /> : <ChevronsUpDown className="size-4" />}
                  </Button>
                )}
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Hide source"
                  className="size-7 cursor-pointer rounded-sm text-muted-foreground"
                  onClick={handleHideAll}
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>
            <Separator className="opacity-40" />
          </>
        ) : null}
        <div className={cn('relative', showFull && !isExpanded && COLLAPSED_CODE_MAX_H)}>
          <HighlightedCode lang={displayedLang} code={displayedCode} showLineNumbers={displayedLineCount >= 10} />
          {!showFull && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(to top, var(--muted), color-mix(in oklab, var(--muted) 60%, transparent), transparent)',
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setIsCodeVisible(true)}
                className="relative z-10 cursor-pointer rounded-lg bg-background text-foreground shadow-none hover:bg-muted dark:bg-background dark:text-foreground dark:hover:bg-muted font-medium"
              >
                View Code
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
