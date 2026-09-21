import { EVENT_PROP_TO_NAME } from '@retikz/react';
/** 事件留给 React hydration，不进入 JSON-safe Standard Source */
export const shapeEmbedProps = (props: Readonly<Record<string, unknown>>): unknown =>
  Object.fromEntries(Object.entries(props).filter(([key]) => !(key in EVENT_PROP_TO_NAME)));
