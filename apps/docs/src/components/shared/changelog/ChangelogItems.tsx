import type { ComponentPropsWithoutRef, FC } from 'react';

import { InlineMdx } from '@/components/shared/mdx-content';
import type { Lang } from '@/i18n';
import type { ChangeItem } from '@/data/changelog.types';
import { cn } from '@/lib/utils';

/** label 与 content 的分隔 */
const SEP: Record<Lang, string> = { zh: '：', en: ':' };

const contentComponents = {
  strong: ({ className, ...props }: ComponentPropsWithoutRef<'strong'>) => (
    <strong className={cn('font-normal', className)} {...props} />
  ),
};

const hasBlockContent = (source: string): boolean => /(^|\n)(```|[-*]\s|#{1,3}\s)/.test(source);

export type ChangelogItemsProps = {
  items: Array<ChangeItem>;
  lang: Lang;
};

/** 递归渲染变更条目:label 独立加粗,content 以普通正文渲染,children 缩进嵌套 */
export const ChangelogItems: FC<ChangelogItemsProps> = ({ items, lang }) => (
  <ul className="ml-5 list-disc space-y-1.5">
    {items.map((item, i) => {
      const content = item.content[lang];
      const blockContent = hasBlockContent(content);
      return (
        <li key={i} className={cn('leading-relaxed', blockContent && 'space-y-1.5')}>
          <span className="font-medium">{item.label[lang]}{SEP[lang]}</span>
          {blockContent ? (
            <InlineMdx
              source={content}
              className="text-foreground/85"
              components={contentComponents}
            />
          ) : (
            <>
              {' '}
              <InlineMdx
                source={content}
                className="inline text-foreground/85"
                components={contentComponents}
              />
            </>
          )}
          {item.children?.length ? <ChangelogItems items={item.children} lang={lang} /> : null}
        </li>
      );
    })}
  </ul>
);
