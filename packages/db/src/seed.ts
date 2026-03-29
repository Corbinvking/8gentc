import { db } from "./client";

async function seed() {
  console.log("Seeding database...");
  // Add seed data here
  console.log("Seeding complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
