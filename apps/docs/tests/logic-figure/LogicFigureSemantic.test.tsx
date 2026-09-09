import type { ReactNode } from 'react';

import { Entity } from '@retikz/graph-react';
import { createInputScene } from '@retikz/react';
import { normalizeScene } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

import {
  LogicFigure,
  LogicFigureEntityKind,
  LogicFigureFrame,
  LogicFigureFrameTitle,
  LogicFigureRelation,
  LogicFigureRelationKind,
} from '@/modules/docs/components/logic-figure';

/** 经过 React authoring 与 Vanilla normalize 读取逻辑图的 Source IR */
const readLogicFigure = (element: ReactNode) => {
  const input = createInputScene(element);
  return normalizeScene(input.scene, { adapters: input.adapters }).ir.children[0];
};

describe('LogicFigure semantic vocabulary', () => {
  it('defines site Entity kinds for important, important data, secondary, and algorithmic content', () => {
    expect(LogicFigureEntityKind).toEqual({
      Important: 'docs.logic.important',
      ImportantData: 'docs.logic.importantData',
      Secondary: 'docs.logic.secondary',
      Algorithm: 'docs.logic.algorithm',
    });
  });

  it('records the site Entity and Relation kinds in Graph Source IR', () => {
    const figure = readLogicFigure(
      <LogicFigure>
        <Entity id="input" role="participant" kind={LogicFigureEntityKind.Important} position={[60, 90]}>
          external IR
        </Entity>
        <Entity id="runtime" role="activity" kind={LogicFigureEntityKind.Important} position={[180, 90]}>
          compile
        </Entity>
        <Entity id="scene" role="resource" kind={LogicFigureEntityKind.ImportantData} position={[300, 90]}>
          Scene
        </Entity>
        <LogicFigureRelation
          id="depends-on"
          kind={LogicFigureRelationKind.Dependency}
          source={{ id: 'runtime' }}
          target={{ id: 'input' }}
        />
        <LogicFigureRelation
          id="produces"
          kind={LogicFigureRelationKind.ControlFlow}
          source={{ id: 'runtime' }}
          target={{ id: 'scene' }}
        />
      </LogicFigure>,
    );

    expect(figure).toMatchObject({
      namespace: 'graph',
      type: 'graph',
      children: [
        { type: 'entity', id: 'input', role: 'participant', kind: 'docs.logic.important' },
        { type: 'entity', id: 'runtime', role: 'activity', kind: 'docs.logic.important' },
        { type: 'entity', id: 'scene', role: 'resource', kind: 'docs.logic.importantData' },
        { type: 'relation', id: 'depends-on', role: 'dependency', kind: 'docs.logic.dependency' },
        { type: 'relation', id: 'produces', role: 'flow', kind: 'docs.logic.control-flow' },
      ],
    });
  });

  it('keeps semantic Entity children in a LogicFigureFrame Graph group', () => {
    const figure = readLogicFigure(
      <LogicFigure>
        <LogicFigureFrame id="core">
          <LogicFigureFrameTitle>@retikz/core</LogicFigureFrameTitle>
          <Entity id="compile" role="activity" kind={LogicFigureEntityKind.Algorithm} position={[120, 80]}>
            compileToScene
          </Entity>
        </LogicFigureFrame>
      </LogicFigure>,
    );

    expect(figure).toMatchObject({
      namespace: 'graph',
      type: 'graph',
      children: [
        {
          namespace: 'graph',
          type: 'group',
          id: 'core',
          caption: { title: { text: '@retikz/core' } },
          children: [{ type: 'entity', id: 'compile', role: 'activity', kind: 'docs.logic.algorithm' }],
        },
      ],
    });
  });
});
