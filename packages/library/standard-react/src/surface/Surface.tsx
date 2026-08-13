import type { EmbeddableTier2Adapter } from '@retikz/react';
import type { SurfaceInput } from '@retikz/standard';
import type { FC, ReactNode } from 'react';

import { buildIRWithContributions } from '@retikz/react';
import { createSurface, SurfaceProvider } from '@retikz/standard';

import type { StandardEmbeddableComponent } from '../shared';

/** React Surface 组件接受的 Standard authoring 输入 */
export type SurfaceProps = Omit<SurfaceInput, 'namespace' | 'type' | 'child'> & {
  /** 恰好一个可转换为 Core IR 的 Kernel、Sugar 或 Tier 2 child */
  children: ReactNode;
};

const surfaceEmbeddableAdapter: EmbeddableTier2Adapter<SurfaceProps> = {
  displayName: 'Surface',
  contribute: props => {
    const { children, ...input } = props;
    const built = buildIRWithContributions(children);
    if (built.ir.children.length !== 1) {
      throw new Error('Surface children must lower to exactly one IR child.');
    }
    return {
      node: createSurface({
        namespace: 'standard',
        type: 'surface',
        ...input,
        child: built.ir.children[0],
      }),
      compositeDependencies: {
        roots: [SurfaceProvider.key, ...built.contributions.flatMap(contribution => contribution.roots)],
        providers: [SurfaceProvider, ...built.contributions.flatMap(contribution => contribution.providers)],
      },
    };
  },
};

const SurfaceComponent: FC<SurfaceProps> = () => null;

/** Standard Surface 的 React Tier 2 authoring 组件 */
export const Surface = SurfaceComponent as StandardEmbeddableComponent<SurfaceProps>;

Surface.displayName = 'Surface';
Surface.isTier2Embeddable = true;
Surface.embeddableAdapter = surfaceEmbeddableAdapter;
