import { globSync, readFileSync } from 'node:fs';

import { WebFontSizePreset } from '@retikz/core';
import { BuiltinEntityRole, GraphStatus } from '@retikz/graph';
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
  it('从公共核心常量读取 WebFontSizePreset 值', () => {
    expect(API_VALUE_REGISTRY.WebFontSizePreset.values).toEqual(Object.values(WebFontSizePreset));
  });

  it('从公共常量中读取 Graph 角色和状态值', () => {
    expect(API_VALUE_REGISTRY.BuiltinEntityRole.values).toEqual(Object.values(BuiltinEntityRole));
    expect(API_VALUE_REGISTRY.GraphStatus.values).toEqual(Object.values(GraphStatus));
  });

  it('为源 MDX 中使用的每个 ApiValues 名称注册非空值', () => {
    const registry = API_VALUE_REGISTRY as Readonly<Record<string, ApiValueRegistryEntry | undefined>>;
    const names = collectSourceMdxApiValueNames();

    expect(names).not.toHaveLength(0);
    expect(Object.keys(API_VALUE_REGISTRY)).toEqual(expect.arrayContaining(names));

    names.forEach(name => {
      expect(registry[name], `${name} is not registered`).toBeDefined();
      expect(registry[name]?.values.length, `${name} has no values`).toBeGreaterThan(0);
    });
  });

  it('呈现可聚焦代码样式的 MDX 触发器', () => {
    expect(mdxComponents.ApiValues).toBe(ApiValues);

    const html = renderToStaticMarkup(<ApiValues name="WebFontSizePreset" />);

    expect(html).toContain('<code');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('WebFontSizePreset');
    expect(html).toContain('cursor-help');
  });

  it('为未知注册表名称呈现诊断回退', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const html = renderToStaticMarkup(<ApiValues name="MissingPreset" />);

    expect(warn).toHaveBeenCalledWith('[ApiValues] value set "MissingPreset" not in API_VALUE_REGISTRY');
    expect(html).toContain('Unknown API values:');
    expect(html).toContain('MissingPreset');

    warn.mockRestore();
  });
});
