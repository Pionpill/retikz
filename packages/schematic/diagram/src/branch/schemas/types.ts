import type { input, output } from 'zod';

import type {
  BranchDiagramArtifactSchema,
  BranchDiagramSchema,
  BranchLayoutIntentSchema,
  BranchNodeSchema,
  BranchSchema,
} from './schema';

export type IRBranchDiagram = Omit<output<typeof BranchDiagramSchema>, 'layout' | 'nodes'> & {
  layout?: IRBranchLayoutIntent;
  nodes: Array<IRBranchNode>;
};

export type IRBranchNode = input<typeof BranchNodeSchema>;

export type IRBranch = input<typeof BranchSchema>;

export type IRBranchLayoutIntent = input<typeof BranchLayoutIntentSchema>;

export type BranchDiagramArtifact = output<typeof BranchDiagramArtifactSchema>;
