import type { InputFlowEntity } from '@retikz/diagram-vanilla/flow';

import type { Lang } from '@/i18n';

export type InspectObserverBatchFlowI18n = Readonly<{
  admit: InputFlowEntity['text'];
  occurrence1: InputFlowEntity['text'];
  occurrence2: InputFlowEntity['text'];
  callback: InputFlowEntity['text'];
  fragment: InputFlowEntity['text'];
  layers: InputFlowEntity['text'];
  requestSite: InputFlowEntity['text'];
  observe: InputFlowEntity['text'];
  captured: InputFlowEntity['text'];
  resolveLabel: string;
  complete: InputFlowEntity['text'];
  inspectionPlane: InputFlowEntity['text'];
}>;

export const inspectObserverBatchFlowI18n: Record<Lang, InspectObserverBatchFlowI18n> = {
  zh: {
    admit: [
      'admitInspectionSelection()',
      { text: '校验规则并准备 admitted rules', fill: 'gray', font: { size: 'sm' } },
    ],
    occurrence1: 'occurrence 1',
    occurrence2: 'occurrence N',
    callback: ['inspect()', { text: '校验 subject 后生成辅助 IR', fill: 'gray', font: { size: 'sm' } }],
    fragment: ['compileFragment()', { text: '隔离编译辅助片段', fill: 'gray', font: { size: 'sm' } }],
    layers: ['inspectionPlaneToReadonlyLayers()', { text: '宿主接入只读图层', fill: 'gray', font: { size: 'sm' } }],
    requestSite: [
      'canInspectionSelectionRequestSite()',
      { text: '判断站点是否需要发布观测', fill: 'gray', font: { size: 'sm' } },
    ],
    observe: ['observe() × N', { text: '逐个通知', fill: 'gray', font: { size: 'sm' } }],
    captured: ['CapturedObservation[]', { text: '被观测集', fill: 'gray', font: { size: 'sm' } }],
    resolveLabel: 'resolveAdmittedInspectionSelection()\n匹配最终实例并级联 options',
    complete: ['complete()', { text: '一次收口', fill: 'gray', font: { size: 'sm' } }],
    inspectionPlane: ['InspectionPlane', { text: '辅助场景集合', fill: 'gray', font: { size: 'sm' } }],
  },
  en: {
    admit: [
      'admitInspectionSelection()',
      { text: 'Validate rules and prepare admitted rules', fill: 'gray', font: { size: 'sm' } },
    ],
    occurrence1: 'occurrence 1',
    occurrence2: 'occurrence N',
    callback: ['inspect()', { text: 'Validate subject; create auxiliary IR', fill: 'gray', font: { size: 'sm' } }],
    fragment: ['compileFragment()', { text: 'Compile auxiliary fragments', fill: 'gray', font: { size: 'sm' } }],
    layers: [
      'inspectionPlaneToReadonlyLayers()',
      { text: 'Deliver host readonly layers', fill: 'gray', font: { size: 'sm' } },
    ],
    requestSite: [
      'canInspectionSelectionRequestSite()',
      { text: 'Decide whether a site should publish observation', fill: 'gray', font: { size: 'sm' } },
    ],
    observe: ['observe() × N', { text: 'Notify each result', fill: 'gray', font: { size: 'sm' } }],
    captured: ['CapturedObservation[]', { text: 'Captured observations', fill: 'gray', font: { size: 'sm' } }],
    resolveLabel: 'resolveAdmittedInspectionSelection()\nMatch final instances and cascade options',
    complete: ['complete()', { text: 'Finalize once', fill: 'gray', font: { size: 'sm' } }],
    inspectionPlane: ['InspectionPlane', { text: 'Auxiliary scenes', fill: 'gray', font: { size: 'sm' } }],
  },
};
