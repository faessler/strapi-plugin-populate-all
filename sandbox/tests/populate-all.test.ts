import { describe, expect, test } from "@jest/globals";
import { strapiRequest } from "./strapi";

describe("strapi-plugin-populate-all", () => {
  test("if pagination reflects populated data", async () => {
    const response = await strapiRequest.get(
      "/api/articles?status=draft&populate=all"
    );

    expect(response.body.meta.pagination.total).toBe(response.body.data.length);
    expect(response.body.meta.pagination.pageCount).toBeGreaterThanOrEqual(1);
  });

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
    expect(
      response.body.data[0].category.articles[0].category
    ).not.toHaveProperty("article");
  });

  test("if everything is populated with populateAll=true", async () => {
    const response = await strapiRequest.get(
      "/api/articles?status=draft&populateAll=true"
    );

    // request succeeds
    expect(response.statusCode).toBe(200);

    // has first level of population
    expect(response.body.data[0]).toHaveProperty("cover");
    expect(response.body.data[0]).toHaveProperty("author");
    expect(response.body.data[0]).toHaveProperty("category");
    expect(response.body.data[0]).toHaveProperty("blocks");

    // doesn't loop
    expect(
      response.body.data[0].category.articles[0].category
    ).not.toHaveProperty("article");
  });

  test("if everything is populated with ?populateAll", async () => {
    const response = await strapiRequest.get(
      "/api/articles?status=draft&populateAll"
    );

    // request succeeds
    expect(response.statusCode).toBe(200);

    // has first level of population
    expect(response.body.data[0]).toHaveProperty("cover");
    expect(response.body.data[0]).toHaveProperty("author");
    expect(response.body.data[0]).toHaveProperty("category");
    expect(response.body.data[0]).toHaveProperty("blocks");

    // doesn't loop
    expect(
      response.body.data[0].category.articles[0].category
    ).not.toHaveProperty("article");
  });

  test("if `related` of `the-internet-s-own-boy` fully populates `this-shrimp-is-awesome`", async () => {
    const response = await strapiRequest.get(
      "/api/articles?status=draft&populate=all&filters[slug][$eq]=the-internet-s-own-boy"
    );

    expect(response.statusCode).toBe(200);

    const article = response.body.data[0];
    expect(article).toBeDefined();
    expect(article.slug).toBe("the-internet-s-own-boy");

    // recursion config allows article → related → article — so the nested article must be fully populated
    const shrimp = article.related.find(
      (a: { slug: string }) => a.slug === "this-shrimp-is-awesome"
    );
    expect(shrimp).toBeDefined();
    expect(shrimp).toHaveProperty("title", "This shrimp is awesome");
    expect(shrimp).toHaveProperty("description");
    expect(shrimp).toHaveProperty("author");
    expect(shrimp).toHaveProperty("category");
    expect(shrimp).toHaveProperty("blocks");
    expect(shrimp.author).toHaveProperty("name");
    expect(shrimp.category).toHaveProperty("name");
    expect(Array.isArray(shrimp.blocks)).toBe(true);
    expect(shrimp.blocks.length).toBeGreaterThan(0);
  });
});
