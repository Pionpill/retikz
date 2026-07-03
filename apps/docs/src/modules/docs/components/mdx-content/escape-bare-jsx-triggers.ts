/** 给代码段外的裸 `<` / `{` / `}` 加反斜杠转义。 */
export const escapeBareJsxTriggers = (source: string): string =>
  source
    .split(/(`[^`]*`)/)
    .map((part, i) => (i % 2 === 0 ? part.replace(/[<{}]/g, m => `\\${m}`) : part))
    .join('');
