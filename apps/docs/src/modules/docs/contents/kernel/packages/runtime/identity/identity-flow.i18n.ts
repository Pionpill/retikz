import type { Lang } from '@/i18n';

/** 身份完整流程的双语文案 */
export const identityFlowI18n: Record<
  Lang,
  {
    create: string;
    collect: string;
    compare: string;
    lookup: string;
    equal: string;
    query: string;
    pair: string;
    list: string;
    internal: string;
  }
> = {
  zh: {
    create: 'createRuntimeIdentity\n创建实体身份',
    collect: 'collectIdentities(value)\n捕获后返回完整身份列表',
    compare: 'runtimeIdentityEquals\n比较完整身份',
    lookup: 'createRuntimeIdentityLookup\n校验列表并建立查找表',
    equal: 'boolean\n是否为同一身份',
    query: 'has / values\n查询身份 / 列举集合',
    pair: '两个身份',
    list: '身份列表',
    internal: 'Runtime 内部建立',
  },
  en: {
    create: 'createRuntimeIdentity\nCreate an entity identity',
    collect: 'collectIdentities(value)\nReturn all identities after capture',
    compare: 'runtimeIdentityEquals\nCompare complete identities',
    lookup: 'createRuntimeIdentityLookup\nValidate and build a lookup',
    equal: 'boolean\nWhether identities match',
    query: 'has / values\nQuery / enumerate identities',
    pair: 'Two identities',
    list: 'Identity list',
    internal: 'Built inside Runtime',
  },
};
