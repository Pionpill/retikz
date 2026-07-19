import { describe, expect, it } from 'vitest';

import type { PreviewControlsDefinition } from '../../src/modules/docs/components/component-preview';

import { scopeLocalNamespaceBasicControls } from '../../src/modules/docs/contents/kernel/components/layout/scope/scope-local-namespace-basic.controls';
import { scopeLocalNamespaceBasicEnControls } from '../../src/modules/docs/contents/kernel/components/layout/scope/scope-local-namespace-basic.en.controls';

const localizedControls: Array<readonly [string, PreviewControlsDefinition]> = [
  ['zh', scopeLocalNamespaceBasicControls],
  ['en', scopeLocalNamespaceBasicEnControls],
];

describe('Scope localNamespace controls', () => {
  it.each(localizedControls)('%s 只开放内部 Node id 与命名空间开关', (locale, controls) => {
    expect(controls.presentation).toBe('panel');
    if (controls.presentation !== 'panel') throw new Error(`Missing Scope namespace panel controls: ${locale}`);

    const fields = controls.sections.flatMap(section => section.controls);

    expect(fields).toHaveLength(2);
    expect(fields[0]).toMatchObject({
      id: 'nodeId',
      kind: 'text',
      defaultValue: 'A',
    });
    expect(fields[1]).toMatchObject({
      id: 'localNamespace',
      kind: 'switch',
      defaultValue: true,
    });
  });
});
