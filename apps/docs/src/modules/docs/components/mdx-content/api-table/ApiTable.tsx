import type { FC, ReactNode } from 'react';

import { cn } from '@/lib';

/** API 参考表的内容形态，表格本身仍由 MDX 渲染 */
export type ApiTableProps = {
  /** 属性、方法签名或函数调用契约 */
  variant?: 'members' | 'methods' | 'parameters';
  /** 成员表是否包含用途分组列 */
  grouped?: boolean;
  /** Markdown 表格 */
  children: ReactNode;
};

/** 集中管理 API 表格的列宽与换行，不影响普通正文表格 */
export const ApiTable: FC<ApiTableProps> = props => {
  const { variant = 'members', grouped = false, children } = props;
  const columns =
    variant === 'methods'
      ? grouped
        ? '[&_th:nth-child(1)]:w-[10%] [&_th:nth-child(2)]:w-[20%] [&_th:nth-child(3)]:w-[40%]'
        : '[&_th:nth-child(1)]:w-[22%] [&_th:nth-child(2)]:w-[44%]'
      : grouped
        ? '[&_th:nth-child(1)]:w-[10%] [&_th:nth-child(2)]:w-[20%] [&_th:nth-child(3)]:w-[24%] [&_th:nth-child(4)]:w-[14%]'
        : '[&_th:nth-child(1)]:w-[22%] [&_th:nth-child(2)]:w-[28%] [&_th:nth-child(3)]:w-[14%]';
  return (
    <div
      className={cn(
        '[&>div:first-child]:mt-0 [&>div:last-child]:mb-0',
        variant === 'parameters'
          ? '[&_td:first-child]:whitespace-nowrap'
          : [
              '[&_table]:table-fixed [&_th]:whitespace-normal [&_th]:px-2 [&_td]:px-2 [&_td]:align-top [&_td]:[overflow-wrap:anywhere] [&_code]:whitespace-normal',
              grouped ? '[&_table]:min-w-[40rem]' : '[&_table]:min-w-[36rem]',
              columns,
            ],
      )}
    >
      {children}
    </div>
  );
};
