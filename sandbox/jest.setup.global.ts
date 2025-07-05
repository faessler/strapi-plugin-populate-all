import { afterAll, beforeAll } from "@jest/globals";
import { strapiStart, strapiStop } from "./tests/strapi";

beforeAll(async () => {
  await strapiStart();
});

afterAll(async () => {
  await strapiStop();
});
