export const getAuthzCookie = (request: Request) => {
  const cookies = request.headers.get('Cookie');
  return /CF_Authorization=([a-z0-9-.%_]+);?/i.exec(cookies ?? '')?.[0];
};
