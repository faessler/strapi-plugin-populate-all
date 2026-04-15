import type { UID } from "@strapi/strapi";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { getPopulateQuery, queryCache } from "../getPopulateQuery";

describe("getPopulateQuery: cache", () => {
  const mockStrapi = {
    log: { debug: vi.fn() },
    getModel: vi.fn(),
    plugin: vi.fn().mockReturnValue({ config: vi.fn() }),
  };

  beforeEach(() => {
    // @ts-expect-error enough to mock
    global.strapi = mockStrapi;
    mockStrapi.log.debug.mockClear();
    mockStrapi.getModel.mockClear();
    mockStrapi.plugin.mockClear();

    // reset cache
    Object.keys(queryCache).forEach((key) => {
      delete queryCache[key];
    });
  });

  test("uses cache by default", () => {
    mockStrapi.getModel.mockReturnValue({
      attributes: { media: { type: "media" } },
    });

    getPopulateQuery("model" as UID.Schema);

    expect(queryCache).toEqual({ model: { populate: { media: true } } });
  });

  test("uses cache if enabled", () => {
    mockStrapi.plugin.mockReturnValue({
      config: vi
        .fn()
        .mockImplementation((key) => (key === "cache" ? true : undefined)),
    });
    mockStrapi.getModel.mockReturnValue({
      attributes: { media: { type: "media" } },
    });

    getPopulateQuery("model" as UID.Schema);

    expect(queryCache).toEqual({ model: { populate: { media: true } } });
  });

  test("skips cache if disabled", () => {
    mockStrapi.plugin.mockReturnValue({
      config: vi
        .fn()
        .mockImplementation((key) => (key === "cache" ? false : undefined)),
    });
    mockStrapi.getModel.mockReturnValue({
      attributes: { media: { type: "media" } },
    });

    getPopulateQuery("model" as UID.Schema);

    expect(queryCache).toEqual({});
  });

  test("caches nested and top-level queries for the same model independently", () => {
    // outer → inner → inner-body → back to inner (loop-detected, short-circuited)
    // A top-level query on `inner` must not reuse the short-circuited nested result.
    mockStrapi.plugin.mockReturnValue({
      config: vi
        .fn()
        .mockImplementation((key) =>
          key === "relations" ? true : key === "cache" ? true : undefined
        ),
    });
    mockStrapi.getModel.mockImplementation((uid) => {
      switch (uid) {
        case "outer":
          return {
            attributes: { child: { type: "component", component: "inner" } },
          };
        case "inner":
          return {
            attributes: {
              self: { type: "component", component: "inner-body" },
              sibling: { type: "relation", target: "sibling" },
            },
          };
        case "inner-body":
          return {
            attributes: {
              back: { type: "relation", target: "inner" },
            },
          };
        case "sibling":
          return {
            attributes: { back: { type: "relation", target: "inner" } },
          };
        default:
          return { attributes: {} };
      }
    });

    // walk outer first — caches a short-circuited version of `inner`
    getPopulateQuery("outer" as UID.Schema);

    // top-level query on `inner` must produce a full populate tree
    const topLevelInner = getPopulateQuery("inner" as UID.Schema);
    expect(topLevelInner).toEqual({
      populate: {
        self: {
          populate: {
            back: { populate: expect.anything() },
          },
        },
        sibling: {
          populate: {
            back: { populate: expect.anything() },
          },
        },
      },
    });
  });

  test("cache does not mutate original object", () => {
    mockStrapi.plugin.mockReturnValue({
      config: vi
        .fn()
        .mockImplementation((key) => (key === "cache" ? true : undefined)),
    });
    mockStrapi.getModel.mockReturnValue({
      attributes: {
        media: { type: "media" },
      },
    });

    const result = getPopulateQuery("model" as UID.Schema);
    queryCache.model.populate.media = false;

    expect(result).toEqual({
      populate: { media: true },
    });
  });
});
