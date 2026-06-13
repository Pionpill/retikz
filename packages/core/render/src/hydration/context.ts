/**
 * 水合 runtime 上下文：renderer 无关的 `(event, context)` 第二参构造
 * @description handler 命中 id 后拿到的「按 id 聚合的语义元素」上下文——id / meta(provenance) / 几何（同 id
 *   全部图元并集 bbox）/ DOM element / scene 指针坐标 / 动画控制 / scene。compile 会把同一 user id stamp 到多个
 *   平铺 shape 图元，故 context 表达的是「用户交互的那个语义元素」（由 id 标识），不是单个 primitive。各 runtime
 *   （vanilla / react）经 `createContextBuilder` 注入 renderer 专有片段（element 定位 / 指针逆映射 / 动画句柄），
 *   Scene-派生字段（meta / geometry / scene）在无 scene 时缺省、animation 在无 runtime 时 no-op。
 */
import type { IRJsonObject, Layout, Scene, ScenePrimitive } from '@retikz/core';
import type { IdClockRegistry } from '../animation/id-clock';
import { pathControlPoints } from '../shared/path-command';

/**
 * handler 内的动画控制（缺省作用于命中元素，传 id 控别的元素）
 * @description SVG per-id 强（查 `data-retikz-id` / `data-retikz-animation-owner` 全部命中元素的 `getAnimations()`）；
 *   Canvas coarse（scene 级单时钟，id 参数当前忽略）；无 runtime / scene 时各方法 no-op。
 */
export type HydrationAnimationControls = {
  /** 播放 / 继续（manual track 或已暂停的） */
  play: (id?: string) => void;
  /** 暂停（保留当前时刻） */
  pause: (id?: string) => void;
  /** 从头重播 */
  restart: (id?: string) => void;
  /** 停止并回 settled 终态 */
  stop: (id?: string) => void;
  /** 跳到时刻（毫秒） */
  seek: (timeMs: number, id?: string) => void;
};

/** 语义元素聚合几何（scene user units） */
export type HydrationGeometry = {
  /** 同 id 全部图元的并集轴对齐包围盒 */
  bbox: { x: number; y: number; width: number; height: number };
  /** 并集 bbox 中心 */
  center: [number, number];
};

/**
 * 水合 handler 第二参：renderer 无关的 runtime 上下文
 * @description context 永远传入（绝不 undefined）；信息不全表现为字段缺省（`meta` / `geometry` / `scene` 可选、
 *   `animation` 各方法可 no-op）而非「无 context」。抄 LangChain config——以后加字段不动 handler 签名。
 */
export type HydrationContext = {
  /** 命中的语义元素 id（user id）；同 id 的多个平铺图元聚合视为「一个元素」 */
  id: string;
  /** provenance：同 id 图元共享的 meta（认 datum / series / layer）；无 / 无 scene 时 undefined */
  meta?: IRJsonObject;
  /** 渲染后端 */
  renderer: 'svg' | 'canvas';
  /** 命中 DOM 元素：SVG = 被点中的那片 `data-retikz-id` 图元；Canvas → null（无逐元素 DOM，用 `root` + `point`） */
  element: Element | null;
  /** figure 根（svg root 或 canvas） */
  root: Element;
  /** 指针在 scene user units 的坐标（逆 meet-fit）；非指针事件 → null */
  point: { x: number; y: number } | null;
  /** 语义元素聚合几何（scene user units）：同 id 全部图元的并集 bbox + 中心；无 scene 时 undefined */
  geometry?: HydrationGeometry;
  /** 动画控制（缺省作用于命中元素；传 id 控别的元素）；无 runtime / scene 时各方法为 no-op */
  animation: HydrationAnimationControls;
  /** 当前 Scene：逃生舱；standalone `hydrate` 未传 scene 时 undefined */
  scene?: Scene;
};

/** 命中 id 后构造上下文：控制器恒以 `handler(event, buildContext(event, id))` 调用 */
export type BuildContext = (event: Event, id: string) => HydrationContext;

/** 各方法皆 no-op 的动画控制（无 scene / runtime 时用） */
export const noopAnimationControls: HydrationAnimationControls = {
  play: () => undefined,
  pause: () => undefined,
  restart: () => undefined,
  stop: () => undefined,
  seek: () => undefined,
};

// ── Scene 按 id 聚合查询（meta / geometry，renderer 无关） ──────────────────────

