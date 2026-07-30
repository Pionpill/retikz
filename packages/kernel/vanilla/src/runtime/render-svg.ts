import { prefersReducedMotion, resolveAnimationEnabled } from '@retikz/render/animation';
import { RetainedRenderError, RetainedRenderErrorCode } from '@retikz/render/runtime';
import { renderToSvgString as buildSvgString } from '@retikz/render/svg';

import type { RenderInput, RenderToStringOptions } from './types';

import { DEFAULT_ID_PREFIX } from './constants';
import { toScene } from './to-scene';

const invalidRenderOptions = (cause: unknown): never => {
  throw new RetainedRenderError({
    code: RetainedRenderErrorCode.RetainedRuntimeInputInvalid,
    cause,
    message: 'Vanilla renderToSvgString options must be a closed plain-data record without mount-only runtime config',
  });
};

/** 捕获并校验 SSR 顶层选项，拒绝被静默忽略的 mount-only 或动态字段 */
const captureRenderToStringOptions = (input: unknown): RenderToStringOptions => {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return invalidRenderOptions(input);
  const prototype = Object.getPrototypeOf(input);
  if (prototype !== Object.prototype && prototype !== null) return invalidRenderOptions(input);
  const allowedKeys = new Set(['output', 'compile', 'animation', 'adapters']);
  const captured: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  for (const key of Reflect.ownKeys(input)) {
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (
      typeof key !== 'string' ||
      !allowedKeys.has(key) ||
      descriptor === undefined ||
      !descriptor.enumerable ||
      !('value' in descriptor)
    ) {
      return invalidRenderOptions(input);
    }
    captured[key] = descriptor.value;
  }
  return Object.freeze(captured);
};

/**
 * 把 IR / Scene / plain spec 渲染成 SVG 字符串（SSR / 构建期）
 * @description 收 IR / Scene / plain spec 时薄包 `@retikz/render/svg`：`toScene`
 *   （ir 缺省走 core fallback measurer、确定性）→ 序列化。`output.width` / `output.height` 直接透传给 render，由其结构化写进根
 *   `<svg>` attrs（不在本层对字符串做正则后处理）。零 DOM
 */
export const renderToSvgString = (input: RenderInput, options: RenderToStringOptions = {}): string => {
  const capturedOptions = captureRenderToStringOptions(options);
  const output = capturedOptions.output ?? {};
  const animation = capturedOptions.animation ?? {};
  const animate = resolveAnimationEnabled(animation.enabled, prefersReducedMotion());
  return buildSvgString(toScene(input, capturedOptions), {
    idPrefix: output.idPrefix ?? DEFAULT_ID_PREFIX,
    animate,
    snapshotAt: animation.snapshotAt,
    easings: animation.easings,
    width: output.width,
    height: output.height,
  });
};
