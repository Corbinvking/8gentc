import { getRedis } from "../../lib/redis.js";

const QUEUE_KEY = "dispatch:queue";

export interface QueuedWorkstream {
  workstreamId: string;
  taskId: string;
  priority: number;
  queuedAt: number;
}

export async function enqueue(item: QueuedWorkstream): Promise<void> {
  const redis = getRedis();
  await redis.zadd(QUEUE_KEY, item.priority * 1000 + (Date.now() - item.queuedAt), JSON.stringify(item));
}

export async function dequeueNext(count = 10): Promise<QueuedWorkstream[]> {
  const redis = getRedis();
  const items = await redis.zpopmax(QUEUE_KEY, count);

  const results: QueuedWorkstream[] = [];
  for (let i = 0; i < items.length; i += 2) {
    try {
      results.push(JSON.parse(items[i]));
    } catch {
      // skip malformed
    }
  }
  return results;
}

export async function getQueueDepth(): Promise<number> {
  const redis = getRedis();
  return redis.zcard(QUEUE_KEY);
}

export async function clearQueue(): Promise<void> {
  const redis = getRedis();
  await redis.del(QUEUE_KEY);
}
