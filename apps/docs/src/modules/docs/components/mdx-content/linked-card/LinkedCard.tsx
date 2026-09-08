import type { FC, ReactNode } from 'react';

import { Link } from 'react-router';

import { cn } from '@/lib';

export type LinkedCardProps = {
  className?: string;
  href: string;
  children?: ReactNode;
};

const linkedCardClass =
  'flex w-full flex-col items-center rounded-xl bg-muted p-6 text-foreground no-underline transition-colors hover:bg-muted/80 sm:p-10';

/** 文档内的卡片化链接。 */
export const LinkedCard: FC<LinkedCardProps> = props => {
  const { className, href, children } = props;

  if (/^https?:\/\//i.test(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cn(linkedCardClass, className)}>
        {children}
      </a>
    );
  }

  return (
    <Link to={href} className={cn(linkedCardClass, className)}>
      {children}
    </Link>
  );
};
