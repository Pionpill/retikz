/**
 * 反查最近的前置 heading：从当前节点出发往左找兄弟，找不到就上一层继续。
 * @description MDX 渲染产物里 ComponentPreview 卡和 h2/h3 标题是同级兄弟节点；找不到时返回 null。
 */
export const findPrecedingHeading = (el: HTMLElement | null): HTMLElement | null => {
  if (!el) return null;
  let sib: Element | null = el.previousElementSibling;
  while (sib) {
    if (/^H[1-6]$/.test(sib.tagName)) return sib as HTMLElement;
    sib = sib.previousElementSibling;
  }
  return el.parentElement ? findPrecedingHeading(el.parentElement) : null;
};

/** 构造 Ask AI 默认提问文案。 */
export const buildAskAiPrompt = (lang: 'zh' | 'en', pageTitle: string, heading: string, demoName: string): string => {
  if (lang === 'en') {
    const ref = heading ? `the "${heading}" section of ${pageTitle}` : pageTitle;
    return `Based on ${ref}, walk me through the \`${demoName}\` example:

- Implementation rationale + key retikz APIs used
- How could I modify or extend it`;
  }
  const ref = heading ? `${pageTitle}「${heading}」小节` : pageTitle;
  return `请基于${ref}里的 \`${demoName}\` 示例：

- 解释它的实现思路 + 关键 retikz API 用法
- 可以怎么改 / 怎么扩展`;
};