/** 深度优先找首个匹配 id 的图元的 meta（同 id 共享）；无则 undefined */
export const metaOf = (scene: Scene, id: string): IRJsonObject | undefined => {
  const walk = (prims: ReadonlyArray<ScenePrimitive>): IRJsonObject | undefined => {
    for (const prim of prims) {
      if (prim.id === id && prim.meta !== undefined) return prim.meta;
      if (prim.type === 'group') {
        const found = walk(prim.children);
        if (found !== undefined) return found;
      }
    }
    return undefined;
  };
  return walk(scene.primitives);
};

/** 2x3 仿射矩阵（canvas 同序 a,b,c,d,e,f）：[x',y'] = [a·x+c·y+e, b·x+d·y+f] */
type Matrix = [number, number, number, number, number, number];
const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

/** 复合 C = A∘B（先 B 后 A，即 C(p) = A(B(p))），用于把子帧变换叠到父帧 */
const multiply = (a: Matrix, b: Matrix): Matrix => [
  a[0] * b[0] + a[2] * b[1],
  a[1] * b[0] + a[3] * b[1],
  a[0] * b[2] + a[2] * b[3],
  a[1] * b[2] + a[3] * b[3],
  a[0] * b[4] + a[2] * b[5] + a[4],
  a[1] * b[4] + a[3] * b[5] + a[5],
];

/** 把一个点经矩阵映射到父帧 */
const applyMatrix = (m: Matrix, x: number, y: number): [number, number] => [
  m[0] * x + m[2] * y + m[4],
  m[1] * x + m[3] * y + m[5],
];

const DEG_TO_RAD = Math.PI / 180;

/** group Transform 列表折成单矩阵（与 canvas applyTransform 同序：按数组顺序左乘进当前帧） */
const transformsToMatrix = (
  transforms: ReadonlyArray<{ kind: string; x?: number; y?: number; degrees?: number; cx?: number; cy?: number }>,
): Matrix => {
  let m = IDENTITY;
  for (const t of transforms) {
    if (t.kind === 'translate') {
      m = multiply(m, [1, 0, 0, 1, t.x ?? 0, t.y ?? 0]);
    } else if (t.kind === 'scale') {
      m = multiply(m, [t.x ?? 1, 0, 0, t.y ?? t.x ?? 1, 0, 0]);
    } else if (t.kind === 'rotate') {
      const rad = (t.degrees ?? 0) * DEG_TO_RAD;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const cx = t.cx ?? 0;
      const cy = t.cy ?? 0;
      m = multiply(m, [1, 0, 0, 1, cx, cy]);
      m = multiply(m, [cos, sin, -sin, cos, 0, 0]);
      m = multiply(m, [1, 0, 0, 1, -cx, -cy]);
    }
  }
  return m;
};

type BBox = { minX: number; minY: number; maxX: number; maxY: number };

/** 把一组局部点经矩阵映射后并入 bbox（in-place 返回新 bbox / 初始 undefined） */
const includePoints = (bbox: BBox | undefined, m: Matrix, points: Array<[number, number]>): BBox | undefined => {
  let out = bbox;
  for (const [px, py] of points) {
    const [x, y] = applyMatrix(m, px, py);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    out = out
      ? { minX: Math.min(out.minX, x), minY: Math.min(out.minY, y), maxX: Math.max(out.maxX, x), maxY: Math.max(out.maxY, y) }
      : { minX: x, minY: y, maxX: x, maxY: y };
  }
  return out;
};

