import type { FC } from 'react';

import { LinkedCard } from '../linked-card';

export type LinkedSectionItem = {
  title: string;
  description: string;
  url: string;
};

export type LinkedSectionsProps = {
  items: Array<LinkedSectionItem>;
};

/** 以统一的响应式网格呈现文档章节入口。 */
export const LinkedSections: FC<LinkedSectionsProps> = props => {
  const { items } = props;

  return (
    <div data-linked-sections className="my-6 grid grid-cols-[repeat(auto-fit,minmax(min(100%,250px),1fr))] gap-4">
      {items.map(item => (
        <LinkedCard key={item.url} href={item.url} className="max-w-[400px]">
          <span className="font-semibold">{item.title}</span>
          <span className="mt-1 text-center text-sm text-muted-foreground">{item.description}</span>
        </LinkedCard>
      ))}
    </div>
  );
};
