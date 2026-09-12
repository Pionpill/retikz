import type { InputFlowEntity } from '@retikz/diagram-vanilla/flow';

import type { Lang } from '@/i18n';

export type InspectObserverBatchFlowI18n = Readonly<{
  occurrence1: InputFlowEntity['text'];
  occurrence2: InputFlowEntity['text'];
  occurrence3: InputFlowEntity['text'];
  observe: InputFlowEntity['text'];
  captured: InputFlowEntity['text'];
  complete: InputFlowEntity['text'];
  inspectionPlane: InputFlowEntity['text'];
}>;

export const inspectObserverBatchFlowI18n: Record<Lang, InspectObserverBatchFlowI18n> = {
  zh: {
    occurrence1: 'occurrence 1',
    occurrence2: 'occurrence 2',
    occurrence3: 'occurrence 3',
    observe: ['observe() × N', { text: '逐个通知', fill: 'gray', font: { size: 'sm' } }],
    captured: ['CapturedObservation[]', { text: '被观测集', fill: 'gray', font: { size: 'sm' } }],
    complete: ['complete()', { text: '一次收口', fill: 'gray', font: { size: 'sm' } }],
    inspectionPlane: ['InspectionPlane', { text: '辅助场景集合', fill: 'gray', font: { size: 'sm' } }],
  },
  en: {
    occurrence1: 'occurrence 1',
    occurrence2: 'occurrence 2',
    occurrence3: 'occurrence 3',
    observe: ['observe() × N', { text: 'Notify each result', fill: 'gray', font: { size: 'sm' } }],
    captured: ['CapturedObservation[]', { text: 'Captured observations', fill: 'gray', font: { size: 'sm' } }],
    complete: ['complete()', { text: 'Finalize once', fill: 'gray', font: { size: 'sm' } }],
    inspectionPlane: ['InspectionPlane', { text: 'Auxiliary scenes', fill: 'gray', font: { size: 'sm' } }],
  },
};
