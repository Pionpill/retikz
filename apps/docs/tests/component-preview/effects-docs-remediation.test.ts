import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const effectsRoot = resolve(import.meta.dirname, '../../src/modules/docs/contents/kernel/components/effects');

const readEffectsFile = (relativePath: string): string => {
  const path = resolve(effectsRoot, relativePath);
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
};

describe('effects docs remediation contracts', () => {
  it('提供内置 Pattern 页面、三种内置 shape 与 Node/Path 示例', () => {
    const zh = readEffectsFile('pattern/index.zh.mdx');
    const en = readEffectsFile('pattern/index.en.mdx');
    const builtins = readEffectsFile('pattern/pattern-builtins.demo.tsx');
    const surfaces = readEffectsFile('pattern/pattern-surfaces.demo.tsx');

    expect(zh).toContain('title: 图案');
    expect(en).toContain('title: Patterns');
    expect(zh).toContain('files="pattern-playground"');
    expect(en).toContain('files="pattern-playground"');
    expect(builtins).toContain("shape: 'lines'");
    expect(builtins).toContain("shape: 'dots'");
    expect(builtins).toContain("shape: 'grid'");
    expect(surfaces).toContain('<Node');
    expect(surfaces).toContain('<Path');
  });

  it('动画页只使用真实 snapshotAt，并展示手写轨道与命令式控制', () => {
    const zh = readEffectsFile('animation/index.zh.mdx');
    const en = readEffectsFile('animation/index.en.mdx');
    const handwritten = readEffectsFile('animation/handwritten-track.demo.tsx');
    const manual = readEffectsFile('animation/manual-controls.demo.tsx');

    expect(zh).not.toMatch(/^\| `snapshot`/mu);
    expect(en).not.toMatch(/^\| `snapshot`/mu);
    expect(zh).toContain('files="handwritten-track"');
    expect(en).toContain('files="handwritten-track"');
    expect(zh).toContain('<ComponentPreview files="manual-controls" size="sm" controls={{ animation: true }} />');
    expect(en).toContain('<ComponentPreview files="manual-controls" size="sm" controls={{ animation: true }} />');
    expect(handwritten).toContain('satisfies IRAnimationTrack');
    expect(manual).toContain('<AnimationModeProvider mode="enabled">');
    expect(manual).toContain('animationRef={animationRef}');
    expect(manual).toContain('animationRef.current?.play()');
    expect(manual).toContain('animationRef.current?.pause()');
    expect(manual).toContain('animationRef.current?.seek(');
  });

  it('扩展页代码使用真实公开类型并同时给出 SVG 与 Canvas 图案入口', () => {
    const customAnimationZh = readEffectsFile('custom-animation/index.zh.mdx');
    const customAnimationEn = readEffectsFile('custom-animation/index.en.mdx');
    const customPatternZh = readEffectsFile('custom-pattern/index.zh.mdx');
    const customPatternEn = readEffectsFile('custom-pattern/index.en.mdx');
    const customPatternControls = readEffectsFile('custom-pattern/custom-pattern-size.controls.ts');
    const customPatternEnControls = readEffectsFile('custom-pattern/custom-pattern-size.en.controls.ts');

    for (const source of [customAnimationZh, customAnimationEn]) {
      expect(source).toContain("import type { EasingRegistry } from '@retikz/render/animation';");
      expect(source).toContain("import type { AnimationPropertyDefinition } from '@retikz/render/animation';");
      expect(source).toContain('satisfies EasingRegistry');
      expect(source).toContain('satisfies AnimationPropertyDefinition');
    }
    for (const source of [customPatternZh, customPatternEn]) {
      expect(source).toContain('/kernel/components/effects/pattern');
      expect(source).toContain("path: 'packages/kernel/render/src/canvas/draw-scene.ts'");
    }
    for (const source of [customPatternControls, customPatternEnControls]) {
      expect(source).not.toContain('PatternSpec.');
      expect(source).toContain("'IRPaintSpec'");
    }
  });

  it('Blend playground 只让上层 source 接收 blendMode 与 opacity', () => {
    const demo = readEffectsFile('blend/blend-playground.demo.tsx');
    const zh = readEffectsFile('blend/index.zh.mdx');
    const en = readEffectsFile('blend/index.en.mdx');

    expect(demo.match(/blendMode=/gu)).toHaveLength(1);
    expect(demo.match(/opacity=/gu)).toHaveLength(1);
    for (const source of [zh, en]) {
      expect(source).toMatch(/draw-scene\.ts'[\s\S]*?startLine:/u);
    }
  });
});
