import { timingSafeEqual } from 'node:crypto';

export function getAccessTokenFromRequest(req) {
  const header = req.headers?.['x-app-access-token'];
  if (typeof header === 'string' && header.trim()) return header.trim();

  const access = req.query?.access;
  if (typeof access === 'string' && access.trim()) return access.trim();

  return '';
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function requireAppAccessToken(env = process.env) {
  const expected = String(env.APP_ACCESS_TOKEN || '').trim();

  return (req, res, next) => {
    if (!expected) {
      next();
      return;
    }

    const actual = getAccessTokenFromRequest(req);
    if (actual && safeEqual(actual, expected)) {
      next();
      return;
    }

    res.status(401).json({
      error: 'unauthorized',
      message: 'Acesso não autorizado.'
    });
  };
}
