import type { CanonicalTheme } from '@retikz/core';
import { DEFAULT_RESOLVED_THEME, ThemeMode } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import type { DiagramThemeDefinition } from '../src/_diagram';
import {
  DiagramDefaultsSchema,
  getDefaultDiagramTheme,
  resolveDiagramDefinitionOptions,
  resolveDiagramTheme,
  resolveDiagramThemeRegistry,
} from '../src/_diagram';
import { RetikzDiagramError, RetikzDiagramErrorCode } from '../src/errors';

const themeWith = (overrides: Partial<CanonicalTheme>): CanonicalTheme => ({
  ...DEFAULT_RESOLVED_THEME,
  ...overrides,
});

const registryOf = (
  ...definitions: ReadonlyArray<DiagramThemeDefinition>
): ReadonlyMap<string, DiagramThemeDefinition> => resolveDiagramThemeRegistry(definitions);

describe('Diagram 主题 Definition 和注册表', () => {
  it('将 Definition 选项解析到共享只读样式注册表中', () => {
    const definition = {
      name: 'brand',
      resolve: () => ({ presentation: { title: { style: { textColor: '#123456' } } } }),
    } satisfies DiagramThemeDefinition;

    const resolved = resolveDiagramDefinitionOptions({ diagramThemeDefinitions: [definition] });

    expect(resolved.diagramThemeDefinitions).toBeInstanceOf(Map);
    expect(resolved.diagramThemeDefinitions.get('brand')).toBe(definition);
    expect(resolveDiagramDefinitionOptions().diagramThemeDefinitions.size).toBe(0);
  });

  it('使用 Diagram 拥有的诊断拒绝重复的 Definition 名称', () => {
    const first = {
      name: 'brand',
      resolve: () => ({ presentation: { title: { style: { opacity: 1 } } } }),
    } satisfies DiagramThemeDefinition;
    const second = {
      name: 'brand',
      resolve: () => ({ presentation: { description: { style: { opacity: 1 } } } }),
    } satisfies DiagramThemeDefinition;

    for (const run of [() => resolveDiagramThemeRegistry([first, second])]) {
      try {
        run();

        expect.unreachable('Expected a Diagram registry error');
      } catch (error) {
        if (!(error instanceof RetikzDiagramError)) throw error;

        expect(error.details).toMatchObject({ capability: 'diagram-theme' });

        if (error.code === RetikzDiagramErrorCode.DefinitionDuplicate) {
          expect(error.details).toMatchObject({ key: 'brand', availableKeys: ['brand'] });
        }
      }
    }
  });
});

describe('Diagram 中性主题', () => {
  it('解析精确的光基线并保持未指定的字段不存在', () => {
    const neutral = getDefaultDiagramTheme(themeWith({ mode: ThemeMode.Light }));

    expect(neutral).toEqual({
      frame: {
        padding: 16,
        titleDescriptionGap: 6,
        headingMainGap: 16,
        drawingLegendGap: 16,
        cornerRadius: 0,
      },
      presentation: {
        title: {
          style: { textColor: '#000000', opacity: 1, font: { size: 18, weight: 600 } },
          layout: { align: 'start', lineHeight: 22 },
        },
        description: {
          style: { textColor: 'hsl(215, 12%, 48%)', opacity: 1, font: { size: 14, weight: 400 } },
          layout: { align: 'start', lineHeight: 20 },
        },
      },
    });
    expect(neutral.frame).not.toHaveProperty('background');
    expect(neutral.frame).not.toHaveProperty('border');
    expect(neutral.presentation?.title?.style?.font).not.toHaveProperty('family');
    expect(neutral.presentation?.title?.style?.font).not.toHaveProperty('style');
    expect(neutral.presentation?.title?.layout).not.toHaveProperty('maxTextWidth');
  });

  it('解析确切的深色标题和当前的 Core 语义引导颜色', () => {
    const theme = themeWith({
      mode: ThemeMode.Dark,
      colors: {
        ...DEFAULT_RESOLVED_THEME.colors,
        semantic: { ...DEFAULT_RESOLVED_THEME.colors.semantic, guide: '#94a3b8' },
      },
    });

    const neutral = getDefaultDiagramTheme(theme);

    expect(neutral.presentation?.title?.style?.textColor).toBe('#ffffff');
    expect(neutral.presentation?.description?.style?.textColor).toBe('#94a3b8');
    expect(neutral.presentation?.description?.style?.font).not.toHaveProperty('family');
    expect(neutral.presentation?.description?.style?.font).not.toHaveProperty('style');
    expect(neutral.presentation?.description?.layout).not.toHaveProperty('maxTextWidth');
  });
});

