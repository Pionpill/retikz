import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import { Check, ChevronsDownUp, ChevronsUpDown, Copy } from 'lucide-react';
import type { ComponentType, FC } from 'react';
import { useEffect, useRef, useState } from 'react';
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
const demoModules: Record<string, { default: ComponentType } | undefined> = import.meta.glob<{
  default: ComponentType;
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

/** 源码视图切换：React 源码 / IR JSON（IR 切换的具体逻辑后续接入） */
type SourceView = 'react' | 'ir';

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
  // hooks 必须无条件先于 early return 调用
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

  if (!moduleId || !sectionId || !pageId) return null;
  const segments = subPageId ? [moduleId, sectionId, pageId, subPageId] : [moduleId, sectionId, pageId];
  const key = buildKey(segments, name);
  const mod = demoModules[key];
  const source = demoSources[key];

  if (!mod || source == null) {
    return (
      <div className="my-6 rounded-md border border-dashed px-4 py-3 text-sm text-muted-foreground">
        Demo <code className="rounded bg-muted px-1">{name}</code> not found at{' '}
        <code className="rounded bg-muted px-1">{key}</code>
      </div>
    );
  }

  const Component = mod.default;
  // 行数足够（> PREVIEW_MAX_LINES）才进入「截断 + View Code 揭开」流；不够就直接全开
  const trimmedSource = source.replace(/\n$/, '');
  const lineCount = trimmedSource.split('\n').length;
  const hasMoreLines = lineCount > PREVIEW_MAX_LINES;
  const sourcePreview = trimmedSource.split('\n').slice(0, PREVIEW_MAX_LINES).join('\n');
  const showFull = isCodeVisible || !hasMoreLines;

  // 复制逻辑沿用 CodeBlock：useRef 持有 timer，点击重置 + unmount 清；3s 后回到 Copy
  const handleCopy = () => {
    void navigator.clipboard.writeText(trimmedSource);
    setCopied(true);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="my-6 overflow-hidden rounded-xl border">
      <div className={cn('flex h-72 w-full justify-center p-10', alignClass[align], componentClassName)}>
        <Component />
      </div>
      <div className="relative overflow-hidden border-t bg-muted/50 text-sm">
        {showFull ? (
          <>
            <div className="flex items-center justify-between p-1">
              <ToggleGroup
                type="single"
                value={view}
                onValueChange={v => {
                  if (v) setView(v as SourceView);
                }}
                size="sm"
              >
                <ToggleGroupItem value="react">React</ToggleGroupItem>
                <ToggleGroupItem value="ir">IR</ToggleGroupItem>
              </ToggleGroup>
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
                {lineCount > COLLAPSE_THRESHOLD_LINES && (
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
              </div>
            </div>
            <Separator className="opacity-40" />
          </>
        ) : null}
        <div className={cn('relative', showFull && !isExpanded && COLLAPSED_CODE_MAX_H)}>
          <HighlightedCode
            lang="tsx"
            code={showFull ? trimmedSource : sourcePreview}
            showLineNumbers={lineCount >= 10}
          />
          {!showFull && (
            <div className="absolute inset-0 flex items-center justify-center pb-4">
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
