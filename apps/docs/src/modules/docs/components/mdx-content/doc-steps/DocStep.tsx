import type { FC, ReactNode } from 'react';

/** 单个文档步骤属性 */
export type DocStepProps = {
  /** 局部步骤标题，不进入页面目录 */
  title: string;
  /** 步骤正文 */
  children: ReactNode;
};

/** 带序号和连接线的阅读步骤 */
export const DocStep: FC<DocStepProps> = props => {
  const { title, children } = props;
  return (
    <li className="relative min-w-0 pb-8 pl-11 [counter-increment:doc-step] last:pb-0 before:absolute before:top-8 before:bottom-0 before:left-3.5 before:border-l before:border-border">
      <span
        aria-hidden="true"
        className="absolute top-0 left-0 flex size-7 items-center justify-center rounded-full bg-muted text-xs font-medium ring-4 ring-background before:content-[counter(doc-step)]"
      />
      <div className="min-h-7 text-base leading-7 font-semibold">{title}</div>
      <div className="mt-3 min-w-0 text-sm leading-7 [&>p]:leading-7 [&>p+p]:mt-3 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
        {children}
      </div>
    </li>
  );
};
