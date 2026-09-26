import type { Lang } from '@/i18n';

/** Entity 定义注册与查找结构图的双语文案 */
export const entityDefinitionLookupI18n: Record<Lang, Record<string, string>> = {
  zh: {
    builtinSource: 'Entity A · role: activity',
    customRole: 'Entity B · role: service',
    customKind: 'Entity B · kind: service.gateway',
    options: 'ResolvedGraphDefinitionOptions（摘录）',
    activityDefinition: 'ActivityRoleDefinition {…} · 内置',
    serviceDefinition: 'serviceRole {…} · 自定义',
    gatewayDefinition: 'gatewayKind · 自定义',
    builtinResult: 'A 的 CanonicalEntity（摘录）',
    customResult: 'B 的 CanonicalEntity（摘录）',
    noKind: 'undefined',
    roleDefinition: 'roleDefinition',
    kindDefinition: 'kindDefinition',
    customNode: 'Core IRNode\nrectangle · 圆角 8 · padding 14×10',
    scene: 'Core Scene',
    renderer: '@retikz/render\nSVG / Canvas',
  },
  en: {
    builtinSource: 'Entity A · role: activity',
    customRole: 'Entity B · role: service',
    customKind: 'Entity B · kind: service.gateway',
    options: 'ResolvedGraphDefinitionOptions (excerpt)',
    activityDefinition: 'ActivityRoleDefinition {…} · built-in',
    serviceDefinition: 'serviceRole {…} · custom',
    gatewayDefinition: 'gatewayKind · custom',
    builtinResult: "A's CanonicalEntity (excerpt)",
    customResult: "B's CanonicalEntity (excerpt)",
    noKind: 'undefined',
    roleDefinition: 'roleDefinition',
    kindDefinition: 'kindDefinition',
    customNode: 'Core IRNode\nrectangle · radius 8 · padding 14×10',
    scene: 'Core Scene',
    renderer: '@retikz/render\nSVG / Canvas',
  },
};
