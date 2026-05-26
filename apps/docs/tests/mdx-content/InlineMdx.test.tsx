import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { InlineMdx } from '@/components/shared/mdx-content/InlineMdx';
import { escapeBareJsxTriggers } from '@/components/shared/mdx-content/escapeBareJsxTriggers';

describe('escapeBareJsxTriggers', () => {
  it('代码段外裸 `<` 转义成 `\\<`（保留行为）', () => {
    expect(escapeBareJsxTriggers('see <Tag>')).toBe('see \\<Tag>');
  });

  it('代码段外裸 `{` / `}` 转义成 `\\{` / `\\}`（changelog `{ x, y }` 这类字面对象）', () => {
    expect(escapeBareJsxTriggers('（{ x, y, width, height }）')).toBe(
      '（\\{ x, y, width, height \\}）',
    );
  });

  it('反引号 code span 内的 `<` / `{` / `}` 一律不动', () => {
    expect(escapeBareJsxTriggers('a `<Tag>` and `{ x: 1 }` b')).toBe(
      'a `<Tag>` and `{ x: 1 }` b',
    );
  });

  it('混合：code span 内保持，外面 `<` / `{` 都转义', () => {
    expect(
      escapeBareJsxTriggers('use `<Tag>` not `{x}`; bare {y} or <X> blow up'),
    ).toBe('use `<Tag>` not `{x}`; bare \\{y\\} or \\<X> blow up');
  });
});

describe('<InlineMdx> 渲染（回归）', () => {
  it('prose 含裸 `{ x, y, width, height }` 不抛错，文本字面保留', () => {
    const html = renderToStaticMarkup(
      <InlineMdx source="IR root gains optional `viewBox` ({ x, y, width, height }); fine." />,
    );
    expect(html).toContain('x, y, width, height');
    expect(html).toContain('<p');
  });
});
