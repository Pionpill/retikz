import type { FlowDiagramInputEmbedProps } from '@retikz/diagram-vanilla/flow';
import type { ReactInputEmbedContext } from '@retikz/react';
import type { AnyInputEmbedAdapter } from '@retikz/vanilla';
import type { FC } from 'react';

import { FlowDiagramInputEmbedAdapter } from '@retikz/diagram-vanilla/flow';
import { Layout } from '@retikz/react';
import { useId, useMemo } from 'react';

import type { FlowDiagramProps } from './authoring';

import { collectFlowDiagramInput, createFlowDiagramInput, flowDiagramLayoutHostPropsOf } from './authoring';

export type { FlowDiagramLayoutHostProps, FlowDiagramProps } from './authoring';

type FlowEmbeddableComponent<TProps> = FC<TProps> & {
  isTier2Embeddable: true;
  inputEmbedAdapter: AnyInputEmbedAdapter;
  createInputEmbedProps: (props: Readonly<Record<string, unknown>>, context: ReactInputEmbedContext) => unknown;
};

type FlowRuntimeEmbedProps = Readonly<{
  /** 只作为 React embed occurrence identity，不写入 Source */
  id: string;
  input: FlowDiagramInputEmbedProps;
}>;

/** standalone FlowDiagram 内部复用的私有 Flow embed marker */
const FlowRuntimeEmbed = (() => null) as unknown as FlowEmbeddableComponent<FlowRuntimeEmbedProps>;

FlowRuntimeEmbed.displayName = 'FlowRuntimeEmbed';
FlowRuntimeEmbed.isTier2Embeddable = true;
FlowRuntimeEmbed.inputEmbedAdapter = FlowDiagramInputEmbedAdapter;
FlowRuntimeEmbed.createInputEmbedProps = props => (props as FlowRuntimeEmbedProps).input;

const FlowDiagramComponent: FC<FlowDiagramProps> = props => {
  const generatedId = useId();
  const input = useMemo(() => collectFlowDiagramInput(props, false), [props]);
  const hostProps = flowDiagramLayoutHostPropsOf(props);
  return (
    <Layout {...hostProps}>
      <FlowRuntimeEmbed id={input.id ?? generatedId} input={input} />
    </Layout>
  );
};

/** 将 FlowDiagram Source root 接入 React 编写与 Layout 宿主 */
export const FlowDiagram = FlowDiagramComponent as FlowEmbeddableComponent<FlowDiagramProps>;

FlowDiagram.displayName = 'FlowDiagram';
FlowDiagram.isTier2Embeddable = true;
FlowDiagram.inputEmbedAdapter = FlowDiagramInputEmbedAdapter;
FlowDiagram.createInputEmbedProps = createFlowDiagramInput;
