import type { Scene, ScenePrimitive } from '@retikz/core';
import { cloneAndFreezeJson } from '@retikz/foundation';

import type { InspectorFragment, InspectorOutput } from '../contract';
import { RetikzInspectError, RetikzInspectErrorCode } from '../error';

/**
 * 校验、脱离并深冻结 JSON-safe plain data
 * @template T JSON 输入与冻结副本共享的结构类型
 */
export const cloneAndFreezeInspectionJson = <T>(value: T, label: string): T => {
  try {
    return cloneAndFreezeJson(value, label);
  } catch (cause) {
    if (cause instanceof RetikzInspectError && cause.code === RetikzInspectErrorCode.Compile) throw cause;
    const message = cause instanceof Error ? cause.message : String(cause);
    throw new RetikzInspectError(RetikzInspectErrorCode.Compile, message, { cause });
  }
};

/** callback output 组装 fragment 并脱离、冻结快照 */
export const snapshotInspectorOutput = (output: InspectorOutput): ReadonlyArray<InspectorFragment> => {
  const outputValues = Array.isArray(output) ? output : [output];
  return Object.freeze(
    outputValues.map((outputValue, index) => {
      const fragment: InspectorFragment =
        outputValue.type === 'fragment'
          ? {
              type: 'fragment',
              coordinateSpace: outputValue.coordinateSpace,
              child: outputValue.child,
            }
          : { type: 'fragment', coordinateSpace: 'local', child: outputValue };
      return cloneAndFreezeInspectionJson(fragment, `Inspector output ${index}`);
    }),
  );
};

const sealPrimitive = (primitive: ScenePrimitive): ScenePrimitive => {
  const sealed = { ...primitive };
  Reflect.deleteProperty(sealed, 'id');
  Reflect.deleteProperty(sealed, 'meta');
  Reflect.deleteProperty(sealed, 'animations');
  if (primitive.type !== 'group') return sealed;

  return { ...sealed, children: primitive.children.map(sealPrimitive) } as ScenePrimitive;
};

/** 移除辅助 Scene 的公共 identity、meta 与 animation，并深冻结保留资源引用 */
export const sealInspectionScene = (scene: Scene): Scene => {
  const sealed: Scene = {
    primitives: scene.primitives.map(sealPrimitive),
    layout: { ...scene.layout },
    ...(scene.resources === undefined ? {} : { resources: structuredClone(scene.resources) }),
  };

  const freeze = <T>(value: T): T => {
    if (value === null || typeof value !== 'object') return value;
    for (const child of Object.values(value)) freeze(child);
    return Object.freeze(value);
  };

  return freeze(sealed);
};
