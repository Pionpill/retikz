// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import type { Scene } from '@retikz/core';
import {
  type HydrationContext,
  type HydrationHandlers,
  createContextBuilder,
  createHydrationController,
  createSvgAnimationControls,
  geometryOf,
  locateSvg,
  metaOf,
  resolveSvgElement,
} from '../src/hydration';

/**
 * ADR-06 水合 runtime 上下文：按 id 聚合的语义元素 ctx + per-id owner 动画控制
 * @description 覆盖 meta/几何按 id 聚合（多平铺 shape 并集、group transform）、buildContext 经控制器注入
 *   `(event, ctx)`、SVG 动画 owner 双查（data-retikz-id + data-retikz-animation-owner）、最小 ctx 降级。
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

/** 造一个含若干 data-retikz-id / data-retikz-animation-owner 元素的根，挂进 document */
const setupRoot = (): { root: SVGSVGElement; element: SVGElement } => {
  const root = document.createElementNS(SVG_NS, 'svg');
  const element = document.createElementNS(SVG_NS, 'rect');
  element.setAttribute('data-retikz-id', 'm');
  root.appendChild(element);
  document.body.appendChild(root);
  return { root, element };
};

/** 造一个可断言 play/cancel/finish/currentTime 的假 Animation */
const fakeAnimation = (): { play: ReturnType<typeof vi.fn>; pause: ReturnType<typeof vi.fn>; cancel: ReturnType<typeof vi.fn>; finish: ReturnType<typeof vi.fn>; currentTime: number } => ({
  play: vi.fn(),
  pause: vi.fn(),
  cancel: vi.fn(),
  finish: vi.fn(),
  currentTime: 0,
});

describe('metaOf（按 id 取 provenance）', () => {
  it('返回首个同 id 图元的 meta；嵌套 group 内也能找到', () => {
    const scene: Scene = {
      layout: { x: 0, y: 0, width: 100, height: 100 },
      primitives: [
        { type: 'rect', id: 'm', meta: { series: 'sales', i: 3 }, x: 0, y: 0, width: 10, height: 10 },
        {
          type: 'group',
          id: 'g',
          children: [{ type: 'rect', id: 'inner', meta: { tag: 'deep' }, x: 0, y: 0, width: 1, height: 1 }],
        },
      ],
    };
    expect(metaOf(scene, 'm')).toEqual({ series: 'sales', i: 3 });
    expect(metaOf(scene, 'inner')).toEqual({ tag: 'deep' });
    expect(metaOf(scene, 'absent')).toBeUndefined();
  });
});

describe('geometryOf（同 id 全部图元并集 bbox）', () => {
  it('多平铺 shape 共享 id → 并集 bbox + 中心', () => {
    const scene: Scene = {
      layout: { x: 0, y: 0, width: 100, height: 100 },
      primitives: [
        { type: 'rect', id: 'm', x: 0, y: 0, width: 10, height: 10 },
        { type: 'rect', id: 'm', x: 20, y: 5, width: 10, height: 5 },
      ],
    };
    const geometry = geometryOf(scene, 'm');
    expect(geometry?.bbox).toEqual({ x: 0, y: 0, width: 30, height: 10 });
    expect(geometry?.center).toEqual([15, 5]);
  });

  it('id 落在带 transform 的 group → 子树叶子角点经 group transform 折算到 scene 帧', () => {
    const scene: Scene = {
      layout: { x: 0, y: 0, width: 200, height: 200 },
      primitives: [
        {
          type: 'group',
          id: 'g',
          transforms: [{ kind: 'translate', x: 100, y: 0 }],
          children: [{ type: 'rect', x: 0, y: 0, width: 10, height: 10 }],
        },
      ],
    };
    const geometry = geometryOf(scene, 'g');
    expect(geometry?.bbox).toEqual({ x: 100, y: 0, width: 10, height: 10 });
  });

  it('无匹配 id → undefined', () => {
    const scene: Scene = { layout: { x: 0, y: 0, width: 10, height: 10 }, primitives: [] };
    expect(geometryOf(scene, 'x')).toBeUndefined();
  });
});

