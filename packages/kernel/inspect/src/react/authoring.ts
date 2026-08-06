import type { IRJsonObject } from '@retikz/core';
import type { LayoutAuthoringSite } from '@retikz/react';

import type { InspectionSelectionRule, InspectorKey } from '../shared';

const INSPECTION_REACT_AUTHORING_TOKEN = Object.freeze({});

/** React 可选 wrapper 声明的一项 Inspector request */
export type InspectionReactRequest = Readonly<{
  /** 要请求的 Inspector key */
  inspector: InspectorKey;
  /** sparse options、true 或继承关闭 false */
  value: false | true | IRJsonObject;
}>;

/** React wrapper 可声明一个 request、多个 request，或 barrier */
export type InspectionReactAuthoringInput = false | InspectionReactRequest | ReadonlyArray<InspectionReactRequest>;

type InspectionReactAuthoring = Readonly<{
  token: typeof INSPECTION_REACT_AUTHORING_TOKEN;
  input: InspectionReactAuthoringInput;
}>;

/** 创建只由 Inspect React driver 识别的 opaque authoring 标记 */
export const createInspectionReactAuthoring = (input: InspectionReactAuthoringInput): InspectionReactAuthoring =>
  Object.freeze({ token: INSPECTION_REACT_AUTHORING_TOKEN, input });

/** 读取基础 React adapter 报告的 opaque Inspect authoring 标记 */
const readInspectionReactAuthoring = (site: LayoutAuthoringSite): InspectionReactAuthoring | undefined => {
  const candidate = Reflect.get(site.props, 'authoring');
  if (typeof candidate !== 'object' || candidate === null) return undefined;
  return Reflect.get(candidate, 'token') === INSPECTION_REACT_AUTHORING_TOKEN
    ? (candidate as InspectionReactAuthoring)
    : undefined;
};

/** 把一个 React authored site 的可选标记转换为通用 InspectionSelection rules */
export const inspectionRulesFromReactSite = (site: LayoutAuthoringSite): ReadonlyArray<InspectionSelectionRule> => {
  const authoring = readInspectionReactAuthoring(site);
  if (authoring === undefined) return Object.freeze([]);
  const target =
    site.kind === 'scene'
      ? ({ kind: 'scene' } as const)
      : site.kind === 'scope'
        ? ({ kind: 'subtree', sourcePath: site.sourcePath } as const)
        : ({ kind: 'self', locator: { kind: 'authored', sourcePath: site.sourcePath } } as const);
  if (authoring.input === false) {
    if (target.kind === 'self') throw new Error('Inspect React barrier is only valid for Layout or Scope authoring');
    return Object.freeze([Object.freeze({ kind: 'barrier', target })]);
  }
  const requests = Array.isArray(authoring.input) ? authoring.input : [authoring.input];
  return Object.freeze(
    requests.map(request =>
      Object.freeze({ kind: 'request' as const, inspector: request.inspector, target, value: request.value }),
    ),
  );
};
