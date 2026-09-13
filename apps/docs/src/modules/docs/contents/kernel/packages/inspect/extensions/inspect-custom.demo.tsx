import type { FC } from 'react';

import { StrokePathOwnerOutputSchema } from '@retikz/core';
import { createInspectorRegistry, defineInspector } from '@retikz/inspect';
import { InspectLayout, InspectPath } from '@retikz/inspect/react';
import { Layout, Path, Step } from '@retikz/react';

import type { PreviewSourceConfig } from '@/modules/docs/preview';

const endpointInspectorKey = { namespace: 'docs', type: 'path-endpoints' };

const endpointInspector = defineInspector({
  ...endpointInspectorKey,
  owner: { kind: 'pathKind', name: 'stroke' },
  subjectSchema: StrokePathOwnerOutputSchema,
  inspect: (subject, context) => {
    const markers = subject.commands.flatMap(command =>
      'to' in command
        ? [
            {
              type: 'node' as const,
              position: command.to,
              shape: 'circle',
              layout: { minimumSize: 10, padding: 0 },
              style: {
                fill: context.appearance.scopeColor,
                stroke: context.appearance.scopeColor,
                strokeWidth: 1,
              },
            },
          ]
        : [],
    );
    if (subject.transforms.length === 0) return markers;
    return { type: 'scope' as const, transforms: subject.transforms, children: markers };
  },
});

const registry = createInspectorRegistry([endpointInspector]);

const Curve: FC<{ inspect?: boolean }> = props => {
  const { inspect = false } = props;
  const steps = (
    <>
      <Step kind="move" to={[-150, 42]} />
      <Step kind="cubic" control1={[-78, -88]} control2={[82, 88]} to={[150, -42]} />
    </>
  );

  return inspect ? (
    <InspectPath
      request={{ inspector: endpointInspectorKey, options: true }}
      style={{ stroke: 'dimgray', strokeWidth: 3 }}
    >
      {steps}
    </InspectPath>
  ) : (
    <Path style={{ stroke: 'dimgray', strokeWidth: 3 }}>{steps}</Path>
  );
};

/** Register and request the custom endpoint Inspector. */
const Demo: FC = () => (
  <InspectLayout registry={registry}>
    <Curve inspect />
  </InspectLayout>
);

/** Keep Inspector selection outside the persistent drawing IR. */
export const previewSource = {
  deriveIR: false,
  canonicalRender: () => (
    <Layout>
      <Curve />
    </Layout>
  ),
} satisfies PreviewSourceConfig;

export default Demo;
