import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useMdxSource: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'zh' } }),
}));

vi.mock('@/modules/docs/components', () => ({
  ChangelogOverview: () => null,
  ChangelogVersionDetail: () => null,
  InlineMdx: () => null,
  isShowcaseFamilyValue: () => false,
  isShowcaseUsageValue: () => false,
  MdxContent: () => <div>MDX content</div>,
  MdxToc: () => null,
  ShowcaseMetadataBadges: () => null,
}));

vi.mock('@/modules/docs/store', () => ({
  useTocStore: () => false,
}));

vi.mock('@/modules/docs/layout/useDocLocation', () => ({
  useDocLocation: () => ({ moduleId: 'viz', sectionId: 'chart', pageId: 'points', subPageId: 'scatter' }),
}));

vi.mock('@/modules/docs/layout/useDocPageNode', () => ({
  useDocPageNode: () => ({
    section: { id: 'chart', label: 'viz.chart' },
    target: { id: 'scatter', label: 'viz.chartScatter', meta: { layout: 'showcase' } },
  }),
}));

vi.mock('@/modules/docs/layout/useDocPageEffects', () => ({
  useDocPageEffects: () => undefined,
}));

vi.mock('@/modules/docs/layout/useMdxSource', () => ({
  useMdxSource: mocks.useMdxSource,
}));

vi.mock('@/modules/docs/layout/useStableMdxSource', () => ({
  useStableMdxSource: () => ({ stableSource: null, stableSegments: null }),
}));

vi.mock('@/modules/docs/layout/BlogFrontmatter', () => ({ BlogFrontmatter: () => null }));
vi.mock('@/modules/docs/layout/DocPageActions', () => ({ DocPageActions: () => null }));
vi.mock('@/modules/docs/layout/DocPageFooterNav', () => ({ DocPageFooterNav: () => null }));

import { DocPage } from '@/modules/docs/layout';

describe('<DocPage> MDX source errors', () => {
  beforeEach(() => {
    mocks.useMdxSource.mockReturnValue({
      source: null,
      segments: null,
      isLoading: false,
      notFound: false,
      resolvedLang: 'zh',
      error: 'Unknown MDX include "viz/chart/shared-api"',
    });
  });

  it('shows the current page load error instead of rendering incomplete MDX', () => {
    const html = renderToStaticMarkup(<DocPage />);

    expect(html).toContain('role="alert"');
    expect(html).toContain('Unknown MDX include &quot;viz/chart/shared-api&quot;');
    expect(html).not.toContain('MDX content');
  });
});
