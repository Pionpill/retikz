import type { FC, ReactNode } from 'react';

import { Link } from 'react-router';

import { cn } from '@/lib';

export type LinkedCardProps = {
  className?: string;
  /** 跳转地址，省略时展示为普通卡片 */
  href?: string;
  /** 标题前的装饰图标，省略时不占位 */
  icon?: ReactNode;
  children?: ReactNode;
};

const linkedCardClass =
  'flex w-full flex-col items-center rounded-xl bg-muted p-6 text-foreground no-underline sm:p-10';

/** 文档内可选链接的展示卡片 */
export const LinkedCard: FC<LinkedCardProps> = props => {
  const { className, href, icon, children } = props;
  const cardClassName = cn(
    linkedCardClass,
    href != null && 'transition-colors hover:bg-muted/80',
    icon != null && 'grid grid-cols-[auto_1fr] content-start gap-x-3 [&>:nth-child(n+3)]:col-span-2',
    className,
  );
  const content = (
    <>
      {icon != null && (
        <span aria-hidden="true" className="self-center text-muted-foreground [&_svg]:size-5">
          {icon}
        </span>
      )}
      {children}
    </>
  );

  if (href == null) return <div className={cardClassName}>{content}</div>;

  if (/^https?:\/\//i.test(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cardClassName}>
        {content}
      </a>
    );
  }

  return (
    <Link to={href} className={cardClassName}>
      {content}
    </Link>
  );
};
