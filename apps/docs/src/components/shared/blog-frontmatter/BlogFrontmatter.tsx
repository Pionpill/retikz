import type { FC } from 'react';

export type BlogFrontmatterProps = {
  /** 发布日期，ISO 串（YYYY-MM-DD） */
  date?: string;
  /** 标签数组，可缺省 */
  tags?: Array<string>;
};

/**
 * 博客文章正文上方的元数据条：日期 + 标签 chips
 * @description 纯 Tailwind 实现，不引入 shadcn vendored 组件，避免新依赖与 dev pre-bundle 抖动
 */
export const BlogFrontmatter: FC<BlogFrontmatterProps> = props => {
  const { date, tags } = props;
  if (!date && (!tags || tags.length === 0)) return null;
  return (
    <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      {date && <time dateTime={date}>{date}</time>}
      {tags?.map(tag => (
        <span
          key={tag}
          className="inline-flex items-center rounded-md border border-border bg-secondary px-2 py-0.5 text-xs font-normal text-secondary-foreground"
        >
          {tag}
        </span>
      ))}
    </div>
  );
};
