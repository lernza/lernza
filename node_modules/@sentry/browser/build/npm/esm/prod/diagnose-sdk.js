import { getClient, suppressTracing } from '@sentry/core/browser';

async function diagnoseSdkConnectivity() {
  const client = getClient();
  if (!client) {
    return "no-client-active";
  }
  if (!client.getDsn()) {
    return "no-dsn-configured";
  }
  const tunnel = client.getOptions().tunnel;
  const defaultUrl = "https://o447951.ingest.sentry.io/api/4509632503087104/envelope/?sentry_version=7&sentry_key=c1dfb07d783ad5325c245c1fd3725390&sentry_client=sentry.javascript.browser%2F1.33.7";
  const url = tunnel || defaultUrl;
  try {
    await suppressTracing(
      () => (
        // If fetch throws, there is likely an ad blocker active or there are other connective issues.
        fetch(url, {
          body: "{}",
          method: "POST",
          mode: "cors",
          credentials: "omit"
        })
      )
    );
  } catch {
    return "sentry-unreachable";
  }
}

export { diagnoseSdkConnectivity };
//# sourceMappingURL=diagnose-sdk.js.map
