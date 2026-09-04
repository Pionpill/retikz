import type { InputEmbed, InputEmbedAdapter, InputEmbedContext } from '@retikz/vanilla';

import * as DiagramFlow from '@retikz/diagram/flow';
import { processToStaticInputResult } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

import * as FlowVanilla from '../src/flow';

type NormalizeFlowDiagram = (input: Readonly<Record<string, unknown>>) => DiagramFlow.IRFlowDiagram;
type CreateFlowDiagramEmbed = (
  id: string,
  input: Readonly<Record<string, unknown>>,
) => InputEmbed<Readonly<Record<string, unknown>>>;

const functionExport = <TFunction extends (...arguments_: never) => unknown>(name: string): TFunction | undefined => {
  const value: unknown = FlowVanilla;
  if (typeof value !== 'object' || value === null || !(name in value)) return undefined;
  const candidate = value[name as keyof typeof value];
  return typeof candidate === 'function' ? candidate : undefined;
};

const adapterExport = (): InputEmbedAdapter<Readonly<Record<string, unknown>>> | undefined => {
  const value: unknown = FlowVanilla;
  if (typeof value !== 'object' || value === null || !('FlowDiagramInputEmbedAdapter' in value)) return undefined;
  return value.FlowDiagramInputEmbedAdapter as InputEmbedAdapter<Readonly<Record<string, unknown>>>;
};

const context: InputEmbedContext = {
  id: 'flow-embed',
  kind: 'diagram.flow',
  layerId: 'layer',
  identityPath: ['layer', 'flow-embed'],
};

const sourceInput = {
  id: 'architecture',
  theme: { mode: 'dark' as const },
  entities: [
    {
      id: 'jsx',
      text: 'JSX',
      status: 'success' as const,
      rank: 0,
    },
    { id: 'kernel', text: ['Kernel', 'IR compiler'] },
  ],
  groups: [{ id: 'client', label: 'Client', children: ['frontend'] }],
  layouts: [{ id: 'frontend', direction: 'down' as const, children: ['jsx'] }],
  children: ['client', 'kernel'],
  relations: [
    {
      source: 'jsx',
      target: 'kernel',
      label: 'normalize',
      status: 'warning' as const,
      layout: { routing: { kind: 'orthogonal' as const, cornerRadius: 0 } },
    },
  ],
  flowTheme: { layout: { nodeGap: 0, rankGap: 48 } },
};

const expectedSource = {
  namespace: 'diagram',
  type: 'flow',
  ...sourceInput,
};

const measureText = (text: string) => ({ width: text.length * 8, height: 12, ascent: 9, descent: 3 });

const artifactValueOf = (
  result: Readonly<{ artifacts: ReadonlyArray<Readonly<{ namespace?: string; type?: string; value?: unknown }>> }>,
) => result.artifacts.find(artifact => artifact.namespace === 'diagram' && artifact.type === 'flow')?.value;

describe('@retikz/diagram-vanilla/flow', () => {
  it('exports the complete Flow authoring surface from the explicit subpath', () => {
    expect(functionExport('normalizeFlowDiagram')).toBeDefined();
    expect(functionExport('flowDiagram')).toBeDefined();
    expect(functionExport('createFlowDiagramVanillaAdapters')).toBeDefined();
    expect(adapterExport()).toBeDefined();
  });

  it('normalizes flat authoring input to the exact Direct Flow Source without adding defaults', () => {
    const normalizeFlowDiagram = functionExport<NormalizeFlowDiagram>('normalizeFlowDiagram');
    expect(normalizeFlowDiagram).toBeDefined();
    if (normalizeFlowDiagram === undefined) return;

    expect(normalizeFlowDiagram(sourceInput)).toEqual(expectedSource);
  });

  it('normalizes a Core-compatible Entity text block and existing text layout style without adapter defaults', () => {
    const normalizeFlowDiagram = functionExport<NormalizeFlowDiagram>('normalizeFlowDiagram');
    expect(normalizeFlowDiagram).toBeDefined();
    if (normalizeFlowDiagram === undefined) return;

    const input = {
      entities: [
        {
          id: 'form',
          text: ['Frontend form', { text: 'Complete user details', fill: 'gray', font: { size: 'sm' } }],
          style: { align: 'start' as const, lineHeight: 18, maxTextWidth: 160 },
        },
      ],
      groups: [],
      layouts: [],
      children: ['form'],
    };

    expect(normalizeFlowDiagram(input)).toEqual({ namespace: 'diagram', type: 'flow', ...input });
  });

  it('keeps definition options out of Source and contributes the same Flow provider root', () => {
    const flowDiagram = functionExport<CreateFlowDiagramEmbed>('flowDiagram');
    const adapter = adapterExport();
    expect(flowDiagram).toBeDefined();
    expect(adapter).toBeDefined();
    if (flowDiagram === undefined || adapter === undefined) return;

    const flowThemeStyle = DiagramFlow.defineFlowThemeStyle({ name: 'brand', resolve: () => ({}) });
    const embed = flowDiagram('flow-embed', { ...sourceInput, flowThemeStyles: [flowThemeStyle] });
    const contribution = adapter.lower(embed.props, context);

    expect(contribution.node).toEqual(expectedSource);
    expect(contribution.node).not.toHaveProperty('flowThemeStyles');
    expect(contribution.providerDependencies.roots).toEqual([DiagramFlow.FlowDiagramProviderKey]);
  });

  it('compiles the normalized Source to the public Flow artifact through the contributed providers', () => {
    const flowDiagram = functionExport<CreateFlowDiagramEmbed>('flowDiagram');
    const adapter = adapterExport();
    expect(flowDiagram).toBeDefined();
    expect(adapter).toBeDefined();
    if (flowDiagram === undefined || adapter === undefined) return;

    const vanillaResult = processToStaticInputResult(
      { children: [flowDiagram('flow-embed', sourceInput)] },
      { adapters: [adapter], compile: { padding: 0, measureText } },
    );

    expect(artifactValueOf(vanillaResult)).toMatchObject({
      layout: { definition: 'layered' },
      elements: [
        {
          id: 'client',
          kind: 'group',
          elements: [
            {
              id: 'frontend',
              kind: 'layout',
              elements: [{ id: 'jsx', kind: 'entity' }],
            },
          ],
        },
        { id: 'kernel', kind: 'entity' },
      ],
      relations: [{ source: 'jsx', target: 'kernel', route: { kind: 'orthogonal', cornerRadius: 0 } }],
    });
  });
});