describe('Diagram 主题级联', () => {
  it('应用命名默认值，然后应用作者默认值并进行整个字体替换', () => {
    const definition = {
      name: 'brand',
      resolve: theme => ({
        frame: {
          padding: { left: 20 },
          background: { fill: theme.colors.semantic.guide },
          border: { stroke: '#64748b', strokeWidth: 1 },
        },
        presentation: {
          title: { style: { textColor: '#1d4ed8', font: { family: 'Inter', weight: 700, style: 'italic' } } },
        },
      }),
    } satisfies DiagramThemeDefinition;
    const inline = DiagramDefaultsSchema.parse({
      frame: {
        background: { fill: '#f8fafc', opacity: { fill: 0.8 } },
        border: { strokeWidth: 3 },
      },
      presentation: { title: { style: { opacity: 0.75, font: { size: 24, style: 'normal' } } } },
    });

    const resolved = resolveDiagramTheme(themeWith({ name: 'brand' }), registryOf(definition), inline);

    expect(resolved.frame.padding).toEqual({ top: 0, right: 0, bottom: 0, left: 20 });
    expect(resolved.frame.background).toEqual({ fill: '#f8fafc', opacity: { fill: 0.8 } });
    expect(resolved.frame.border).toEqual({ strokeWidth: 3 });
    expect(resolved.presentation.title).toMatchObject({
      textColor: '#1d4ed8',
      opacity: 0.75,
      font: { size: 24, style: 'normal' },
    });
  });

  it('忽略空和 undefined 的作者组，而不丢弃指定的默认值', () => {
    const definition = {
      name: 'paper',
      resolve: () => ({
        frame: { padding: 12 },
        presentation: { title: { style: { font: { family: 'serif', size: 24 } } } },
      }),
    } satisfies DiagramThemeDefinition;
    const theme = themeWith({ name: 'paper' });
    const baseline = resolveDiagramTheme(theme, registryOf(definition));
    const empty = resolveDiagramTheme(theme, registryOf(definition), {
      frame: { padding: undefined },
      presentation: { title: { style: { font: {}, opacity: undefined }, layout: {} } },
    });

    expect(empty).toEqual(baseline);
  });

  it('当有效的 Core 样式缺少同名的 Diagram Definition 时失败', () => {
    try {
      resolveDiagramTheme(themeWith({ name: 'missing' }), registryOf());

      expect.unreachable('Expected missing Diagram style failure');
    } catch (error) {
      if (!(error instanceof RetikzDiagramError)) throw error;

      expect(error.code).toBe(RetikzDiagramErrorCode.DefinitionNotRegistered);
      expect(error.details).toMatchObject({
        capability: 'diagram-theme',
        key: 'missing',
        availableKeys: [],
      });
    }
  });

  it('保留回调异常作为 Diagram 错误的原因', () => {
    const cause = new Error('external callback failed');
    const definition = {
      name: 'broken',
      resolve: () => {
        throw cause;
      },
    } satisfies DiagramThemeDefinition;

    try {
      resolveDiagramTheme(themeWith({ name: 'broken' }), registryOf(definition));

      expect.unreachable('Expected callback failure');
    } catch (error) {
      if (!(error instanceof RetikzDiagramError)) throw error;

      expect(error.code).toBe(RetikzDiagramErrorCode.DefinitionCallbackFailed);
      expect(error.cause).toBe(cause);
    }
  });

  it('接受空 Definition 默认值作为无操作', () => {
    const definition = { name: 'empty', resolve: () => ({}) } satisfies DiagramThemeDefinition;

    expect(resolveDiagramTheme(themeWith({ name: 'empty' }), registryOf(definition))).toEqual(
      resolveDiagramTheme(themeWith({}), registryOf()),
    );
  });
});
