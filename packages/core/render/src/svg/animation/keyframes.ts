/**
 * track → CSS `@keyframes` + `animation` shorthand 生成；per-document 动画收集器（元素装饰 + 镜头 + `<style>`）
 * @description `trigger:'load'` 的 track 编进 CSS（SSR 零 JS 自播）；交互 track 出 WAAPI 描述挂 data 属性。
 *   transform 通道各包一层 `<g>`（避免同元素多个 transform 动画在 CSS 上冲突，且天然支持支点 transform-origin）。
 */
import { AnimationProperty, type IRAnimationTrack, type Scene, type ScenePrimitive } from '@retikz/core';
import type { SvgAttrs, SvgNode, SvgStyle } from '../types';
import type { EasingRegistry } from '../../animation/types';
import { classifyProperty, isAutoplayTrigger, primHasStroke, resolveTransformOrigin } from '../../animation/channels';
import { evaluateTrack } from '../../animation/evaluate';
import { type WaapiDescriptor, buildWaapiDescriptor } from './waapi';
import {
  type ExpandedTrack,
  easingToCss,
  expandTrack,
  iterationsToCss,
  transformValue,
} from './shared';

/** load 触发（缺省即 load）→ 走 CSS 自播；其余 → WAAPI 描述 */
const isLoadTrigger = (track: IRAnimationTrack): boolean =>
  track.trigger === undefined || track.trigger === 'load';

/** 百分比保留至多 4 位小数（offset 升序、确定性） */
const pct = (offset: number): string => `${Math.round(offset * 1e6) / 1e4}%`;

/** ExpandedTrack → `@keyframes name { ... }` */
const buildKeyframesRule = (name: string, expanded: ExpandedTrack): string => {
  const blocks = expanded.frames
    .map(frame => {
      const timing = frame.easing ? `;animation-timing-function:${frame.easing}` : '';
      return `${pct(frame.offset)}{${expanded.cssProperty}:${frame.value}${timing}}`;
    })
    .join('');
  return `@keyframes ${name}{${blocks}}`;
};

/** track timing → CSS `animation` shorthand（不含 name；name duration easing delay iter dir fill） */
const shorthandTiming = (
  track: IRAnimationTrack,
  registry: EasingRegistry | undefined,
  onWarn: (message: string) => void,
): string =>
  [
    `${track.duration}ms`,
    easingToCss(track.easing, registry, onWarn),
    `${track.delay ?? 0}ms`,
    iterationsToCss(track.iterations),
    track.direction ?? 'normal',
    track.fill ?? 'forwards',
  ].join(' ');

/** scene 根 viewBox track + 静态 layout → transform 帧（把取景 [x,y,w,h] 折算成 group transform） */
const expandCameraTrack = (track: IRAnimationTrack, layout: Scene['layout']): ExpandedTrack => {
  const frames = track.keyframes.map(kf => {
    const [vx, vy, vw, vh] = kf.value as Array<number>;
    const sx = layout.width / vw;
    const sy = layout.height / vh;
    const tx = layout.x - sx * vx;
    const ty = layout.y - sy * vy;
    return { offset: kf.at, value: `translate(${tx}px, ${ty}px) scale(${sx}, ${sy})` };
  });
  return { cssProperty: 'transform', frames, transformOrigin: '0px 0px' };
};

/** 合并 class 属性（保留既有） */
const mergeClass = (existing: string | undefined, added: string): string =>
  existing ? `${existing} ${added}` : added;

/** 给 SvgNode 叠加属性（过滤 undefined） */
const addAttrs = (node: SvgNode, attrs: SvgAttrs): SvgNode => {
  const merged: SvgAttrs = { ...node.attrs };
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined) (merged as Record<string, unknown>)[k] = v;
  return { ...node, attrs: merged };
};

/** SVG 动画收集器选项 */
export type SvgAnimationOptions = {
  /** 资源 id 前缀（keyframes / class 名共用，确保确定性 + 多实例隔离） */
  idPrefix: string;
  /** 自定义 easing 注册表 */
  easings?: EasingRegistry;
  /** 降级诊断告警；缺省 console.warn */
  onWarn?: (message: string) => void;
  /**
   * 静态截帧时刻（毫秒）；给定时收集器不 emit `@keyframes` / WAAPI，而是把各 track 在该时刻的求值结果
   * **烘焙成静态属性 / transform**（定格一帧）。SSR 海报帧 / 缩略图 / 截图用。复用 `evaluateTrack` 引擎。
   */
  snapshotAt?: number;
};

/** per-document 动画收集器 */
export type SvgAnimationCollector = {
  /** 元素 prim → 装饰后的 SvgNode（挂 CSS 动画 class / WAAPI data；transform 通道包 `<g>`） */
  decorate: (node: SvgNode, prim: ScenePrimitive) => SvgNode;
  /** scene 根镜头：按 viewBox track 包裹一层（或多层）动画 `<g>` */
  wrapCamera: (children: Array<SvgNode>, scene: Scene) => Array<SvgNode>;
  /** 汇总所有 `@keyframes` + class 规则成 `<style>`（无规则返回 undefined） */
  styleNode: () => SvgNode | undefined;
};

