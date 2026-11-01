import type { ScenePrimitive } from '../../contract';
import { guardProviderOutput } from '../../resolve';
import { snapshotProviderOutputJson } from '../shared';

/** 将定义作者的已类型化图元输出物化为独立 JSON 快照，不维护能力专属字段白名单 */
export const materializeScenePrimitives = (owner: string, emitted: Iterable<ScenePrimitive>): Array<ScenePrimitive> =>
  guardProviderOutput(owner, () =>
    Array.from(emitted, primitive => snapshotProviderOutputJson(owner, primitive, 'Scene primitive')),
  );
