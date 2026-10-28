import type { CompileResult } from '@retikz/core';
import { lowerPlotWithLineage } from '@retikz/plot';
import type { InputVanillaCompileDriver, VanillaCompileDriver, VanillaCompileDriverSession } from '@retikz/vanilla';

import type { PreparedPlotLineageNotification } from '../spec';

/** 创建宿主作用域的链路驱动，retained 更新保留 session 身份并替换当前准备视图 */
export const createPlotLineageCompileDriver = (): VanillaCompileDriver => {
  const sessions = new WeakMap<
    object,
    {
      session: VanillaCompileDriverSession;
      updateSites: (sites: Array<PreparedPlotLineageNotification>, input: InputVanillaCompileDriver) => void;
    }
  >();
  return {
    create: input => {
      const sites = input.authoringSites
        .filter(site => site.type === 'plot.prepared-lineage')
        .map(site => site.authoring as PreparedPlotLineageNotification);
      const existing = sessions.get(input.instance);
      if (existing !== undefined) {
        existing.updateSites(sites, input);
        return existing.session;
      }

      const notifications = new WeakMap<CompileResult, Array<() => void>>();
      let currentSites = sites;
      let currentInput = input;
      const session: VanillaCompileDriverSession = {
        resolve: output => {
          notifications.set(
            output.result,
            currentSites.map(site => {
              const result = lowerPlotWithLineage(
                site.spec,
                {},
                {
                  ...site.lowerOptions,
                  environment: { theme: currentInput.source.theme, compile: currentInput.coreOptions },
                  lineage: site.lineage,
                  hostLineageMetadata: site.hostLineageMetadata,
                },
                site.preparedData,
              );
              return () => site.onLineage(result.lineage);
            }),
          );
          return { primary: output.result, layers: [], diagnostics: [] };
        },
        commit: output => {
          for (const notify of notifications.get(output.primary) ?? []) {
            try {
              notify();
            } catch (cause) {
              if (process.env.NODE_ENV !== 'production') console.warn('[retikz] Plot onLineage callback failed', cause);
            }
          }
        },
      };

      sessions.set(input.instance, {
        session,
        updateSites: (next, nextInput) => {
          currentInput = nextInput;
          currentSites = next;
        },
      });

      return session;
    },
  };
};
