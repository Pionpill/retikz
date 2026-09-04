import { describe, expect, it } from 'vitest';

import * as Graph from '../../src';

const entity = (status?: string) =>
  Graph.EntitySchema.parse({
    namespace: 'graph',
    type: 'entity',
    role: 'activity',
    position: [0, 0],
    ...(status === undefined ? {} : { status }),
  });

const relation = (status?: string) =>
  Graph.RelationSchema.parse({
    namespace: 'graph',
    type: 'relation',
    source: { id: 'source' },
    target: { id: 'target' },
    role: 'flow',
    ...(status === undefined ? {} : { status }),
  });

describe('Graph semantic status', () => {
  it.each(['error', 'success', 'warning', 'disabled'] as const)(
    'preserves the closed %s status in Entity and Relation Source',
    status => {
      expect(entity(status)).toMatchObject({ status });
      expect(relation(status)).toMatchObject({ status });
    },
  );

  it('keeps status omitted when no semantic state is authored', () => {
    expect(entity()).not.toHaveProperty('status');
    expect(relation()).not.toHaveProperty('status');
  });

  it.each(['', 'pending', ['error'], { value: 'error' }] as const)(
    'rejects an invalid status at the Source schema boundary',
    status => {
      expect(() => entity(status as string)).toThrow();
      expect(() => relation(status as string)).toThrow();
    },
  );

  it('matches Theme selectors by status without requiring a registry definition', () => {
    const selector = Graph.GraphEntityThemeSelectorSchema.parse({ status: ['warning', 'error'] });

    expect(Graph.matchesGraphThemeSelector(selector, { role: 'activity', status: 'warning' })).toBe(true);
    expect(Graph.matchesGraphThemeSelector(selector, { role: 'activity', status: 'success' })).toBe(false);
  });

  it('combines Relation status selectors with the effective direction', () => {
    const selector = Graph.GraphRelationThemeSelectorSchema.parse({
      status: 'warning',
      direction: 'forward',
    });

    expect(Graph.matchesGraphThemeSelector(selector, { role: 'flow', status: 'warning', direction: 'forward' })).toBe(
      true,
    );
    expect(Graph.matchesGraphThemeSelector(selector, { role: 'flow', status: 'warning', direction: 'none' })).toBe(
      false,
    );
  });

  it('does not infer Graph status from domain predicate params', () => {
    const source = Graph.EntitySchema.parse({
      namespace: 'graph',
      type: 'entity',
      role: 'activity',
      position: [0, 0],
      predicate: { name: 'custom-state', params: { status: 'error' } },
    });

    expect(source).not.toHaveProperty('status');
    expect(source.predicate).toEqual({ name: 'custom-state', params: { status: 'error' } });
  });
});
