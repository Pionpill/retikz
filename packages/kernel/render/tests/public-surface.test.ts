import { describe, expect, it } from 'vitest';

import * as animation from '../src/animation';
import * as canvas from '../src/canvas';
import * as hydration from '../src/hydration';
import * as svg from '../src/svg';

describe('Render 公开子入口', () => {
  it('提供帧物化与事件接线入口，不暴露局部组装助手', () => {
    expect(canvas).toHaveProperty('renderToCanvas');
    expect(svg).toHaveProperty('buildSvgFrameDocument');
    expect(svg).toHaveProperty('buildArrowMarker');
    expect(hydration).toHaveProperty('withCanvasAnimationEventHandlers');
    expect(canvas).not.toHaveProperty('drawReadonlyLayer');
    expect(svg).not.toHaveProperty('buildSvgReadonlyLayer');
    expect(animation).not.toHaveProperty('primHasStroke');
    expect(hydration).not.toHaveProperty('collectCanvasAnimationEventTriggers');
  });
});
