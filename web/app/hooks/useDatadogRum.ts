import { useEffect, useRef } from 'react';
import { useHydrated } from 'remix-utils';

export const useDatadogRum = () => {
  const hydrated = useHydrated();
  const initializedDatadogRum = useRef(false);

  useEffect(() => {
    // do not render on the server
    if (!hydrated) {
      return;
    }

    if (initializedDatadogRum.current) {
      console.log('Skipping Datadog RUM start: Already started');
      return;
    }

    initializedDatadogRum.current = true;

    if (
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === 'localhost'
    ) {
      console.log('Skipping Datadog RUM start: Local development');
      return;
    }

    import('@datadog/browser-rum').then(({ datadogRum }) => {
      datadogRum.init({
        applicationId: '',
        clientToken: '',
        site: 'datadoghq.com',
        service: 'request-shadowing',
        env: 'dev',
        version: '1.0.0',
        sessionSampleRate: 100,
        sessionReplaySampleRate: 100,
        trackUserInteractions: true,
        trackResources: true,
        trackLongTasks: true,
        defaultPrivacyLevel: 'mask-user-input',
      });

      datadogRum.startSessionReplayRecording();
      console.log('Started Datadog RUM');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);
};
