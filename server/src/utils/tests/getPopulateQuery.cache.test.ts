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
