import type { FC, ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type UpdateProps = {
  /** 左侧时间标签：日期、日期范围、或"开发中"等占位文字 */
  label: string;
  /** 顶部 chip 列表：通常列受影响的子包名 / 标签 */
  tags?: Array<string>;
  className?: string;
  children?: ReactNode;
};

/**
 * Changelog 条目（2 列 grid）
 * @description 左列固定 8rem（容得下 `@retikz/react` 双段 monospace 包名），上下叠"日期 chip + 受影响包名（muted 纯文字，避免一堆 chip 视觉嘈杂）"；右列纯 mdx 正文走 mdxComponents 渲染
 */
export const Update: FC<UpdateProps> = ({ label, tags, className, children }) => (
  <div className={cn('group/update grid grid-cols-[8rem_1fr] gap-6 pb-10 last:pb-0 first:pt-0', className)}>
    <div className="flex flex-col gap-2 pt-1">
      <span className="self-start rounded-md border bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-foreground/80">
        {label}
      </span>
      {tags && tags.length > 0 ? (
        <div className="flex flex-col items-start gap-0.5">
          {tags.map(tag => (
            <span key={tag} className="font-mono text-xs leading-relaxed text-muted-foreground">
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </div>
    <div className="flex min-w-0 flex-col">{children}</div>
  </div>
);
