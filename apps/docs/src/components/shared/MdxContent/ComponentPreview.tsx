import { cn } from '@/lib/utils';
import type { ComponentType, FC } from 'react';
import { useParams } from 'react-router';
import { HighlightedCode } from './HighlightedCode';

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

export type ComponentPreviewProps = {
  /** demo 文件名（不含 `.demo.tsx` 后缀），相对当前 mdx 同级目录解析 */
  name: string;
  /** 渲染区垂直对齐，默认 center */
  align?: keyof typeof alignClass;
};

/** MDX 内的"渲染 + 源码"演示卡 */
export const ComponentPreview: FC<ComponentPreviewProps> = props => {
  const { name, align = 'center' } = props;

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

  return (
    <div className="my-6 overflow-hidden rounded-xl border">
      <div className={cn('flex h-72 w-full justify-center p-10', alignClass[align])}>
        <Component />
      </div>
      <div className="border-t bg-muted/50 text-sm [&_pre]:max-h-96 [&_pre]:overflow-y-auto">
        <HighlightedCode lang="tsx" code={source} />
      </div>
    </div>
  );
};
