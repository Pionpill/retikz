import type { Lang } from '@/i18n';

/** Runtime 与参与者关系的双语文案 */
export const participantRelationshipI18n: Record<
  Lang,
  Record<'runtime' | 'a' | 'b' | 'viewA' | 'viewB' | 'schedule' | 'read', string>
> = {
  zh: {
    runtime: 'Runtime\n统筹事务与资源释放',
    a: 'Participant A\n实现自己的状态更新逻辑',
    b: 'Participant B\n实现自己的状态更新逻辑',
    viewA: 'A 的读取视图',
    viewB: 'B 的读取视图',
    schedule: '调度生命周期',
    read: '成功发布后可读',
  },
  en: {
    runtime: 'Runtime\nCoordinate transactions and disposal',
    a: 'Participant A\nOwn state-update logic',
    b: 'Participant B\nOwn state-update logic',
    viewA: 'Read view A',
    viewB: 'Read view B',
    schedule: 'Invoke lifecycle',
    read: 'Readable after publication',
  },
};
