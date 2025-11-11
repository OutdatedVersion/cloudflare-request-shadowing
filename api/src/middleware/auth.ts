import { MiddlewareHandler } from "hono";
import { getCookie } from "hono/cookie";
import { JWTPayload, createRemoteJWKSet, jwtVerify } from "jose";

let _jwk: ReturnType<typeof createRemoteJWKSet>;
const getJsonWebKeyProvider = (authTeamName: string) => {
  // note: it's possible we'll become out-of-date due to a lack of
  // cache invalidation and long lived worker instances
  if (_jwk) {
    return _jwk;
  }

  _jwk = createRemoteJWKSet(
    new URL(
      `https://${authTeamName}.cloudflareaccess.com/cdn-cgi/access/certs`,
    ),
  );
  return _jwk;
};

export const cloudflareAccessAuth: MiddlewareHandler = async (ctx, next) => {
  // see https://developers.cloudflare.com/cloudflare-one/identity/authorization-cookie/validating-json/

  const token = (
    getCookie(ctx, "CF_Authorization") ??
    ctx.req.header("Cf-Access-Jwt-Assertion")
  )?.trim();

  if (!token) {
    return ctx.json(
      {
        name: "Unauthorized",
        message: "Cookie/header missing",
      },
      { status: 401 },
    );
  }

  try {
    const { payload } = await jwtVerify(
      token,
      getJsonWebKeyProvider(ctx.env.AUTH_TEAM_NAME),
      {
        issuer: `https://${ctx.env.AUTH_TEAM_NAME}.cloudflareaccess.com`,
        audience: ctx.env.AUTH_AUD_CLAIM,
      },
    );

    ctx.set("tokenClaims", payload);
  } catch (error) {
    return ctx.json(
      {
        name: "Unauthorized",
        message: "Malformed token",
        cause: {
          name: (error as Error).name,
          message: (error as Error).message,
        },
      },
      {
        status: 401,
      },
    );
  }

  await next();
};
