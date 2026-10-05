import type { FlowDiagramProps } from '@retikz/diagram-react/flow';
import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FlowRoutingKind, IRFlowRouting } from '@retikz/diagram/flow';
import type { ReactElement } from 'react';

import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import type { PreviewControlValuesFor } from '@/modules/docs/preview';

import type { previewControls } from './flow-routing.controls';

const routingKinds: ReadonlyArray<FlowRoutingKind> = [
  'straight',
  'orthogonal',
  '-|',
  '|-',
  'bend',
  'curve',
  'cubic',
  'smooth',
];

/** 将面板选项收窄为公开的路由模式 */
const routingKindOf = (value: string): FlowRoutingKind => {
  const kind = routingKinds.find(candidate => candidate === value);
  if (kind === undefined) throw new Error(`Unsupported Flow routing kind: ${value}`);
  return kind;
};

/** 在固定端点间展示所选路由的路径形状 */
export const renderFlowRoutingPreview = (
  values: PreviewControlValuesFor<typeof previewControls>,
  viewport?: Pick<FlowDiagramProps, 'viewBox'>,
): ReactElement => {
  const kind = routingKindOf(values.kind);
  const routing: IRFlowRouting =
    kind === 'bend'
      ? values.configuration === 'tangent'
        ? { kind, outAngle: values.outAngle, inAngle: values.inAngle, looseness: values.looseness }
        : {
            kind,
            ...(values.side === 'left' || values.side === 'right' ? { bendDirection: values.side } : {}),
            ...(values.configuration === 'auto' ? {} : { bendAngle: values.angle }),
          }
      : kind === 'curve'
        ? values.automatic
          ? { kind }
          : { kind, control: [90, -values.controlHeight] }
        : kind === 'cubic'
          ? values.automatic
            ? { kind }
            : { kind, control1: [40, -values.controlHeight], control2: [160, -values.controlHeight] }
          : kind === 'smooth'
            ? {
                kind,
                points: [
                  { of: 'a', offset: [40, -values.height] },
                  { of: 'b', offset: [-40, -values.height] },
                ],
                tension: values.tension,
              }
            : kind === 'orthogonal'
              ? {
                  kind,
                  cornerRadius: values.cornerRadius,
                  ...(values.turnPosition === 'auto'
                    ? {}
                    : {
                        turnPosition:
                          values.turnPosition === '0.25' ? 0.25 : values.turnPosition === '0.75' ? 0.75 : 0.5,
                      }),
                }
              : kind === 'straight'
                ? { kind }
                : { kind, cornerRadius: values.cornerRadius };
  return (
    <PreviewFlowDiagram
      viewBox={{ x: -48, y: -56, width: 400, height: 330 }}
      style={{ maxWidth: '100%', height: 'auto' }}
      {...viewport}
    >
      <FlowLayout
        kind="grid"
        id="grid"
        placements={[
          ['a', null],
          [null, 'b'],
        ]}
      >
        <FlowEntities
          items={[
            { id: 'a', text: 'A' },
            { id: 'b', text: 'B' },
          ]}
        />
      </FlowLayout>
      <FlowRelations items={[{ source: 'a', target: 'b', routing }]} />
    </PreviewFlowDiagram>
  );
};
