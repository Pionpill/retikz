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
 * Changelog 条目：左列上下叠"发布时刻 chip + 受影响包名（纯文字）"，右列纯 mdx 正文。
 * 不再画时间线竖条 / 圆点 —— 只是 2 列 grid 的对齐排版。
 *
 * - 左列固定 8rem，能容下 `@retikz/react` 这类双段 monospace 包名
 * - 日期是 chip（border + bg-muted），强调时刻；包名是纯 muted 文字，避免一堆 chip 视觉嘈杂
 * - 内部 children 直接走 mdxComponents 渲染：第一个 h2/h3 自带 first:mt-0，无需覆盖
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
