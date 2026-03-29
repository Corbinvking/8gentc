const windowMs = 60_000;
const maxRequests = 30;

const buckets = new Map<string, { count: number; resetAt: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}, 60_000);

export function checkRateLimit(
  key: string
): { limited: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }

  bucket.count++;

  if (bucket.count > maxRequests) {
    return {
      limited: true,
      remaining: 0,
      resetAt: bucket.resetAt,
    };
  }

  return {
    limited: false,
    remaining: maxRequests - bucket.count,
    resetAt: bucket.resetAt,
  };
}
