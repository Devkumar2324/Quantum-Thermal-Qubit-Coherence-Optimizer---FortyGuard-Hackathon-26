// Test setup — runs before all tests.
import { beforeAll } from "bun:test";

beforeAll(() => {
  // Ensure deterministic test environment
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = "file:/home/z/my-project/db/test.db";
});
