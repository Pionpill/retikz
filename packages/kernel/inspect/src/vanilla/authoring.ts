import type { IRJsonObject } from '@retikz/core';
import type { VanillaAuthoringSite } from '@retikz/vanilla';

import type { InspectionSelectionRule } from '../compile';
import type { InspectorKey } from '../contract';

const INSPECTION_VANILLA_AUTHORING_TOKEN = Object.freeze({});

/** Vanilla 可选 authoring 声明的一项 Inspector request */
export type InspectionVanillaRequest = Readonly<{
  /** 要请求的 Inspector key */
  inspector: InspectorKey;
  /** sparse options、true 或继承关闭 false */
  value: false | true | IRJsonObject;
}>;

/** Vanilla site 可声明一个 request、多个 request，或 barrier */
export type InspectionVanillaAuthoringInput =
  | false
  | InspectionVanillaRequest
  | ReadonlyArray<InspectionVanillaRequest>;

type InspectionVanillaAuthoring = Readonly<{
  token: typeof INSPECTION_VANILLA_AUTHORING_TOKEN;
  input: InspectionVanillaAuthoringInput;
}>;

/** 创建只由 Inspect Vanilla 驱动识别的 opaque authoring 标记 */
export const createInspectionVanillaAuthoring = (input: InspectionVanillaAuthoringInput): InspectionVanillaAuthoring =>
  Object.freeze({ token: INSPECTION_VANILLA_AUTHORING_TOKEN, input });

/** 读取基础 Vanilla adapter 报告的 opaque Inspect authoring 标记 */
const readInspectionVanillaAuthoring = (site: VanillaAuthoringSite): InspectionVanillaAuthoring | undefined => {
  const candidate = site.authoring;
  if (typeof candidate !== 'object' || candidate === null) return undefined;
  return Reflect.get(candidate, 'token') === INSPECTION_VANILLA_AUTHORING_TOKEN
    ? (candidate as InspectionVanillaAuthoring)
    : undefined;
};

/** 把一个 Vanilla authored site 的可选标记转换为通用 InspectionSelection rules */
export const inspectionRulesFromVanillaSite = (site: VanillaAuthoringSite): ReadonlyArray<InspectionSelectionRule> => {
  const authoring = readInspectionVanillaAuthoring(site);
  if (authoring === undefined) return Object.freeze([]);
  const target =
    site.kind === 'scene'
      ? ({ kind: 'scene' } as const)
      : site.kind === 'scope'
        ? ({ kind: 'subtree', sourcePath: site.sourcePath } as const)
        : ({ kind: 'self', locator: { kind: 'authored', sourcePath: site.sourcePath } } as const);
  if (authoring.input === false) {
    if (target.kind === 'self') throw new Error('Inspect Vanilla barrier is only valid for figure or scope authoring');
    return Object.freeze([Object.freeze({ kind: 'barrier', target })]);
  }
  const requests = Array.isArray(authoring.input) ? authoring.input : [authoring.input];
  return Object.freeze(
    requests.map(request =>
      Object.freeze({ kind: 'request' as const, inspector: request.inspector, target, value: request.value }),
    ),
  );
};
