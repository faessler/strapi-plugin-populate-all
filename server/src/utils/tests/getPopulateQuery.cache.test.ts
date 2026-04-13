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

  test("does not reuse a deep-recursion result into a later top-level query for the same model", () => {
    // Schema:
    //   outer → component `inner` → component `self` → relation `sibling` → relation back to `inner`
    // When `outer` is walked first, the recursion reaches `inner` a second time
    // as an ancestor, so `self` is legitimately short-circuited to { populate: {} }.
    // If that result is cached under the bare key `inner`, a subsequent top-level
    // walk of `inner` (e.g. `/api/inner?populate=all`) returns the shallow cached
    // version even though `inner` is NOT an ancestor in the top-level call.
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

    // deep `inner` is reached twice, second time as an ancestor,
    // producing a legitimately shallow sub-tree for the inner occurrence
    getPopulateQuery("outer" as UID.Schema);

    // top-level on `inner`, ust NOT reuse the deep result
    const topLevelInner = getPopulateQuery("inner" as UID.Schema);

    // `self` and `sibling` must be populated since they are NOT ancestors here
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
    // @ts-expect-error: simulating race condition where `queryCache` gets overwritten by other call
    queryCache.model.populate.media = false;

    expect(result).toEqual({
      populate: { media: true },
    });
  });
});
