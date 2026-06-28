import type { z } from 'zod';
import { type IRComposite } from '../composite';
import { type IRCoordinate } from '../coordinate';
import { type IRNode } from '../node';
import { type IRPathBase } from '../path';
import { type IRScope } from '../scope';
import type { SceneSchema, ViewBoxSchema } from './schema';

/**
 * 顶层 Scene 的子节点：tier1 node / path / coordinate / scope，或 tier2 composite（有 namespace）
 * @description 手写而非 z.infer 派生，与 ScopeSchema 互递归（scope.children 也是 IRChild[]）
 */
export type IRChild = IRNode | IRPathBase | IRCoordinate | IRScope | IRComposite;

/** 显式视框 IR 类型 `{ x, y, width, height }` */
export type IRViewBox = z.infer<typeof ViewBoxSchema>;

/** retikz IR 顶层 Scene——可序列化 JSON 形式的绘制描述 */
export type IR = z.infer<typeof SceneSchema>;
