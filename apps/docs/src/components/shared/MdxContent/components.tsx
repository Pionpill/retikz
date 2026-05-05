/* eslint-disable react-refresh/only-export-components -- 此文件导出 MDX 元素映射表（对象），不是 fast-refresh 边界 */
import { cn } from '@/lib/utils';
import type { MDXComponents } from 'mdx/types';
import type { ComponentPropsWithoutRef, FC } from 'react';
import { Link } from 'react-router';
import { CodeBlock } from './CodeBlock';

const linkClass = 'font-medium underline underline-offset-4';

const A: FC<ComponentPropsWithoutRef<'a'>> = ({ href, className, children, ...rest }) => {
  if (href && href.startsWith('/')) {
    return (
      <Link to={href} className={cn(linkClass, className)} {...rest}>
        {children}
      </Link>
    );
  }
  if (href && /^https?:\/\//i.test(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cn(linkClass, className)} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <a href={href} className={cn(linkClass, className)} {...rest}>
      {children}
    </a>
  );
};

/** 围栏代码块走 CodeBlock 组件（react-syntax-highlighter）；行内裸 `<code>` 用 shadcn neutral 样式 */
const Code: FC<ComponentPropsWithoutRef<'code'>> = ({ className, children, ...rest }) => {
  const codeStr = typeof children === 'string' ? children : '';
  const langMatch = typeof className === 'string' ? /language-(\w+)/.exec(className) : null;
  const isBlock = !!langMatch || codeStr.includes('\n');

  if (isBlock) {
    return <CodeBlock lang={langMatch?.[1] ?? 'text'} code={codeStr} />;
  }

  return (
    <code
      className={cn(
        'relative rounded-md bg-muted px-[0.3rem] py-[0.2rem] font-mono text-[0.8rem] break-words outline-none',
        className,
      )}
      {...rest}
    >
      {children}
    </code>
  );
};

export const mdxComponents: MDXComponents = {
  h1: ({ className, ...props }) => (
    <h1 className={cn('mt-2 scroll-m-28 text-3xl font-bold tracking-tight', className)} {...props} />
  ),
  h2: ({ className, ...props }) => (
    <h2
      className={cn(
        'mt-10 scroll-m-28 text-xl font-medium tracking-tight first:mt-0 lg:mt-12',
        className,
      )}
      {...props}
    />
  ),
  h3: ({ className, ...props }) => (
    <h3 className={cn('mt-12 scroll-m-28 text-lg font-medium tracking-tight', className)} {...props} />
  ),
  h4: ({ className, ...props }) => (
    <h4 className={cn('mt-8 scroll-m-28 text-base font-medium tracking-tight', className)} {...props} />
  ),
  h5: ({ className, ...props }) => (
    <h5 className={cn('mt-8 scroll-m-28 text-base font-medium tracking-tight', className)} {...props} />
  ),
  h6: ({ className, ...props }) => (
    <h6 className={cn('mt-8 scroll-m-28 text-base font-medium tracking-tight', className)} {...props} />
  ),
  a: A,
  p: ({ className, ...props }) => (
    <p className={cn('leading-relaxed [&:not(:first-child)]:mt-6', className)} {...props} />
  ),
  strong: ({ className, ...props }) => <strong className={cn('font-medium', className)} {...props} />,
  ul: ({ className, ...props }) => <ul className={cn('my-6 ml-6 list-disc', className)} {...props} />,
  ol: ({ className, ...props }) => <ol className={cn('my-6 ml-6 list-decimal', className)} {...props} />,
  li: ({ className, ...props }) => <li className={cn('mt-2', className)} {...props} />,
  blockquote: ({ className, ...props }) => (
    <blockquote className={cn('mt-6 border-l-2 pl-6 italic', className)} {...props} />
  ),
  hr: ({ className, ...props }) => <hr className={cn('my-4 md:my-8', className)} {...props} />,
  img: ({ className, alt, ...props }) => (
    <img className={cn('rounded-md', className)} alt={alt ?? ''} {...props} />
  ),
  // 围栏代码块的 pre 透传 children —— children 经 code mapper 已替换成 CodeBlock，
  // 后者自带 pre/code，再外包一层会变成双 pre 嵌套。
  pre: ({ children }) => <>{children}</>,
  code: Code,
  table: ({ className, ...props }) => (
    <div className="my-6 w-full overflow-x-auto rounded-xl border">
      <table
        className={cn(
          'relative w-full overflow-hidden border-none text-sm [&_tbody_tr:last-child]:border-b-0',
          className,
        )}
        {...props}
      />
    </div>
  ),
  tr: ({ className, ...props }) => <tr className={cn('m-0 border-b', className)} {...props} />,
  th: ({ className, ...props }) => (
    <th
      className={cn(
        'px-4 py-2 text-left font-bold [&[align=center]]:text-center [&[align=right]]:text-right',
        className,
      )}
      {...props}
    />
  ),
  td: ({ className, ...props }) => (
    <td
      className={cn(
        'px-4 py-2 text-left whitespace-nowrap [&[align=center]]:text-center [&[align=right]]:text-right',
        className,
      )}
      {...props}
    />
  ),
};
