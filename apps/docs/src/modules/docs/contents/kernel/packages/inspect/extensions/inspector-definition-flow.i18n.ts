import type { InputFlowEntity } from '@retikz/diagram-vanilla/flow';

import type { Lang } from '@/i18n';

export type InspectorDefinitionFlowI18n = Readonly<{
  definition: string;
  finalOutput: InputFlowEntity['text'];
  userOptions: InputFlowEntity['text'];
  subjectSchema: InputFlowEntity['text'];
  mergeOptionsInput: InputFlowEntity['text'];
  optionsSchema: InputFlowEntity['text'];
  resolveOptions: InputFlowEntity['text'];
  inspect: InputFlowEntity['text'];
  ir: InputFlowEntity['text'];
  compile: InputFlowEntity['text'];
  scene: InputFlowEntity['text'];
}>;

export const inspectorDefinitionFlowI18n: Record<Lang, InspectorDefinitionFlowI18n> = {
  zh: {
    definition: 'InspectorDefinition',
    finalOutput: 'Core 最终产物',
    userOptions: '用户 options',
    subjectSchema: ['subjectSchema', { text: '校验 → subject', fill: 'gray', font: { size: 'sm' } }],
    mergeOptionsInput: ['mergeOptionsInput', { text: '可选 · 合并原始配置', fill: 'gray', font: { size: 'sm' } }],
    optionsSchema: ['optionsSchema', { text: '校验与默认值', fill: 'gray', font: { size: 'sm' } }],
    resolveOptions: ['resolveOptions', { text: '→ context.options', fill: 'gray', font: { size: 'sm' } }],
    inspect: 'inspect()',
    ir: '辅助 Core IR',
    compile: 'Core 隔离编译',
    scene: '辅助 Scene',
  },
  en: {
    definition: 'InspectorDefinition',
    finalOutput: 'Core final output',
    userOptions: 'User options',
    subjectSchema: ['subjectSchema', { text: 'Validate → subject', fill: 'gray', font: { size: 'sm' } }],
    mergeOptionsInput: ['mergeOptionsInput', { text: 'Optional · merge input', fill: 'gray', font: { size: 'sm' } }],
    optionsSchema: ['optionsSchema', { text: 'Validate / default', fill: 'gray', font: { size: 'sm' } }],
    resolveOptions: ['resolveOptions', { text: '→ context.options', fill: 'gray', font: { size: 'sm' } }],
    inspect: 'inspect()',
    ir: 'Auxiliary Core IR',
    compile: 'Isolated Core compile',
    scene: 'Auxiliary Scene',
  },
};
