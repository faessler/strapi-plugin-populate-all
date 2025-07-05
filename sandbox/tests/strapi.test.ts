import { describe, expect, test } from "@jest/globals";
import { strapiRequest } from "./strapi";

describe("strapi", () => {
  test("strapi is started", async () => {
    const response = await strapiRequest.get("/");
    expect(response.statusCode).toBe(302);
  });

  test("data is seeded", async () => {
    const response = await strapiRequest.get("/api/articles");
    expect(response.statusCode).toBe(200);
  });
});
