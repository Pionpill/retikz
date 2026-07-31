import { describe, expect, it, vi } from 'vitest';

import { getNextLanguage, supportedLanguages } from '../src/playground/i18n/preferences';
import { applyThemeToRoot, defaultTheme } from '../src/playground/store/theme-model';

describe('Bench workspace preferences', () => {
  it('只在中英文之间循环切换', () => {
    expect(supportedLanguages).toEqual(['zh', 'en']);
    expect(getNextLanguage('zh')).toBe('en');
    expect(getNextLanguage('en')).toBe('zh');
  });

  it('默认使用与 docs 一致的亮色主题', () => {
    expect(defaultTheme).toBe('light');
  });

  it('通过根节点 dark class 应用主题', () => {
    const toggle = vi.fn();
    applyThemeToRoot('dark', { classList: { toggle } });
    expect(toggle).toHaveBeenCalledWith('dark', true);

    applyThemeToRoot('light', { classList: { toggle } });
    expect(toggle).toHaveBeenLastCalledWith('dark', false);
  });
});