/** 单个叶子图元（rect/ellipse/text/path）的局部角点（path 用控制点松包围，足够作聚合几何） */
const leafCorners = (prim: ScenePrimitive): Array<[number, number]> => {
  switch (prim.type) {
    case 'rect':
      return [
        [prim.x, prim.y],
        [prim.x + prim.width, prim.y],
        [prim.x + prim.width, prim.y + prim.height],
        [prim.x, prim.y + prim.height],
      ];
    case 'ellipse': {
      const corners: Array<[number, number]> = [
        [prim.cx - prim.rx, prim.cy - prim.ry],
        [prim.cx + prim.rx, prim.cy - prim.ry],
        [prim.cx + prim.rx, prim.cy + prim.ry],
        [prim.cx - prim.rx, prim.cy + prim.ry],
      ];
      // 旋转椭圆：角点绕中心旋转后并集 bbox 才不偏小（与 hitTest 端的 rotate 处理一致）
      if (!prim.rotate) return corners;
      const rad = prim.rotate * DEG_TO_RAD;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      return corners.map(([x, y]): [number, number] => {
        const dx = x - prim.cx;
        const dy = y - prim.cy;
        return [prim.cx + dx * cos - dy * sin, prim.cy + dx * sin + dy * cos];
      });
    }
    case 'text': {
      const left = prim.align === 'middle' ? prim.x - prim.measuredWidth / 2 : prim.align === 'end' ? prim.x - prim.measuredWidth : prim.x;
      const top = prim.baseline === 'top' ? prim.y : prim.baseline === 'middle' ? prim.y - prim.measuredHeight / 2 : prim.y - prim.measuredHeight;
      return [
        [left, top],
        [left + prim.measuredWidth, top],
        [left + prim.measuredWidth, top + prim.measuredHeight],
        [left, top + prim.measuredHeight],
      ];
    }
    case 'path':
      // path 叶子用控制点松包围（足够作聚合几何）；与 drawScene pathBBox 同口径，共用 pathControlPoints
      return pathControlPoints(prim.commands);
    default:
      return [];
  }
};

/** 把图元子树（叶子角点）经累积矩阵并入 bbox；group 复合自身 transforms 再下钻全部后代 */
const accumulateSubtree = (prim: ScenePrimitive, m: Matrix, bbox: BBox | undefined): BBox | undefined => {
  if (prim.type === 'group') {
    const childMatrix = prim.transforms && prim.transforms.length > 0 ? multiply(m, transformsToMatrix(prim.transforms)) : m;
    let out = bbox;
    for (const child of prim.children) out = accumulateSubtree(child, childMatrix, out);
    return out;
  }
  return includePoints(bbox, m, leafCorners(prim));
};

/**
 * 同 id 全部图元的并集几何（scene user units）
 * @description 走 scene 树（累积 group transform），命中 id 的图元（叶子或 group）取其整棵子树叶子角点并集——
 *   覆盖「纯几何 Node 多平铺 shape 共享 id」与「文本 / rotate Node 单 GroupPrim 持 id」两种 stamp 形态。
 *   无匹配 / 无可解析几何 → undefined。
 */
export const geometryOf = (scene: Scene, id: string): HydrationGeometry | undefined => {
  let bbox: BBox | undefined;
  const walk = (prims: ReadonlyArray<ScenePrimitive>, m: Matrix): void => {
    for (const prim of prims) {
      if (prim.id === id) bbox = accumulateSubtree(prim, m, bbox);
      if (prim.type === 'group') {
        const childMatrix = prim.transforms && prim.transforms.length > 0 ? multiply(m, transformsToMatrix(prim.transforms)) : m;
        walk(prim.children, childMatrix);
      }
    }
  };
  walk(scene.primitives, IDENTITY);
  if (!bbox) return undefined;
  const width = bbox.maxX - bbox.minX;
  const height = bbox.maxY - bbox.minY;
  return {
    bbox: { x: bbox.minX, y: bbox.minY, width, height },
    center: [bbox.minX + width / 2, bbox.minY + height / 2],
  };
};

// ── renderer 专有片段（element / point / animation）的可复用实现 ────────────────

