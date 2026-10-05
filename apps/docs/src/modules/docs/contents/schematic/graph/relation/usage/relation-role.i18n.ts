import { GraphStatus } from '@retikz/graph';

/** 关系状态共用文案 */
export const relationStatusOptions = {
  zh: [
    { value: '', label: '无状态' },
    { value: GraphStatus.Error, label: '错误 - error' },
    { value: GraphStatus.Success, label: '成功 - success' },
    { value: GraphStatus.Warning, label: '警告 - warning' },
    { value: GraphStatus.Disabled, label: '禁用 - disabled' },
  ],
  en: [
    { value: '', label: 'No status' },
    { value: GraphStatus.Error, label: 'Error' },
    { value: GraphStatus.Success, label: 'Success' },
    { value: GraphStatus.Warning, label: 'Warning' },
    { value: GraphStatus.Disabled, label: 'Disabled' },
  ],
} as const;
