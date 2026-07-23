import { WebFontSizePreset } from '@retikz/core';
import { globSync, readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { ApiValueRegistryEntry } from '@/modules/docs/components/mdx-content/api-values';

import { API_VALUE_REGISTRY, ApiValues } from '@/modules/docs/components/mdx-content/api-values';
import { mdxComponents } from '@/modules/docs/components/mdx-content/components';

const API_VALUES_PATTERN = /<ApiValues\s+name="([^"]+)"\s*\/>/g;

/** 扫描网页 source MDX 中引用的全部 API 值集合名 */
const collectSourceMdxApiValueNames = (): Array<string> => {
  const names = globSync('src/modules/docs/contents/**/*.mdx').flatMap(filePath => {
    const source = readFileSync(filePath, 'utf8');
    return Array.from(source.matchAll(API_VALUES_PATTERN), match => match[1]);
  });

  return Array.from(new Set(names)).sort();
};

describe('<ApiValues>', () => {
  it('reads WebFontSizePreset values from the public core constant', () => {
    expect(API_VALUE_REGISTRY.WebFontSizePreset.values).toEqual(Object.values(WebFontSizePreset));
  });

  it('registers non-empty values for every ApiValues name used in source MDX', () => {
    const registry = API_VALUE_REGISTRY as Readonly<Record<string, ApiValueRegistryEntry | undefined>>;
    const names = collectSourceMdxApiValueNames();

    expect(names).not.toHaveLength(0);
    expect(Object.keys(API_VALUE_REGISTRY).sort()).toEqual(names);
    names.forEach(name => {
      expect(registry[name], `${name} is not registered`).toBeDefined();
      expect(registry[name]?.values.length, `${name} has no values`).toBeGreaterThan(0);
    });
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