/** 转义属性选择器值（防 id 含引号 / 反斜杠破坏选择器） */
const escapeAttr = (value: string): string => value.replace(/["\\]/g, '\\$&');

/**
 * SVG per-id 动画控制：查 `[data-retikz-id]` + `[data-retikz-animation-owner]` 全部命中元素的 `getAnimations()`
 * @description 覆盖元素自身的 CSS load 动画 / WAAPI 交互动画、以及承载 transform / camera 的 wrapper `<g>`（无
 *   `data-retikz-id`、但有 `data-retikz-animation-owner`）。`getAnimations` 同时返回 CSSAnimation + WAAPI，配
 *   owner 属性定位最完整。`defaultId` = 命中元素 id（`id` 省略时用它）。缺 `getAnimations` 的环境优雅退化为空。
 */
export const createSvgAnimationControls = (root: Element, defaultId: string): HydrationAnimationControls => {
  const animationsFor = (id: string): Array<Animation> => {
    const escaped = escapeAttr(id);
    const elements = root.querySelectorAll(`[data-retikz-id="${escaped}"],[data-retikz-animation-owner="${escaped}"]`);
    const out: Array<Animation> = [];
    elements.forEach(element => {
      const getAnimations = (element as Element & { getAnimations?: () => Array<Animation> }).getAnimations;
      if (typeof getAnimations === 'function') out.push(...getAnimations.call(element));
    });
    return out;
  };
  const forEach = (id: string | undefined, fn: (animation: Animation) => void): void => {
    for (const animation of animationsFor(id ?? defaultId)) {
      try {
        fn(animation);
      } catch {
        // infinite track 的 finish() 等会抛 InvalidStateError——逐个 try 隔离，不连累其余动画
      }
    }
  };
  return {
    play: id => forEach(id, animation => animation.play()),
    pause: id => forEach(id, animation => animation.pause()),
    restart: id =>
      forEach(id, animation => {
        animation.cancel();
        animation.play();
      }),
    stop: id => forEach(id, animation => animation.finish()),
    seek: (timeMs, id) =>
      forEach(id, animation => {
        animation.currentTime = timeMs;
      }),
  };
};

/** scene 级时钟句柄（rAF 共享时钟） */
type ClockHandle = { play: () => void; pause: () => void; seek: (timeMs: number) => void } | undefined;

/** stop 落 settled 用的 seek 时刻：远超任何有限动画时长，使 evaluateTrack fill-forward 到末态 */
const SETTLED_SEEK_MS = Number.MAX_SAFE_INTEGER;

/**
 * Canvas coarse 动画控制：作用于 scene 级单 rAF 时钟（id 参数忽略）
 * @description per-id 控制不可用（无登记表）时的降级；restart 走 `seek(0)+play`。无时钟 → no-op。
 *   `stop` 落 **settled 末态**（与 SVG `finish` / per-id `stop` 一致，非定格当前帧）：scene 级时钟无 per-id
 *   skip 机制，故 seek 到远超任何有限动画时长处让各 track fill-forward 到末态，再 pause 定格。无限循环动画无
 *   settled 末态（与 SVG `finish` 同样语义未定），会落在循环某相位。
 */
export const createClockAnimationControls = (clock: ClockHandle): HydrationAnimationControls => {
  if (!clock) return noopAnimationControls;
  return {
    play: () => clock.play(),
    pause: () => clock.pause(),
    restart: () => {
      clock.seek(0);
      clock.play();
    },
    stop: () => {
      clock.seek(SETTLED_SEEK_MS);
      clock.pause();
    },
    seek: timeMs => clock.seek(timeMs),
  };
};

/** createCanvasIdAnimationControls 的 runtime 依赖（registry + 时钟 + 重绘） */
export type CanvasIdControlsDeps = {
  /** 按 id 的虚拟时钟登记表 */
  registry: IdClockRegistry;
  /** 当前全局时钟时刻（毫秒）；缺时钟时返回 0 */
  clockTime: () => number;
  /** 确保 rAF 时钟在跑（play / restart / seek 后调用，使有效时刻推进） */
  ensurePlaying: () => void;
  /** 立即按当前状态重绘一帧（pause / stop 即时反映；时钟在跑时可省，但调用幂等无害） */
  renderFrame: () => void;
  /** 命中元素 id（`id` 省略时默认作用于它） */
  defaultId: string;
};

/**
 * Canvas per-id 动画控制：在 scene 级单 rAF 时钟之上经 IdClockRegistry 给每个 id 叠加独立虚拟时钟
 * @description `ctx.animation.restart(id)` 等只影响该 id（缺省命中元素）：登记表记 offset / pause / active / stop，
 *   `drawScene` 经 `resolvePrimAnimation` 折算各 id 有效时刻。play / restart / seek 后确保时钟在跑；每次操作后重绘一帧。
 */
export const createCanvasIdAnimationControls = (deps: CanvasIdControlsDeps): HydrationAnimationControls => {
  const { registry, clockTime, ensurePlaying, renderFrame, defaultId } = deps;
  const target = (id: string | undefined): string => id ?? defaultId;
  return {
    play: id => {
      registry.play(target(id), clockTime());
      ensurePlaying();
      renderFrame();
    },
    pause: id => {
      registry.pause(target(id), clockTime());
      renderFrame();
    },
    restart: id => {
      registry.restart(target(id), clockTime());
      ensurePlaying();
      renderFrame();
    },
    stop: id => {
      registry.stop(target(id));
      renderFrame();
    },
    seek: (timeMs, id) => {
      registry.seek(target(id), timeMs, clockTime());
      ensurePlaying();
      renderFrame();
    },
  };
};

/**
 * 经 scene layout 逆 meet-fit 把指针 client 像素映射成 scene user units（svg / canvas 共用口径）
 * @description 读 `root.getBoundingClientRect()` 降到局部 CSS 像素，去 letterbox offset、除 scale、加 layout origin
 *   （镜像 canvas `clientToScene` / `preserveAspectRatio=meet`）。非指针事件（无 clientX）/ 退化尺寸 → null。
 */
export const resolvePointViaLayout =
  (root: Element, layout: Layout) =>
  (event: Event): { x: number; y: number } | null => {
    const mouse = event as MouseEvent;
    if (typeof mouse.clientX !== 'number') return null;
    const rect = root.getBoundingClientRect();
    const scale = Math.min(rect.width / layout.width, rect.height / layout.height);
    if (!Number.isFinite(scale) || scale <= 0) return null;
    const offsetX = (rect.width - layout.width * scale) / 2;
    const offsetY = (rect.height - layout.height * scale) / 2;
    return {
      x: (mouse.clientX - rect.left - offsetX) / scale + layout.x,
      y: (mouse.clientY - rect.top - offsetY) / scale + layout.y,
    };
  };

/**
 * 经 svg `getScreenCTM` 把指针映射到 viewBox(user) 坐标（无需 scene；standalone 最小 context 用）
 * @description scene 缺省时无 layout 可逆 meet-fit，改用浏览器原生 CTM（同时含 camera `<g>` 之外的根映射）。
 *   缺 `getScreenCTM` / `createSVGPoint`（jsdom / 非 svg）或非指针事件 → null。
 */
export const resolveSvgPointViaCtm =
  (root: Element) =>
  (event: Event): { x: number; y: number } | null => {
    const mouse = event as MouseEvent;
    if (typeof mouse.clientX !== 'number') return null;
    const svg = root as Element & { getScreenCTM?: () => DOMMatrix | null; createSVGPoint?: () => DOMPoint };
    if (typeof svg.getScreenCTM !== 'function' || typeof svg.createSVGPoint !== 'function') return null;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const point = svg.createSVGPoint();
    point.x = mouse.clientX;
    point.y = mouse.clientY;
    const local = point.matrixTransform(ctm.inverse());
    return { x: local.x, y: local.y };
  };

/** SVG 命中元素定位：从事件 target 上溯最近 `data-retikz-id` 图元（多图元 Node 时是被点中那片） */
export const resolveSvgElement = (event: Event): Element | null => {
  const target = event.target;
  if (!(target instanceof Element)) return null;
  return target.closest('[data-retikz-id]');
};

/** createContextBuilder 的 renderer 专有片段 */
export type ContextSources = {
  /** 渲染后端 */
  renderer: 'svg' | 'canvas';
  /** figure 根（svg root / canvas） */
  root: Element;
  /**
   * 当前 Scene；缺省 → meta / geometry / scene 字段缺省、animation no-op（standalone 最小 context）。
   * 传 getter（`() => Scene`）支持 live scene——mount 后 `update()` 换图时每次命中读最新 Scene。
   */
  scene?: Scene | (() => Scene | undefined);
  /** 命中 DOM 元素定位（svg = closest；canvas = () => null） */
  resolveElement: (event: Event, id: string) => Element | null;
  /** 指针逆映射到 scene user units（非指针事件 → null） */
  resolvePoint: (event: Event) => { x: number; y: number } | null;
  /** 据命中 id 造动画控制（缺省作用于命中元素）；无 runtime → noopAnimationControls */
  makeAnimation: (defaultId: string) => HydrationAnimationControls;
};

/**
 * 组装 `buildContext`：命中 id → 完整 `HydrationContext`
 * @description renderer 无关骨架——meta / geometry 经 scene 按 id 聚合查询；element / point / animation 由 `sources`
 *   注入的 renderer 专有片段提供。无 scene → meta / geometry / scene 缺省。context 永远完整对象（绝不 undefined）。
 */
export const createContextBuilder = (sources: ContextSources): BuildContext => {
  const { renderer, root, scene, resolveElement, resolvePoint, makeAnimation } = sources;
  return (event, id) => {
    const currentScene = typeof scene === 'function' ? scene() : scene;
    return {
      id,
      meta: currentScene ? metaOf(currentScene, id) : undefined,
      renderer,
      element: resolveElement(event, id),
      root,
      point: resolvePoint(event),
      geometry: currentScene ? geometryOf(currentScene, id) : undefined,
      animation: makeAnimation(id),
      scene: currentScene,
    };
  };
};
