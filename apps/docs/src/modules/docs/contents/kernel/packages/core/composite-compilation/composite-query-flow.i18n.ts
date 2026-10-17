import type { Lang } from '@/i18n';

/** 尺寸查询、完整候选与重放的流程文案 */
export const compositeQueryFlowI18n: Record<
  Lang,
  {
    groups: Array<string>;
    nodes: Array<string>;
    edges: Record<string, string>;
  }
> = {
  zh: {
    groups: ['需要尺寸时', '父项确定最终约束', '提交选中的候选'],
    nodes: [
      'measureChild\n指定提案与查询轴',
      '尺寸缓存\n命中？',
      '按需求求值\n轻量返回 / 完整编译提取',
      '返回尺寸\n成功求值写入缓存',
      '已有合适的\n完整候选？',
      'layoutChild\n按最终约束完整试算',
      '保留完整候选\n图元、边界、引用与资源',
      'replay + children\n指定平移或裁剪，返回句柄',
      '有效样式与\n主题一致？',
      '重新生成子图\n使用最终样式与主题',
      '提交到 Scene\n应用放置外壳，合并贡献',
    ],
    edges: {
      hit: '命中',
      miss: '未命中',
      yes: '有，直接采用',
      no: '无',
      same: '一致',
      changed: '变化',
    },
  },
  en: {
    groups: ['When dimensions are needed', 'Parent chooses final constraints', 'Commit selected candidate'],
    nodes: [
      'measureChild\nProposal and requested axes',
      'Size cache\nhit?',
      'Evaluate dimensions\nEarly return / full compilation',
      'Return dimensions\nCache successful evaluation',
      'Suitable full\ncandidate?',
      'layoutChild\nProbe final constraints',
      'Retain full candidate\nPrimitives, bounds, references',
      'replay + children\nPlace or clip; return handle',
      'Same style\nand theme?',
      'Regenerate child\nUse final style and theme',
      'Commit to Scene\nApply wrapper; merge contributions',
    ],
    edges: {
      hit: 'Hit',
      miss: 'Miss',
      yes: 'Reuse',
      no: 'None',
      same: 'Same',
      changed: 'Changed',
    },
  },
};
