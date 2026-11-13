import type {
  CompiledReferenceGeometry,
  LayoutBoundsContribution,
  LayoutAlignmentGuide,
  CompileWarning,
  ScenePrimitive,
  SceneResources,
} from '@retikz/core';
import { visitSceneContent } from '@retikz/core';

import type { CompileProvenanceSnapshot } from '../../compile/provenance';
import type { NamespaceFrameChange } from '../../compile/runtime';
import type { CompositeArtifact } from '../../compile/shared';
import type { WeaveReferenceRead } from './reference';

/** 输出贡献实际读取的名称及复用校验阶段 */
export type WeaveContributionRead = WeaveReferenceRead &
  Readonly<{
    /** 准备读取与延迟输出读取分别在对应阶段校验 */
    readiness: 'prepare' | 'output';
  }>;

/** 作者实例已经完成的输出贡献，不包含 probe token、回调或可写工作区 */
export type WeaveContribution = Readonly<{
  /** 局部输出与父布局贡献 */
  output: Readonly<{
    /** 已完成的局部图元 */
    primitives: ReadonlyArray<ScenePrimitive>;
    /** 子布局 */
    geometries: ReadonlyArray<CompiledReferenceGeometry>;
    /** 已发布几何 */
    publications: ReadonlyArray<CompiledReferenceGeometry>;
    /** 可见边界 */
    bounds: ReadonlyArray<LayoutBoundsContribution>;
    /** 父布局占位 */
    allocations: ReadonlyArray<LayoutBoundsContribution>;
    /** 对齐事实 */
    alignmentGuides: ReadonlyArray<LayoutAlignmentGuide>;
    /** 领域产物 */
    artifacts: ReadonlyArray<CompositeArtifact>;
  }>;
  /** 与局部图元对应的绘制顺序 */
  zIndices: ReadonlyArray<number | undefined>;
  /** 实例向当前名称空间提交的声明 */
  bindings: ReadonlyArray<NamespaceFrameChange>;
  /** 实例实际读取的外部或内部名称 */
  reads: ReadonlyArray<WeaveContributionRead>;
  /** 图元引用的资源闭包 */
  resources: SceneResources;
  /** 实例诊断；有诊断时由驱动决定重新计算 */
  diagnostics: ReadonlyArray<CompileWarning>;
  /** 可重新绑定到当前来源树的局部事实 */
  provenance?: CompileProvenanceSnapshot;
}>;

/** 从已物化图元收集真实资源依赖，避免保留其它实例的资源 */
export const collectContributionResources = (
  primitives: Array<ScenePrimitive>,
  resources: SceneResources,
): SceneResources => {
  const retained = new Set<string>();
  visitSceneContent({ primitives, resources }, primitive => {
    if (primitive.type === 'group') {
      if (primitive.clipRef !== undefined) retained.add(primitive.clipRef);
    } else if (primitive.type !== 'text') {
      for (const paint of [primitive.fill, primitive.stroke])
        if (typeof paint === 'object' && paint.kind === 'resourceRef') retained.add(paint.id);
    }
  });
  return {
    paints: resources.paints.filter(resource => retained.has(resource.id)),
    clips: resources.clips.filter(resource => retained.has(resource.id)),
  };
};
