import { describe, expect, it } from 'vitest';

import { resolveDocPagePresentation } from '@/modules/docs/layout';

describe('resolveDocPagePresentation', () => {
  it('保留 Article 的 800px 正文与标题目录', () => {
    expect(
      resolveDocPagePresentation({
        layout: 'article',
        source: '## Details\n\nBody',
        isChangelog: false,
      }),
    ).toEqual({ contentClassName: 'max-w-200', hasToc: true });
  });

  it('Article 没有标题时不占用目录栏', () => {
    expect(resolveDocPagePresentation({ layout: 'article', source: 'Body only', isChangelog: false })).toEqual({
      contentClassName: 'max-w-200',
      hasToc: false,
    });
  });

  it('Showcase 使用 1200px 内容边界且始终关闭目录', () => {
    expect(
      resolveDocPagePresentation({
        layout: 'showcase',
        source: '## API\n\nBody',
        isChangelog: false,
      }),
    ).toEqual({ contentClassName: 'max-w-[1200px]', hasToc: false });
  });

  it('更新日志继续使用 Article 宽度且没有目录', () => {
    expect(resolveDocPagePresentation({ layout: 'article', source: '## Release', isChangelog: true })).toEqual({
      contentClassName: 'max-w-200',
      hasToc: false,
    });
  });
});
