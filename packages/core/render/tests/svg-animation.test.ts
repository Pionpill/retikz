import { describe, expect, it } from 'vitest';
import type { IRAnimationTrack, PathPrim, RectPrim, Scene, ScenePrimitive } from '@retikz/core';
import { buildSvgFragment, renderToSvgString } from '../src/svg';
import type { SvgNode } from '../src/svg/types';

/**
 * ADR-02 SVG 动画播放：load→CSS @keyframes（SSR 零 JS）+ 交互→WAAPI 描述；property→SVG 映射；camera→group transform；
 *   {animate:false} 降级；pathDraw/自定义 property/自定义 easing 降级 warn；oklch 预采样；确定性。
 */
const layout = { x: 0, y: 0, width: 100, height: 100 };
const scene = (primitives: Array<ScenePrimitive>, animations?: Array<IRAnimationTrack>): Scene => ({
  primitives,
  layout,
  ...(animations ? { animations } : {}),
});
const rect = (extra: Partial<RectPrim> = {}): RectPrim => ({ type: 'rect', x: 0, y: 0, width: 10, height: 10, fill: '#f00', ...extra });

const FADE: IRAnimationTrack = { property: 'opacity', keyframes: [{ at: 0, value: 0 }, { at: 1, value: 1 }], duration: 400, trigger: 'load' };
const GROW_UP: IRAnimationTrack = { property: 'scaleY', keyframes: [{ at: 0, value: 0 }, { at: 1, value: 1 }], duration: 500, origin: 'south', easing: 'ease-out' };

/** 在 SvgNode 树里深度优先找首个匹配 tag 的节点 */
const findTag = (nodes: Array<SvgNode | string>, tag: string): SvgNode | undefined => {
  for (const n of nodes) {
    if (typeof n === 'string') continue;
    if (n.tag === tag) return n;
    const inner = findTag(n.children ?? [], tag);
    if (inner) return inner;
  }
  return undefined;
};
const collectWarns = () => {
  const warnings: Array<string> = [];
  return { onAnimationWarn: (m: string) => warnings.push(m), warnings };
};

describe('Happy：load CSS + 交互 WAAPI + camera', () => {
  it('load opacity track → <style> 含 @keyframes，元素挂 class + animation', () => {
    const out = buildSvgFragment(scene([rect({ animations: [FADE] })]), { idPrefix: 't' });
    const style = findTag(out, 'style');
    expect(style).toBeDefined();
    const css = String(style!.children![0]);
    expect(css).toContain('@keyframes');
    expect(css).toContain('opacity:0');
    expect(css).toContain('opacity:1');
    expect(css).toContain('400ms');
    const r = findTag(out, 'rect')!;
    expect(typeof r.attrs.class).toBe('string');
    expect(css).toContain(`.${r.attrs.class}`);
  });

  it('transform track（scaleY + origin south）→ wrapper <g> + transform-origin + @keyframes scale', () => {
    const out = buildSvgFragment(scene([rect({ animations: [GROW_UP] })]), { idPrefix: 't' });
    const g = findTag(out, 'g')!;
    expect(g).toBeDefined();
    expect(findTag([g], 'rect')).toBeDefined(); // rect 在 g 内
    const css = String(findTag(out, 'style')!.children![0]);
    expect(css).toContain('transform:scale(1, 0)');
    expect(css).toContain('transform:scale(1, 1)');
    expect(css).toContain('transform-origin:5px 10px'); // rect 10×10 的 south = (5,10)
    expect(css).toContain('transform-box:view-box');
  });

  it('transform wrapper 带 id 的元素 → wrapper <g> 打 data-retikz-animation-owner（供 ctx.animation per-id 双查）', () => {
    const out = buildSvgFragment(scene([rect({ id: 'n', animations: [GROW_UP] })]), { idPrefix: 't' });
    const g = findTag(out, 'g')!;
    expect(g.attrs['data-retikz-animation-owner']).toBe('n');
  });

  it('无 id 的元素 transform 动画 → wrapper 不打 owner 属性', () => {
    const out = buildSvgFragment(scene([rect({ animations: [GROW_UP] })]), { idPrefix: 't' });
    const g = findTag(out, 'g')!;
    expect(g.attrs['data-retikz-animation-owner']).toBeUndefined();
  });

  it('strokeWidth + pathDraw 映射：pathLength/dasharray setup + stroke-dashoffset keyframes', () => {
    const path: PathPrim = { type: 'path', commands: [{ kind: 'move', to: [0, 0] }, { kind: 'line', to: [10, 0] }], stroke: '#000' };
    const draw: IRAnimationTrack = { property: 'pathDraw', keyframes: [{ at: 0, value: 0 }, { at: 1, value: 1 }], duration: 600 };
    const sw: IRAnimationTrack = { property: 'strokeWidth', keyframes: [{ at: 0, value: 1 }, { at: 1, value: 4 }], duration: 300 };
    const out = buildSvgFragment(scene([{ ...path, animations: [draw, sw] }]), { idPrefix: 't' });
    const p = findTag(out, 'path')!;
    expect(p.attrs.pathLength).toBe(1);
    expect(p.attrs['stroke-dasharray']).toBe(1);
    const css = String(findTag(out, 'style')!.children![0]);
    expect(css).toContain('stroke-dashoffset:1'); // value 0 → offset 1
    expect(css).toContain('stroke-dashoffset:0'); // value 1 → offset 0
    expect(css).toContain('stroke-width:4');
  });

  it('交互 track（visible）→ 元素带 data-retikz-anim 描述，且无 <style>（无 load 规则）', () => {
    const visible: IRAnimationTrack = { ...FADE, trigger: 'visible' };
    const out = buildSvgFragment(scene([rect({ animations: [visible] })]), { idPrefix: 't' });
    expect(findTag(out, 'style')).toBeUndefined();
    const r = findTag(out, 'rect')!;
    const desc = JSON.parse(String(r.attrs['data-retikz-anim']));
    expect(Array.isArray(desc)).toBe(true);
    expect(desc[0].property).toBe('opacity');
    expect(desc[0].trigger).toBe('visible');
    expect(desc[0].timing.duration).toBe(400);
  });

  it('camera（Scene.animations viewBox）→ 包一层 <g> transform 动画', () => {
    const camera: IRAnimationTrack = { property: 'viewBox', keyframes: [{ at: 0, value: [0, 0, 100, 100] }, { at: 1, value: [25, 25, 50, 50] }], duration: 800 };
    const out = buildSvgFragment(scene([rect()], [camera]), { idPrefix: 't' });
    const g = findTag(out, 'g')!;
    expect(g).toBeDefined();
    const css = String(findTag(out, 'style')!.children![0]);
    expect(css).toContain('translate(');
    expect(css).toContain('scale(2, 2)'); // 100/50 = 2
  });
});

