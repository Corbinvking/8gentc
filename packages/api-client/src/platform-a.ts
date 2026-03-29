const CONSUMER_API_URL = process.env.NEXT_PUBLIC_CONSUMER_URL ?? "http://localhost:3000";

export const platformAClient = {
  baseUrl: CONSUMER_API_URL,
};
