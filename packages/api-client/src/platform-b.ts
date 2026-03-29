const CONTRACTOR_API_URL = process.env.NEXT_PUBLIC_CONTRACTOR_URL ?? "http://localhost:3010";

export const platformBClient = {
  baseUrl: CONTRACTOR_API_URL,
};
