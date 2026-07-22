import { WebFontSizePreset } from '@retikz/core';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { API_VALUE_REGISTRY, ApiValues } from '@/modules/docs/components/mdx-content/api-values';
import { mdxComponents } from '@/modules/docs/components/mdx-content/components';

describe('<ApiValues>', () => {
  it('reads WebFontSizePreset values from the public core constant', () => {
    expect(API_VALUE_REGISTRY.WebFontSizePreset.values).toEqual(Object.values(WebFontSizePreset));
  });

  it('renders a focusable code-styled MDX trigger', () => {
    expect(mdxComponents.ApiValues).toBe(ApiValues);

    const html = renderToStaticMarkup(<ApiValues name="WebFontSizePreset" />);

    expect(html).toContain('<code');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('WebFontSizePreset');
    expect(html).toContain('cursor-help');
  });

  it('renders a diagnostic fallback for an unknown registry name', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const html = renderToStaticMarkup(<ApiValues name="MissingPreset" />);

    expect(warn).toHaveBeenCalledWith('[ApiValues] value set "MissingPreset" not in API_VALUE_REGISTRY');
    expect(html).toContain('Unknown API values:');
    expect(html).toContain('MissingPreset');
    warn.mockRestore();
  });
});
