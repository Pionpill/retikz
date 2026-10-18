import type { Lang } from '@/i18n';

/** 增量更新机制图文案 */
export const text: Record<Lang, Record<string, [string, string]>> = {
  zh: {
    edge0: ['fallback', ''],
    edge1: ['incremental', ''],
    prepare: ['prepareProcessingInput', 'Vanilla 整理新输入'],
    runtime: ['RuntimeManager.update', '准备来源与调度计算'],
    update: ['createCoreComputation', 'update 尝试局部编译'],
    full: ['prepareSceneCompilation', 'run 执行完整编译'],
    render: ['Render Participant', '验证 Patch 并准备提交'],
    publish: ['publishUpdate', '宿主成功后发布版本'],
  },
  en: {
    edge0: ['fallback', ''],
    edge1: ['incremental', ''],
    prepare: ['prepareProcessingInput', 'Vanilla prepares input'],
    runtime: ['RuntimeManager.update', 'Prepare Sources and schedule'],
    update: ['createCoreComputation', 'update attempts local compile'],
    full: ['prepareSceneCompilation', 'run compiles the whole scene'],
    render: ['Render Participant', 'Validate Patch and prepare'],
    publish: ['publishUpdate', 'Publish after host success'],
  },
};
