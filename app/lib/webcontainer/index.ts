import { WebContainer } from '@webcontainer/api';
import { WORK_DIR_NAME } from '~/utils/constants';
import { cleanStackTrace } from '~/utils/stacktrace';
import { LocalContainer, isElectronLocalRunner } from '~/lib/local-runner';

interface WebContainerContext {
  loaded: boolean;
}

export const webcontainerContext: WebContainerContext = import.meta.hot?.data.webcontainerContext ?? {
  loaded: false,
};

if (import.meta.hot) {
  import.meta.hot.data.webcontainerContext = webcontainerContext;
}

export let webcontainer: Promise<WebContainer> = new Promise(() => {
  // noop for ssr
});

if (!import.meta.env.SSR) {
  if (isElectronLocalRunner()) {
    console.log('[LocalRunner] Electron local runner detected — skipping WebContainer boot');

    webcontainer =
      import.meta.hot?.data.webcontainer ??
      (async () => {
        const container = new LocalContainer();
        webcontainerContext.loaded = true;

        const { workbenchStore } = await import('~/lib/stores/workbench');

        container.on('preview-message', (message: any) => {
          if (message.type === 'PREVIEW_UNCAUGHT_EXCEPTION' || message.type === 'PREVIEW_UNHANDLED_REJECTION') {
            const isPromise = message.type === 'PREVIEW_UNHANDLED_REJECTION';
            workbenchStore.actionAlert.set({
              type: 'preview',
              title: isPromise ? 'Unhandled Promise Rejection' : 'Uncaught Exception',
              description: 'message' in message ? message.message : 'Unknown error',
              content: `Error at ${message.pathname}\n\n${cleanStackTrace(message.stack || '')}`,
              source: 'preview',
            });
          }
        });

        return container as unknown as WebContainer;
      })();

    if (import.meta.hot) {
      import.meta.hot.data.webcontainer = webcontainer;
    }
  } else {
    console.log('[WebContainer] crossOriginIsolated:', window.crossOriginIsolated);
    console.log('[WebContainer] SharedArrayBuffer available:', typeof SharedArrayBuffer !== 'undefined');

    webcontainer =
      import.meta.hot?.data.webcontainer ??
      Promise.resolve()
        .then(() => {
          console.log('[WebContainer] Booting...');

          return WebContainer.boot({
            coep: 'credentialless',
            workdirName: WORK_DIR_NAME,
            forwardPreviewErrors: true,
          });
        })
        .then(async (webcontainer) => {
          console.log('[WebContainer] Boot successful');
          webcontainerContext.loaded = true;

          const { workbenchStore } = await import('~/lib/stores/workbench');

          const response = await fetch('/inspector-script.js');
          const inspectorScript = await response.text();
          await webcontainer.setPreviewScript(inspectorScript);

          webcontainer.on('preview-message', (message) => {
            console.log('WebContainer preview message:', message);

            if (message.type === 'PREVIEW_UNCAUGHT_EXCEPTION' || message.type === 'PREVIEW_UNHANDLED_REJECTION') {
              const isPromise = message.type === 'PREVIEW_UNHANDLED_REJECTION';
              const title = isPromise ? 'Unhandled Promise Rejection' : 'Uncaught Exception';
              workbenchStore.actionAlert.set({
                type: 'preview',
                title,
                description: 'message' in message ? message.message : 'Unknown error',
                content: `Error occurred at ${message.pathname}${message.search}${message.hash}\nPort: ${message.port}\n\nStack trace:\n${cleanStackTrace(message.stack || '')}`,
                source: 'preview',
              });
            }
          });

          return webcontainer;
        })
        .catch((error) => {
          console.error('[WebContainer] Boot FAILED:', error);
          console.error('[WebContainer] crossOriginIsolated was:', window.crossOriginIsolated);
          throw error;
        });

    if (import.meta.hot) {
      import.meta.hot.data.webcontainer = webcontainer;
    }
  }
}
