import { RetikzFoundationError, RetikzFoundationErrorCode } from '@retikz/foundation';
import { describe, expect, it } from 'vitest';

import { RetikzCoreError, RetikzCoreErrorCode, ThemeMode } from '../../src';
import { resolveContextualColor } from '../../src/resolve/style/contextual-color';

describe('resolveContextualColor', () => {
  it('保留显式字符串，不要求主色可静态解析', () => {
    expect(
      resolveContextualColor('var(--exact-color)', {
        masterColor: 'currentColor',
        mode: ThemeMode.Light,
        fieldPath: 'children[0].node.fill',
      }),
    ).toBe('var(--exact-color)');
  });

  it.each([
    [ThemeMode.Light, '#d6e0eb'],
    [ThemeMode.Dark, '#0a141f'],
  ] as const)('按 %s Theme backdrop 从静态主色解析不透明颜色', (mode, expected) => {
    expect(
      resolveContextualColor(0.2, {
        masterColor: '#336699',
        mode,
        fieldPath: 'children[0].node.fill',
      }),
    ).toBe(expected);
  });

  it('缺少主色时抛出含精确字段路径的 Core color error', () => {
    expect.assertions(5);
    try {
      resolveContextualColor(0.2, {
        mode: ThemeMode.Light,
        fieldPath: 'children[1].path.stroke',
      });
    } catch (thrown) {
      expect(thrown).toBeInstanceOf(RetikzCoreError);
      const error = thrown as RetikzCoreError;
      expect(error.code).toBe(RetikzCoreErrorCode.Color);
      expect(error.message).toContain('children[1].path.stroke');
      expect(error.details).toMatchObject({ fieldPath: 'children[1].path.stroke' });
      expect(error.cause).toBeUndefined();
    }
  });

  it('动态主色失败时保留字段路径与 Foundation cause', () => {
    expect.assertions(8);
    try {
      resolveContextualColor(0.2, {
        masterColor: 'currentColor',
        mode: ThemeMode.Dark,
        fieldPath: 'children[0].node.textColor',
      });
    } catch (thrown) {
      expect(thrown).toBeInstanceOf(RetikzCoreError);
      const error = thrown as RetikzCoreError;
      expect(error.code).toBe(RetikzCoreErrorCode.Color);
      expect(error.message).toContain('children[0].node.textColor');
      expect(error.details).toMatchObject({
        fieldPath: 'children[0].node.textColor',
        masterColor: 'currentColor',
      });
      expect(error.cause).toBeInstanceOf(RetikzFoundationError);
      const cause = error.cause as RetikzFoundationError;
      expect(cause.code).toBe(RetikzFoundationErrorCode.Color);
      expect(cause.details).toEqual({ input: 'foreground', value: 'currentColor' });
      expect(cause.cause).toBeUndefined();
    }
  });
});
