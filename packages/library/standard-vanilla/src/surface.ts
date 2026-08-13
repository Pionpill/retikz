import type { IRSurface, SurfaceInput } from '@retikz/standard';
import type { VanillaEmbedSpec, VanillaTier2Adapter, VanillaTier2Contribution } from '@retikz/vanilla';

import { createSurface, SurfaceProvider } from '@retikz/standard';

import { StandardSurfaceVanillaNamespace } from './constants';

type CoreProviderContribution = VanillaTier2Contribution['providerDependencies'];
type SurfaceChild = IRSurface['child'];

/** Vanilla Surface 唯一 child 的运行时 authoring 结果 */
export type SurfaceVanillaChildAuthoring = Readonly<{
  /** 写入 canonical Surface IR 的唯一 child */
  node: SurfaceChild;
  /** child 为 Tier 2 时显式携带的 provider graph contribution */
  providerDependencies?: CoreProviderContribution;
}>;

/** Vanilla Surface 输入由 embed id 派生持久化 Scope id */
export type SurfaceVanillaInput = Omit<SurfaceInput, 'namespace' | 'type' | 'child' | 'id'> & {
  /** 唯一 child 与其可选 Tier 2 依赖 */
  child: SurfaceVanillaChildAuthoring;
};

/** 创建不会进入 IR 的 Vanilla Surface child authoring 结果 */
export const surfaceChild = (
  node: SurfaceChild,
  providerDependencies?: CoreProviderContribution,
): SurfaceVanillaChildAuthoring =>
  Object.freeze({ node, ...(providerDependencies === undefined ? {} : { providerDependencies }) });

/** Standard Surface 的 Vanilla Tier 2 adapter */
export const SurfaceVanillaAdapter: VanillaTier2Adapter<SurfaceVanillaInput> = {
  kind: StandardSurfaceVanillaNamespace,
  lower: (props, context) => {
    const { child, ...input } = props;
    return {
      node: createSurface({
        namespace: 'standard',
        type: 'surface',
        ...input,
        id: `${context.id}/surface`,
        child: child.node,
      }),
      providerDependencies: {
        roots: [SurfaceProvider.key, ...(child.providerDependencies?.roots ?? [])],
        providers: [SurfaceProvider, ...(child.providerDependencies?.providers ?? [])],
      },
    };
  },
};

/** 创建由 SurfaceVanillaAdapter 下沉的 Standard Surface embed */
export const surface = (id: string, input: SurfaceVanillaInput): VanillaEmbedSpec<SurfaceVanillaInput> => ({
  type: 'embed',
  kind: StandardSurfaceVanillaNamespace,
  id,
  props: input,
});
