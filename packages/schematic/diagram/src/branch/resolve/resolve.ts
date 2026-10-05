import { RetikzDiagramError, RetikzDiagramErrorCode } from '../../errors';
import type { IRBranchDiagram } from '../schemas';
import { BranchLayoutIntentSchema, BranchNodeLayoutSchema, BranchNodeSchema } from '../schemas';
import type { CanonicalBranchDiagram } from './types';

/** 校验有序路径引用并生成稳定拓扑序；不保存第二份边事实源 */
export const resolveBranchDiagram = (source: IRBranchDiagram): CanonicalBranchDiagram => {
  const fail = (message: string, path: Array<string | number>, topology = false): never => {
    throw new RetikzDiagramError({
      code: topology ? RetikzDiagramErrorCode.BranchTopologyInvalid : RetikzDiagramErrorCode.BranchReferenceInvalid,
      message,
      details: { stage: 'resolve', path },
    });
  };
  const byId = new Map(source.nodes.map(node => [node.id, node]));
  if (byId.size !== source.nodes.length) fail('Branch node ids must be unique.', ['nodes']);
  const branches = new Set<string>();
  const used = new Set<string>();
  const edges = new Map(source.nodes.map(node => [node.id, new Set<string>()]));
  const indegree = new Map(source.nodes.map(node => [node.id, 0]));
  source.branches.forEach((branch, index) => {
    if (branches.has(branch.id)) fail('Branch ids must be unique.', ['branches', index, 'id']);
    branches.add(branch.id);
    const members = new Set<string>();
    branch.nodes.forEach((id, memberIndex) => {
      const path = ['branches', index, 'nodes', memberIndex];
      if (!byId.has(id)) fail(`Unknown Branch node '${id}'.`, path);
      if (members.has(id)) fail(`Repeated node '${id}' in a branch.`, path, true);
      members.add(id);
      used.add(id);
      if (memberIndex > 0) {
        const previous = branch.nodes[memberIndex - 1];
        const targets = edges.get(previous)!;
        if (!targets.has(id)) {
          targets.add(id);
          indegree.set(id, indegree.get(id)! + 1);
        }
      }
    });
  });
  if (source.mainBranch !== undefined && !branches.has(source.mainBranch)) fail('Unknown mainBranch.', ['mainBranch']);
  source.nodes.forEach((node, index) => {
    if (!used.has(node.id)) fail(`Unused Branch node '${node.id}'.`, ['nodes', index]);
  });
  const order: Array<string> = [];
  const remaining = new Set(byId.keys());
  while (remaining.size > 0) {
    const id = source.nodes.find(node => remaining.has(node.id) && indegree.get(node.id) === 0)?.id;
    if (id === undefined) return fail('Branch progression must be acyclic.', ['branches'], true);
    remaining.delete(id);
    order.push(id);
    for (const target of edges.get(id)!) indegree.set(target, indegree.get(target)! - 1);
  }
  return {
    source,
    layout: BranchLayoutIntentSchema.parse(source.layout ?? {}),
    nodes: order.map(id => {
      const { labels, layout, shape, ...node } = byId.get(id)!;
      return {
        ...node,
        type: 'node',
        position: [0, 0],
        shape: BranchNodeSchema.shape.shape.parse(shape),
        ...(labels === undefined ? {} : { label: labels }),
        layout: { ...BranchNodeLayoutSchema.parse(layout ?? {}), padding: 0, margin: 0 },
      };
    }),
  };
};
