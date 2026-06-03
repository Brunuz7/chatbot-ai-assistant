/** Snippet oficial Meta (Embedded Signup) — injetado no index.html pelo Vite. */
export function buildFacebookSdkScript(appId: string, graphVersion: string): string {
  const appIdLiteral = JSON.stringify(appId);
  const versionLiteral = JSON.stringify(
    graphVersion.startsWith('v') ? graphVersion : `v${graphVersion}`,
  );

  return `<script>
  window.fbAsyncInit = function() {
    FB.init({
      appId            : ${appIdLiteral},
      autoLogAppEvents : true,
      xfbml            : true,
      version          : ${versionLiteral}
    });
  };
  (function (d, s, id) {
    var js, fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) return;
    js = d.createElement(s); js.id = id;
    js.src = "https://connect.facebook.net/en_US/sdk.js";
    fjs.parentNode.insertBefore(js, fjs);
  }(document, 'script', 'facebook-jssdk'));
</script>`;
}

export function normalizeMetaGraphVersion(raw: string | undefined): string {
  const v = (raw || 'v25.0').trim();
  return v.startsWith('v') ? v : `v${v}`;
}