describe('边界', () => {
  it('{animate:false} → 无 <style>、无 data-retikz-anim，输出 = 静态 base', () => {
    const animated = renderToSvgString(scene([rect({ animations: [FADE, GROW_UP] })]), { idPrefix: 't', animate: false });
    const plain = renderToSvgString(scene([rect()]), { idPrefix: 't' });
    expect(animated).toBe(plain);
    expect(animated).not.toContain('<style');
    expect(animated).not.toContain('data-retikz-anim');
  });

  it('省略 animations → 与现状等价（无 class / style）', () => {
    const out = buildSvgFragment(scene([rect()]), { idPrefix: 't' });
    expect(findTag(out, 'style')).toBeUndefined();
    expect(findTag(out, 'rect')!.attrs.class).toBeUndefined();
  });

  it('混合 load + 交互 同元素：各走各载体（class + data-retikz-anim）', () => {
    const interactive: IRAnimationTrack = { property: 'strokeWidth', keyframes: [{ at: 0, value: 1 }, { at: 1, value: 3 }], duration: 200, trigger: 'manual' };
    const out = buildSvgFragment(scene([rect({ stroke: '#000', animations: [FADE, interactive] })]), { idPrefix: 't' });
    const r = findTag(out, 'rect')!;
    expect(typeof r.attrs.class).toBe('string');
    expect(typeof r.attrs['data-retikz-anim']).toBe('string');
  });
});

describe('错误 / 降级', () => {
  it('pathDraw 挂无描边元素 → warn + skip（静态）', () => {
    const w = collectWarns();
    const draw: IRAnimationTrack = { property: 'pathDraw', keyframes: [{ at: 0, value: 0 }, { at: 1, value: 1 }], duration: 600 };
    const out = buildSvgFragment(scene([{ type: 'rect', x: 0, y: 0, width: 10, height: 10, fill: '#f00', animations: [draw] }]), { idPrefix: 't', ...w });
    expect(w.warnings.some(m => m.includes('pathDraw'))).toBe(true);
    expect(findTag(out, 'style')).toBeUndefined();
  });

  it('自定义 property 无映射 → warn + skip', () => {
    const w = collectWarns();
    const blur: IRAnimationTrack = { property: 'blur', keyframes: [{ at: 0, value: 4 }, { at: 1, value: 0 }], duration: 300 };
    const out = buildSvgFragment(scene([rect({ animations: [blur] })]), { idPrefix: 't', ...w });
    expect(w.warnings.some(m => m.includes('blur'))).toBe(true);
    expect(findTag(out, 'style')).toBeUndefined();
  });

  it('自定义 easing 未注册 → warn + linear 兜底', () => {
    const w = collectWarns();
    const track: IRAnimationTrack = { ...FADE, easing: 'spring' };
    const out = buildSvgFragment(scene([rect({ animations: [track] })]), { idPrefix: 't', ...w });
    expect(w.warnings.some(m => m.includes('spring'))).toBe(true);
    expect(String(findTag(out, 'style')!.children![0])).toContain('linear');
  });
});

describe('交互', () => {
  it('oklch 颜色 track → 预采样多帧（>2 块）+ 端点色正确', () => {
    const color: IRAnimationTrack = { property: 'fill', keyframes: [{ at: 0, value: '#ff0000' }, { at: 1, value: '#0000ff' }], duration: 400 };
    const css = String(findTag(buildSvgFragment(scene([rect({ animations: [color] })]), { idPrefix: 't' }), 'style')!.children![0]);
    const blocks = css.match(/%\{/g) ?? [];
    expect(blocks.length).toBeGreaterThan(2); // 预采样 → 多于两端点
    expect(css).toContain('0%{fill:#ff0000'); // 起点原色
    expect(css).toContain('fill:#0000ff'); // 终点（采样末值 = 蓝）
  });

  it('id + animations 共存（data-retikz-id 与 class 不冲突）', () => {
    const out = buildSvgFragment(scene([rect({ id: 'a', animations: [FADE] })]), { idPrefix: 't' });
    const r = findTag(out, 'rect')!;
    expect(r.attrs['data-retikz-id']).toBe('a');
    expect(typeof r.attrs.class).toBe('string');
  });

  it('确定性：同 scene + idPrefix 两次 renderToSvgString 逐字一致', () => {
    const s = scene([rect({ animations: [FADE, GROW_UP] })], [{ property: 'viewBox', keyframes: [{ at: 0, value: [0, 0, 100, 100] }, { at: 1, value: [10, 10, 50, 50] }], duration: 500 }]);
    expect(renderToSvgString(s, { idPrefix: 't' })).toBe(renderToSvgString(s, { idPrefix: 't' }));
  });
});
