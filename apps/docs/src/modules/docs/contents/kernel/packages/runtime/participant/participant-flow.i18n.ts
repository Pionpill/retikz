import type { Lang } from '@/i18n';

/** 提交流程图的双语文案 */
export const participantFlowI18n: Record<
  Lang,
  Record<'prepare' | 'commit' | 'read' | 'publish' | 'dispose', string>
> = {
  zh: {
    prepare: 'prepare\n准备全部对象',
    commit: 'commit\n应用全部修改',
    read: 'read\n收集读取视图',
    publish: '发布\n版本与状态',
    dispose: '通知与清理\n旧值及临时资源',
  },
  en: {
    prepare: 'prepare\nStage all objects',
    commit: 'commit\nApply all changes',
    read: 'read\nCollect read views',
    publish: 'Publish\nRevision and state',
    dispose: 'Notify and clean up\nOld and temporary data',
  },
};
