/**
 * 给代码段外的裸 `<` / `{` / `}` 加反斜杠转义
 * @description CommonMark 中 `\<` / `\{` / `\}` 是 ASCII punctuation 转义，渲染回字面量，
 *   避免 MDX 把 `<Tag>` 当 JSX、把 `{expr}` 当表达式解析（changelog/frontmatter 类短文本里
 *   常出现 `{ x, y, width, height }` 这种字面对象描述，曾在渲染期抛 "x is not defined"）
 */
export const escapeBareJsxTriggers = (source: string): string =>
  source
    .split(/(`[^`]*`)/)
    .map((part, i) => (i % 2 === 0 ? part.replace(/[<{}]/g, m => `\\${m}`) : part))
    .join('');
