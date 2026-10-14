import * as client from "openid-client";
import type { Config } from "../config.js";

export interface OidcClaims {
  sub: string;
  username: string | undefined;
  groups: string[];
}

// Thin wrapper so the app can be tested without a real identity provider.
export interface OidcProvider {
  authorizationUrl(params: { state: string; codeChallenge: string; redirectUri: string }): Promise<URL>;
  exchange(params: { currentUrl: URL; state: string; codeVerifier: string }): Promise<OidcClaims>;
}

export function createOidcProvider(config: Config): OidcProvider {
  // Discovery happens lazily so the server can start while Authentik is unavailable.
  let discovered: Promise<client.Configuration> | undefined;
  const getConfiguration = () => {
    discovered ??= client
      .discovery(new URL(config.oidc.issuer), config.oidc.clientId, config.oidc.clientSecret)
      .catch((err: unknown) => {
        discovered = undefined;
        throw err;
      });
    return discovered;
  };

  return {
    async authorizationUrl({ state, codeChallenge, redirectUri }) {
      return client.buildAuthorizationUrl(await getConfiguration(), {
        redirect_uri: redirectUri,
        scope: "openid profile email",
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
        state,
      });
    },
    async exchange({ currentUrl, state, codeVerifier }) {
      const tokens = await client.authorizationCodeGrant(await getConfiguration(), currentUrl, {
        pkceCodeVerifier: codeVerifier,
        expectedState: state,
      });
      const claims = tokens.claims();
      if (!claims) throw new Error("No ID token returned");
      const groups = Array.isArray(claims.groups) ? claims.groups.filter((g): g is string => typeof g === "string") : [];
      const username = typeof claims.preferred_username === "string" ? claims.preferred_username : undefined;
      return { sub: claims.sub, username, groups };
    },
  };
}

export { calculatePKCECodeChallenge, randomPKCECodeVerifier, randomState } from "openid-client";
