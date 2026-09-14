import type { Lang } from '@/i18n';

/** tex-react-lifecycle 的本地化文案 */
export type TexReactLifecycleI18n = Readonly<{
  label1: string;
  label2: string;
  label3: string;
  label4: string;
  label5: string;
  label6: string;
}>;

/** 按文档语言获取 tex-react-lifecycle 文案 */
export const texReactLifecycleI18n: Record<Lang, TexReactLifecycleI18n> = {
  zh: {
    label1: '配置变更',
    label2: '重置 lowerer',
    label3: '丢弃过期结果',
    label4: '初始化失败',
    label5: '移除失败项',
    label6: '再次挂载',
  },
  en: {
    label1: 'Configuration change',
    label2: 'Reset lowerer',
    label3: 'Discard stale result',
    label4: 'Initialization failure',
    label5: 'Remove failed entry',
    label6: 'Later mount',
  },
};
