import { NodeSchema } from '@retikz/core';
import { z } from 'zod';

const FrameHeaderShape = {
  ...NodeSchema.omit({ type: true, position: true, text: true }).shape,
  text: NodeSchema.shape.text.unwrap().describe('Required Core Node text rendered as Frame header content.'),
};

export const FrameTitleSchema = z
  .strictObject(FrameHeaderShape)
  .describe('Node-like primary title authored without an explicit position.');

export const FrameDescriptionSchema = z
  .strictObject(FrameHeaderShape)
  .describe('Node-like supporting description authored without an explicit position.');
