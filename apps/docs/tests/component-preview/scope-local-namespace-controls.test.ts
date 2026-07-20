import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import type { PreviewControlsDefinition } from '../../src/modules/docs/components/component-preview';

import { scopeLocalNamespaceBasicControls } from '../../src/modules/docs/contents/kernel/components/layout/scope/scope-local-namespace-basic.controls';
import { previewControlContract as scopeLocalNamespaceBasicContract } from '../../src/modules/docs/contents/kernel/components/layout/scope/scope-local-namespace-basic.controls';
import { scopeLocalNamespaceBasicEnControls } from '../../src/modules/docs/contents/kernel/components/layout/scope/scope-local-namespace-basic.en.controls';
import { previewControlContract as scopeLocalNamespaceBasicEnContract } from '../../src/modules/docs/contents/kernel/components/layout/scope/scope-local-namespace-basic.en.controls';
const localizedControls: Array<readonly [string, PreviewControlsDefinition]> = [
  ['zh', scopeLocalNamespaceBasicControls],
  ['en', scopeLocalNamespaceBasicEnControls],
];

describe('Scope localNamespace controls', () => {
  it('以 Scope.localNamespace 和 Node.id 表示可调契约，并固定稳定取景', () => {
    for (const contract of [scopeLocalNamespaceBasicContract, scopeLocalNamespaceBasicEnContract]) {
      expect(contract.relatedApis).toEqual(['Scope.localNamespace', 'Node.id']);
    }

    const demoSource = readFileSync(
      resolve('src/modules/docs/contents/kernel/components/layout/scope/scope-local-namespace-basic.demo.tsx'),
      'utf8',
    );

    expect(demoSource).toContain('viewBox={{ x: -100, y: -70, width: 480, height: 140 }}');
  });

  it.each(localizedControls)('%s 只开放有界内部 Node id 与命名空间开关', (locale, controls) => {
    expect(controls.presentation).toBe('panel');
    if (controls.presentation !== 'panel') throw new Error(`Missing Scope namespace panel controls: ${locale}`);

    const fields = controls.sections.flatMap(section => section.controls);

    expect(fields).toHaveLength(2);
    expect(fields[0]).toMatchObject({
      id: 'nodeId',
      kind: 'select',
      defaultValue: 'A',
    });
    if (!fields[0] || fields[0].kind !== 'select') throw new Error(`Missing Scope node id select: ${locale}`);
    expect(fields[0].options.map(option => option.value)).toEqual(['A', 'B', 'local-node']);
    expect(fields[1]).toMatchObject({
      id: 'localNamespace',
      kind: 'switch',
      defaultValue: true,
    });
  });
});
