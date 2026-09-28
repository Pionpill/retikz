import { describe, expect, it } from 'vitest';

import { layoutComponentApiReferenceConfigs } from '../../scripts/api-reference/layout-components';
import { createApiReferenceMdx } from '../../scripts/api-reference/tex';

describe('布局组件 API 参考', () => {
  it.each(['zh', 'en'] as const)(
    '从公开 React 入口生成 %s 子项分支、说明与 Schema 默认值',
    async lang => {
      const config = layoutComponentApiReferenceConfigs('FlexLayout').find(
        entry => entry.packageName === '@retikz/layout-react',
      );
      expect(config).toBeDefined();
      const source = await createApiReferenceMdx(config!, lang);
      expect(source).toContain('### FlexLayout / FlexLayoutProps');
      expect(source).toContain('### FlexLayoutItem / FlexLayoutItemProps');
      expect(source).not.toContain('### GridLayout /');
      expect(source).toContain('<DocTab value="jsx"');
      expect(source).toContain('<DocTab value="ir"');
      expect(source).toMatch(/\| `grow\?` \| `number` \| `0` \| [^—\n]+ \|/);
      expect(source).toMatch(/\| `shrink\?` \| `number` \| `1` \| [^—\n]+ \|/);
      expect(source).toMatch(/\| `readonly itemKey\?` \| `string` \| — \| [^—\n]+ \|/);
      if (lang === 'en') expect(source).not.toMatch(/[\u3400-\u9fff]/u);
    },
    120_000,
  );
});
