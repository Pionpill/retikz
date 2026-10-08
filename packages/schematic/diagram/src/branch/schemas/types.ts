import type { input, output } from 'zod';

import type {
  BranchDiagramArtifactSchema,
  BranchDiagramSchema,
  BranchLayoutIntentSchema,
  BranchNodeSchema,
  BranchSchema,
} from './schema';

/** 保留节点与布局缺省值尚未物化的分支图作者输入 */
export type IRBranchDiagram = Omit<output<typeof BranchDiagramSchema>, 'layout' | 'nodes' | 'position'> &
  Pick<input<typeof BranchDiagramSchema>, 'position'> & {
    /** 分支方向与净间距覆盖值，由布局解析补齐缺省项 */
    layout?: IRBranchLayoutIntent;
    /** 共享节点目录，保留各节点可省略的尺寸与外观字段 */
    nodes: Array<IRBranchNode>;
  };

export type IRBranchNode = input<typeof BranchNodeSchema>;

export type IRBranch = input<typeof BranchSchema>;

export type IRBranchLayoutIntent = input<typeof BranchLayoutIntentSchema>;

export type BranchDiagramArtifact = output<typeof BranchDiagramArtifactSchema>;
