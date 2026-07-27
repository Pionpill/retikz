import type { ExternalRow } from '@retikz/data';

/** Table detail 中文布局实验台使用的五行记录集 */
export const tableLayoutPlaygroundRows: Array<ExternalRow> = [
  { name: 'Alpha', group: 'A', score: 92, status: '就绪', note: '负责发布验证' },
  { name: 'Beta', group: 'B', score: 86, status: '评审', note: '复核 API 兼容性' },
  { name: 'Gamma', group: 'A', score: 78, status: '草稿', note: '跟踪文档后续项' },
  { name: 'Delta', group: 'C', score: 88, status: '就绪', note: '维护渲染器测试夹具' },
  { name: 'Epsilon', group: 'B', score: 81, status: '阻塞', note: '检查边界场景覆盖' },
];