describe('createContextBuilder 经控制器注入 (event, ctx)', () => {
  it('svg 点击 → handler 收到 id / meta / geometry / element / point / renderer', () => {
    const { root, element } = setupRoot();
    const scene: Scene = {
      layout: { x: 0, y: 0, width: 100, height: 100 },
      primitives: [{ type: 'rect', id: 'm', meta: { datum: 7 }, x: 0, y: 0, width: 10, height: 10 }],
    };
    const buildContext = createContextBuilder({
      renderer: 'svg',
      root,
      scene,
      resolveElement: resolveSvgElement,
      resolvePoint: () => ({ x: 1, y: 2 }),
      makeAnimation: id => createSvgAnimationControls(root, id),
    });
    let received: HydrationContext | undefined;
    const handlers: HydrationHandlers = { m: { click: (_event, ctx) => { received = ctx; } } };
    const controller = createHydrationController(root, handlers, locateSvg, buildContext);

    const event = new Event('click', { bubbles: true });
    Object.defineProperty(event, 'target', { value: element, configurable: true });
    element.dispatchEvent(event);

    expect(received?.id).toBe('m');
    expect(received?.meta).toEqual({ datum: 7 });
    expect(received?.renderer).toBe('svg');
    expect(received?.element).toBe(element);
    expect(received?.point).toEqual({ x: 1, y: 2 });
    expect(received?.geometry?.bbox).toEqual({ x: 0, y: 0, width: 10, height: 10 });
    controller.dispose();
  });

  it('命中无 meta 的图元 → ctx.meta undefined、不抛', () => {
    const { root, element } = setupRoot();
    const scene: Scene = {
      layout: { x: 0, y: 0, width: 100, height: 100 },
      primitives: [{ type: 'rect', id: 'm', x: 0, y: 0, width: 10, height: 10 }],
    };
    const buildContext = createContextBuilder({
      renderer: 'svg',
      root,
      scene,
      resolveElement: resolveSvgElement,
      resolvePoint: () => null,
      makeAnimation: id => createSvgAnimationControls(root, id),
    });
    let received: HydrationContext | undefined;
    const handlers: HydrationHandlers = { m: { click: (_event, ctx) => { received = ctx; } } };
    const controller = createHydrationController(root, handlers, locateSvg, buildContext);

    const event = new Event('click', { bubbles: true });
    Object.defineProperty(event, 'target', { value: element, configurable: true });
    expect(() => element.dispatchEvent(event)).not.toThrow();
    expect(received?.meta).toBeUndefined();
    expect(received?.point).toBeNull();
    controller.dispose();
  });
});

describe('SVG 动画 owner 双查（per-id 控制）', () => {
  it('restart() 命中元素本身 + data-retikz-animation-owner wrapper 的动画并 cancel+play', () => {
    const root = document.createElementNS(SVG_NS, 'svg');
    // 元素本身（opacity load 动画）
    const element = document.createElementNS(SVG_NS, 'rect');
    element.setAttribute('data-retikz-id', 'n');
    const ownAnim = fakeAnimation();
    (element as unknown as { getAnimations: () => Array<unknown> }).getAnimations = () => [ownAnim];
    // transform wrapper（无 data-retikz-id，挂 owner）
    const wrapper = document.createElementNS(SVG_NS, 'g');
    wrapper.setAttribute('data-retikz-animation-owner', 'n');
    const wrapperAnim = fakeAnimation();
    (wrapper as unknown as { getAnimations: () => Array<unknown> }).getAnimations = () => [wrapperAnim];
    root.appendChild(element);
    root.appendChild(wrapper);
    document.body.appendChild(root);

    const controls = createSvgAnimationControls(root, 'n');
    controls.restart();
    expect(ownAnim.cancel).toHaveBeenCalledTimes(1);
    expect(ownAnim.play).toHaveBeenCalledTimes(1);
    expect(wrapperAnim.cancel).toHaveBeenCalledTimes(1);
    expect(wrapperAnim.play).toHaveBeenCalledTimes(1);

    controls.seek(120);
    expect(ownAnim.currentTime).toBe(120);
    expect(wrapperAnim.currentTime).toBe(120);
  });

  it('单个动画 finish() 抛错（infinite track）被隔离，不连累其余', () => {
    const root = document.createElementNS(SVG_NS, 'svg');
    const element = document.createElementNS(SVG_NS, 'rect');
    element.setAttribute('data-retikz-id', 'n');
    const throwing = fakeAnimation();
    throwing.finish = vi.fn(() => { throw new Error('InvalidStateError'); });
    (element as unknown as { getAnimations: () => Array<unknown> }).getAnimations = () => [throwing];
    root.appendChild(element);
    document.body.appendChild(root);

    const controls = createSvgAnimationControls(root, 'n');
    expect(() => controls.stop()).not.toThrow();
    expect(throwing.finish).toHaveBeenCalledTimes(1);
  });
});

describe('最小 ctx 降级（控制器无 buildContext）', () => {
  it('handler 仍收到 ctx：id + renderer + root，element null、animation no-op、不抛', () => {
    const { root, element } = setupRoot();
    let received: HydrationContext | undefined;
    const handlers: HydrationHandlers = { m: { click: (_event, ctx) => { received = ctx; } } };
    const controller = createHydrationController(root, handlers, locateSvg);

    const event = new Event('click', { bubbles: true });
    Object.defineProperty(event, 'target', { value: element, configurable: true });
    element.dispatchEvent(event);

    expect(received?.id).toBe('m');
    expect(received?.element).toBeNull();
    expect(received?.meta).toBeUndefined();
    expect(() => received?.animation.play()).not.toThrow();
    controller.dispose();
  });
});
