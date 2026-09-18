import { describe, expect, it } from 'vitest';

import { resolveVisiblePreviewControlSections } from '../../src/modules/docs/components/component-preview/controls';
import { nodeLabelPositionControls } from '../../src/modules/docs/contents/kernel/components/node/labels/node-label-position.controls';
import { nodeLabelPositionControls as nodeLabelPositionEnglishControls } from '../../src/modules/docs/contents/kernel/components/node/labels/node-label-position.en.controls';
import { nodeLabelRotatePinControls } from '../../src/modules/docs/contents/kernel/components/node/labels/node-label-rotate-pin.controls';
import { nodeLabelRotatePinControls as nodeLabelRotatePinEnglishControls } from '../../src/modules/docs/contents/kernel/components/node/labels/node-label-rotate-pin.en.controls';

describe('Node controls', () => {
  it('hides controls that do not affect centered labels', () => {
    const visibleIds = resolveVisiblePreviewControlSections(nodeLabelPositionControls.sections, {
      positionMode: 'center',
    }).flatMap(section => section.controls.map(field => field.id));

    expect(visibleIds).not.toContain('direction');
    expect(visibleIds).not.toContain('positionAngle');
    expect(visibleIds).not.toContain('boundary');
  });

  it('shows upright text only for rotated labels', () => {
    const visibleIds = (rotateMode: string) =>
      resolveVisiblePreviewControlSections(nodeLabelRotatePinControls.sections, {
        rotateMode,
        pinStyle: 'none',
      }).flatMap(section => section.controls.map(field => field.id));

    expect(visibleIds('none')).not.toContain('keepUpright');
    for (const rotateMode of ['radial', 'tangent', 'angle']) {
      expect(visibleIds(rotateMode)).toContain('keepUpright');
    }
  });

  it('keeps English controls structurally aligned with Chinese controls', () => {
    expect(nodeLabelPositionEnglishControls.sections).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: 'Attachment' })]),
    );
    expect(nodeLabelPositionEnglishControls.sections[0].controls.map(control => control.id)).toEqual(
      nodeLabelPositionControls.sections[0].controls.map(control => control.id),
    );
    expect(
      nodeLabelRotatePinEnglishControls.sections.flatMap(section => section.controls.map(control => control.id)),
    ).toEqual(nodeLabelRotatePinControls.sections.flatMap(section => section.controls.map(control => control.id)));
  });
});
