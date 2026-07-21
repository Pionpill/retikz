import { describe, expect, it } from 'vitest';

import { resolveVisiblePreviewControlSections } from '../../src/modules/docs/components/component-preview/controls';
import { nodeLabelControls } from '../../src/modules/docs/contents/kernel/components/node/overview/node-label.controls';
import { nodeLabelControls as nodeLabelEnControls } from '../../src/modules/docs/contents/kernel/components/node/overview/node-label.en.controls';

describe('Node controls', () => {
  it('shows keepUpright only for rotated labels', () => {
    const visibleIds = (rotateMode: string, language: 'zh' | 'en') => {
      const definition = language === 'zh' ? nodeLabelControls : nodeLabelEnControls;
      return resolveVisiblePreviewControlSections(definition.sections, {
        placement: 'outside',
        pinStyle: 'none',
        positionMode: 'direction',
        rotateMode,
      }).flatMap(section => section.controls.map(field => field.id));
    };

    for (const language of ['zh', 'en'] as const) {
      expect(visibleIds('none', language)).not.toContain('keepUpright');
      for (const rotateMode of ['radial', 'tangent', 'angle']) {
        expect(visibleIds(rotateMode, language)).toContain('keepUpright');
      }
    }
  });
});
