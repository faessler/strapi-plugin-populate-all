import { describe, expect, test } from "@jest/globals";
import { strapiRequest } from "./strapi";

describe("strapi-plugin-populate-all", () => {
  test.skip("if everything is populated", async () => {
    const response = await strapiRequest.get(
      "/api/articles?status=draft&populate=all"
    );
    expect(response.statusCode).toBe(200);
  });
});
