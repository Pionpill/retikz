import type { HydrationContext, HydrationHandler, HydrationHandlers } from '../hydration';
import type { RenderRuntimeConfig } from './config';

/** 隔离 hydration handler failure，并交给宿主浏览器错误出口异步报告 */
const reportHandlerError = (error: unknown): void => {
  const reportError = (globalThis as { reportError?: (cause: unknown) => void }).reportError;
  if (reportError !== undefined) reportError(error);
  else
    queueMicrotask(() => {
      throw error;
    });
};

/** 按 registration 合并 handler contributions，并隔离单个 callback failure */
export const mergeRenderHandlers = (config: RenderRuntimeConfig): HydrationHandlers => {
  const registrations = new Map<string, Map<string, Array<HydrationHandler>>>();
  for (const contribution of config.handlerContributions ?? []) {
    for (const [id, handlers] of Object.entries(contribution.handlers)) {
      const events = registrations.get(id) ?? new Map<string, Array<HydrationHandler>>();
      registrations.set(id, events);
      for (const [event, handler] of Object.entries(handlers)) {
        const callbacks = events.get(event) ?? [];
        callbacks.push(handler);
        events.set(event, callbacks);
      }
    }
  }
  const merged = Object.create(null) as Record<string, Record<string, HydrationHandler>>;
  for (const [id, events] of registrations) {
    const handlers = Object.create(null) as Record<string, HydrationHandler>;
    for (const [event, callbacks] of events) {
      handlers[event] = (domEvent: Event, context: HydrationContext) => {
        for (const callback of callbacks) {
          try {
            callback(domEvent, context);
          } catch (cause) {
            reportHandlerError(cause);
          }
        }
      };
    }
    merged[id] = handlers;
  }
  return merged;
};
