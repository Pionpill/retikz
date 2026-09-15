import type { FC, ReactNode } from 'react';

/** 组合式步骤列表属性 */
export type DocStepsProps = {
  /** 直接放置 DocStep，自动从 1 编号，正文由所在 MDX 页面编译 */
  children: ReactNode;
};

/** 全部展开的有序教程，不维护完成状态 */
export const DocSteps: FC<DocStepsProps> = props => {
  const { children } = props;
  return (
    <ol role="list" className="my-6 min-w-0 list-none p-0 [counter-reset:doc-step]">
      {children}
    </ol>
  );
};
