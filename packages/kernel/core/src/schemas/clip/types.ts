import type { ValueOf } from '@retikz/foundation';
import type { z } from 'zod';

import type { IRJsonObject } from '../json';
import type { ClipFillRule } from './constants';
import type { RectClipSchema } from './schema';

/** 裁切路径填充规则取值 */
export type ClipFillRuleValue = ValueOf<typeof ClipFillRule>;

/** 裁切路径填充规则 IR 类型 */
export type IRClipFillRule = ClipFillRuleValue;

/** 矩形裁切 IR 类型 */
export type IRRectClip = z.infer<typeof RectClipSchema>;

/** 自定义裁切 IR 类型：`kind` 对应 compile options 中注册的 clip provider */
export type IRCustomClip = IRJsonObject & { kind: string };

/** 裁切 IR 类型：Core 仅提供基础分支，其余 kind 通过 provider 扩展 */
export type IRClip = IRRectClip | IRCustomClip;
