import type { BranchDiagramInputEmbedProps } from '@retikz/diagram-vanilla/branch';
import { BranchDiagramInputEmbedAdapter } from '@retikz/diagram-vanilla/branch';
import type { ReactInputEmbedContext } from '@retikz/react';
import { Layout } from '@retikz/react';
import type { AnyInputEmbedAdapter } from '@retikz/vanilla';
import type { FC } from 'react';
import { useId, useMemo } from 'react';

import type { BranchDiagramProps } from './authoring';
import { collectBranchDiagramInput, createBranchDiagramInput, branchDiagramLayoutHostPropsOf } from './authoring';

export type { BranchDiagramLayoutHostProps, BranchDiagramProps } from './authoring';

type BranchEmbeddableComponent<TProps> = FC<TProps> & {
  isTier2Embeddable: true;
  inputEmbedAdapter: AnyInputEmbedAdapter;
  createInputEmbedProps: (props: Readonly<Record<string, unknown>>, context: ReactInputEmbedContext) => unknown;
};

type BranchRuntimeEmbedProps = Readonly<{
  /** 只作为 React embed occurrence identity，不写入 Source */
  id: string;
  input: BranchDiagramInputEmbedProps;
}>;

/** standalone BranchDiagram 内部复用的私有 Branch embed marker */
const BranchRuntimeEmbed = (() => null) as unknown as BranchEmbeddableComponent<BranchRuntimeEmbedProps>;

BranchRuntimeEmbed.displayName = 'BranchRuntimeEmbed';
BranchRuntimeEmbed.isTier2Embeddable = true;
BranchRuntimeEmbed.inputEmbedAdapter = BranchDiagramInputEmbedAdapter;
BranchRuntimeEmbed.createInputEmbedProps = props => (props as BranchRuntimeEmbedProps).input;

const BranchDiagramComponent: FC<BranchDiagramProps> = props => {
  const generatedId = useId();
  const input = useMemo(() => collectBranchDiagramInput(props, false), [props]);
  const {
    shapes,
    boundaries,
    clips,
    arrows,
    patterns,
    pathGenerators,
    pathKinds,
    composites,
    themeStyles,
    ...hostProps
  } = branchDiagramLayoutHostPropsOf(props);

  return (
    <Layout
      {...hostProps}
      extensions={{ shapes, boundaries, clips, arrows, patterns, pathGenerators, pathKinds, composites, themeStyles }}
    >
      <BranchRuntimeEmbed id={input.id ?? generatedId} input={input} />
    </Layout>
  );
};

/** 将 BranchDiagram Source root 接入 React 编写与 Layout 宿主 */
export const BranchDiagram = BranchDiagramComponent as BranchEmbeddableComponent<BranchDiagramProps>;

BranchDiagram.displayName = 'BranchDiagram';
BranchDiagram.isTier2Embeddable = true;
BranchDiagram.inputEmbedAdapter = BranchDiagramInputEmbedAdapter;
BranchDiagram.createInputEmbedProps = createBranchDiagramInput;
