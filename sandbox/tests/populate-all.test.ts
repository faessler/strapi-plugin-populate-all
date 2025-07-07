import { describe, expect, test } from "@jest/globals";
import { strapiRequest } from "./strapi";

describe("strapi-plugin-populate-all", () => {
  test("if everything is populated", async () => {
    const response = await strapiRequest.get(
      "/api/articles?status=draft&populate=all"
    );

    // request succeeds
    expect(response.statusCode).toBe(200);

    // has first level of population
    expect(response.body.data[0]).toHaveProperty("cover");
    expect(response.body.data[0]).toHaveProperty("author");
    expect(response.body.data[0]).toHaveProperty("category");
    expect(response.body.data[0]).toHaveProperty("blocks");

    // doesn't loop
    expect(response.body.data[0].category.articles[0]).not.toHaveProperty(
      "category"
    );
  });
});
