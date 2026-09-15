import type { FC, ReactNode } from 'react';

import { TabsContent } from '@/components/ui/tabs';

/** 单个方案面板 */
export type DocTabProps = {
  /** 与标签关联的唯一标识 */
  value: string;
  /** 当前语言的标签 */
  label: string;
  /** 面板正文 */
  children: ReactNode;
};

/** 直接承载 MDX 正文的方案面板 */
export const DocTab: FC<DocTabProps> = props => {
  const { value, children } = props;
  return (
    <TabsContent value={value} className="min-w-0 pt-6 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
      {children}
    </TabsContent>
  );
};
