import type { FC } from 'react';

import { InlineMdx } from '@/components/shared/mdx-content';
import type { Lang } from '@/i18n';
import type { ChangeItem } from '@/data/changelog.types';

/** label 与 content 的分隔:冒号放在加粗内,收尾 `**` 前不能是空格(否则英文加粗失效) */
const SEP: Record<Lang, string> = { zh: '：', en: ':' };

export type ChangelogItemsProps = {
  items: Array<ChangeItem>;
  lang: Lang;
};

/** 递归渲染变更条目:每条 `**label：** content`(markdown),children 缩进嵌套 */
export const ChangelogItems: FC<ChangelogItemsProps> = ({ items, lang }) => (
  <ul className="ml-5 list-disc space-y-1.5">
    {items.map((item, i) => (
      <li key={i} className="leading-relaxed">
        <InlineMdx source={`**${item.label[lang]}${SEP[lang]}** ${item.content[lang]}`} />
        {item.children?.length ? <ChangelogItems items={item.children} lang={lang} /> : null}
      </li>
    ))}
  </ul>
);