/** 创建 per-document 动画收集器（动画启用时由 document builder 注入 buildPrim） */
export const createSvgAnimationCollector = (options: SvgAnimationOptions): SvgAnimationCollector => {
  const onWarn = options.onWarn ?? ((message: string) => console.warn(`[retikz/svg] ${message}`));
  const rules: Array<string> = [];
  let seq = 0;
  const nextName = (kind: 'k' | 'c'): string => `retikz-${options.idPrefix}-${kind}${seq++}`;

  /**
   * 处理 transform 通道：每条 track 包一层 `<g>`（load→CSS class、交互→WAAPI data）
   * @description wrapper `<g>` 没有 `data-retikz-id`，给它打 `data-retikz-animation-owner=<被包元素 id>`（id 存在时），
   *   让 `context.animation` per-id 控制经此双查到承载真动画的 wrapper（否则带 transform 的节点 restart 失效）。
   */
  const wrapTransform = (current: SvgNode, expanded: ExpandedTrack, track: IRAnimationTrack, ownerId: string | undefined): SvgNode => {
    const owner: SvgAttrs = ownerId !== undefined ? { 'data-retikz-animation-owner': ownerId } : {};
    if (isLoadTrigger(track)) {
      const kf = nextName('k');
      rules.push(buildKeyframesRule(kf, expanded));
      const cls = nextName('c');
      const originRule = expanded.transformOrigin
        ? `transform-box:view-box;transform-origin:${expanded.transformOrigin};`
        : '';
      rules.push(`.${cls}{${originRule}animation:${kf} ${shorthandTiming(track, options.easings, onWarn)}}`);
      return { tag: 'g', attrs: { class: cls, ...owner }, children: [current] };
    }
    const descriptor = buildWaapiDescriptor(expanded, track, options.easings, onWarn);
    return { tag: 'g', attrs: { 'data-retikz-anim': JSON.stringify([descriptor]), ...owner }, children: [current] };
  };

  const decorate = (node: SvgNode, prim: ScenePrimitive): SvgNode => {
    const tracks = prim.animations;
    if (!tracks || tracks.length === 0) return node;
    let current = node;

    // 1) 元素级通道（css 直属 + pathDraw）：load→class、交互→data；setup 属性写元素
    const loadEntries: Array<string> = [];
    const descriptors: Array<WaapiDescriptor> = [];
    let setupAttrs: SvgAttrs = {};
    for (const track of tracks) {
      if (classifyProperty(track.property) === 'transform') continue;
      const expanded = expandTrack(track, prim, options.easings, onWarn);
      if ('skip' in expanded) {
        onWarn(`SVG animation: skipped track on "${track.property}" (${expanded.skip}); rendering base.`);
        continue;
      }
      if (expanded.setupAttrs) setupAttrs = { ...setupAttrs, ...expanded.setupAttrs };
      if (isLoadTrigger(track)) {
        const kf = nextName('k');
        rules.push(buildKeyframesRule(kf, expanded));
        loadEntries.push(`${kf} ${shorthandTiming(track, options.easings, onWarn)}`);
      } else {
        descriptors.push(buildWaapiDescriptor(expanded, track, options.easings, onWarn));
      }
    }
    const nodeAttrs: SvgAttrs = { ...setupAttrs };
    if (loadEntries.length > 0) {
      const cls = nextName('c');
      rules.push(`.${cls}{animation:${loadEntries.join(',')}}`);
      nodeAttrs.class = mergeClass(current.attrs.class, cls);
    }
    if (descriptors.length > 0) nodeAttrs['data-retikz-anim'] = JSON.stringify(descriptors);
    if (Object.keys(nodeAttrs).length > 0) current = addAttrs(current, nodeAttrs);

    // 2) transform 通道：各包一层 `<g>`
    for (const track of tracks) {
      if (classifyProperty(track.property) !== 'transform') continue;
      const expanded = expandTrack(track, prim, options.easings, onWarn);
      if ('skip' in expanded) {
        onWarn(`SVG animation: skipped track on "${track.property}" (${expanded.skip}); rendering base.`);
        continue;
      }
      current = wrapTransform(current, expanded, track, prim.id);
    }
    return current;
  };

  const wrapCamera = (children: Array<SvgNode>, scene: Scene): Array<SvgNode> => {
    const tracks = scene.animations;
    if (!tracks || tracks.length === 0) return children;
    let current = children;
    for (const track of tracks) {
      if (track.property !== 'viewBox') continue;
      const expanded = expandCameraTrack(track, scene.layout);
      if (isLoadTrigger(track)) {
        const kf = nextName('k');
        rules.push(buildKeyframesRule(kf, expanded));
        const cls = nextName('c');
        rules.push(
          `.${cls}{transform-box:view-box;transform-origin:0 0;animation:${kf} ${shorthandTiming(track, options.easings, onWarn)}}`,
        );
        current = [{ tag: 'g', attrs: { class: cls }, children: current }];
      } else {
        const descriptor = buildWaapiDescriptor(expanded, track, options.easings, onWarn);
        current = [{ tag: 'g', attrs: { 'data-retikz-anim': JSON.stringify([descriptor]) }, children: current }];
      }
    }
    return current;
  };

  const styleNode = (): SvgNode | undefined =>
    rules.length > 0 ? { tag: 'style', attrs: {}, children: [rules.join('')] } : undefined;

  // ── 静态截帧模式（snapshotAt）：烘焙各 track 在该时刻的值为静态属性 / transform，不 emit 动画 ──
  const snapshotAt = options.snapshotAt;

  /** transform 通道单值 + 支点 → CSS transform inline style（与动画路径同口径：transform-box:view-box） */
  const snapshotTransformStyle = (track: IRAnimationTrack, value: number, prim: ScenePrimitive): SvgStyle => {
    const origin = resolveTransformOrigin(prim, track.origin);
    const style: SvgStyle = { transform: transformValue(track.property, value), 'transform-box': 'view-box' };
    if (origin) style['transform-origin'] = `${origin[0]}px ${origin[1]}px`;
    return style;
  };

  const decorateSnapshot = (node: SvgNode, prim: ScenePrimitive): SvgNode => {
    const tracks = prim.animations;
    if (snapshotAt === undefined || !tracks || tracks.length === 0) return node;
    let current = node;

    // 1) 元素级通道（css 直属 + pathDraw）→ 静态属性
    const staticAttrs: SvgAttrs = {};
    for (const track of tracks) {
      if (!isAutoplayTrigger(track)) continue; // 仅自动播 track 参与截帧，交互触发的留 base（settled）
      const cls = classifyProperty(track.property);
      if (cls === 'transform' || cls === 'viewBox') continue;
      if (cls === 'custom') {
        onWarn(`SVG snapshot: custom property "${track.property}" has no built-in mapping; rendering base.`);
        continue;
      }
      if (cls === 'pathDraw' && !primHasStroke(prim)) {
        onWarn('SVG snapshot: pathDraw requires a stroked element; rendering base.');
        continue;
      }
      const result = evaluateTrack(track, snapshotAt, { easings: options.easings });
      if (!result) continue; // 该时刻 track 不活动 → 用 base
      if (cls === 'css') {
        if (track.property === AnimationProperty.Opacity) staticAttrs.opacity = Number(result.value);
        else if (track.property === AnimationProperty.Fill) staticAttrs.fill = String(result.value);
        else if (track.property === AnimationProperty.Stroke) staticAttrs.stroke = String(result.value);
        else if (track.property === AnimationProperty.StrokeWidth) staticAttrs['stroke-width'] = Number(result.value);
      } else {
        // pathDraw：value 0..1 → stroke-dashoffset 1−value（pathLength=1 归一化）
        staticAttrs.pathLength = 1;
        staticAttrs['stroke-dasharray'] = 1;
        staticAttrs['stroke-dashoffset'] = 1 - Number(result.value);
      }
    }
    if (Object.keys(staticAttrs).length > 0) current = addAttrs(current, staticAttrs);

    // 2) transform 通道：各包一层带静态 transform 的 `<g>`
    for (const track of tracks) {
      if (!isAutoplayTrigger(track)) continue;
      if (classifyProperty(track.property) !== 'transform') continue;
      const result = evaluateTrack(track, snapshotAt, { easings: options.easings });
      if (!result) continue;
      current = { tag: 'g', attrs: {}, style: snapshotTransformStyle(track, Number(result.value), prim), children: [current] };
    }
    return current;
  };

  const wrapCameraSnapshot = (children: Array<SvgNode>, scene: Scene): Array<SvgNode> => {
    const tracks = scene.animations;
    if (snapshotAt === undefined || !tracks || tracks.length === 0) return children;
    let current = children;
    for (const track of tracks) {
      if (track.property !== 'viewBox' || !isAutoplayTrigger(track)) continue;
      const result = evaluateTrack(track, snapshotAt, { easings: options.easings });
      if (!result) continue;
      const [vx, vy, vw, vh] = result.value as Array<number>;
      const sx = scene.layout.width / vw;
      const sy = scene.layout.height / vh;
      const tx = scene.layout.x - sx * vx;
      const ty = scene.layout.y - sy * vy;
      const style: SvgStyle = {
        transform: `translate(${tx}px, ${ty}px) scale(${sx}, ${sy})`,
        'transform-box': 'view-box',
        'transform-origin': '0px 0px',
      };
      current = [{ tag: 'g', attrs: {}, style, children: current }];
    }
    return current;
  };

  if (snapshotAt !== undefined) {
    return { decorate: decorateSnapshot, wrapCamera: wrapCameraSnapshot, styleNode: () => undefined };
  }

  return { decorate, wrapCamera, styleNode };
};
