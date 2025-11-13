import type { UID } from "@strapi/strapi";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { getPopulateQuery, queryCache } from "../getPopulateQuery";

describe("getPopulateQuery", () => {
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

  test("populates media attribute", () => {
    mockStrapi.getModel.mockReturnValue({
      attributes: {
        title: { type: "string" },
        media: { type: "media" },
      },
    });

    const result = getPopulateQuery("media-model" as UID.Schema);

    expect(result).toEqual({
      populate: { media: true },
    });
  });

  test("handles dynamiczone and component", () => {
    mockStrapi.getModel.mockImplementation((uid) => {
      switch (uid) {
        case "dynamiczone-model":
          return {
            attributes: {
              dz: { type: "dynamiczone", components: ["comp1"] },
            },
          };
        case "comp1":
          return {
            attributes: {
              foo: { type: "string" },
            },
          };
        default:
          return { attributes: {} };
      }
    });

    const result = getPopulateQuery("dynamiczone-model" as UID.Schema);

    expect(result).toEqual({
      populate: {
        dz: { on: { comp1: { populate: true } } },
      },
    });
  });

  test("handles relations with allowlist", () => {
    mockStrapi.plugin.mockReturnValue({
      config: vi.fn().mockReturnValue(["target-model"]),
    });
    mockStrapi.getModel.mockImplementation((uid) => {
      switch (uid) {
        case "rel-model":
          return {
            attributes: {
              rel: { type: "relation", target: "target-model" },
            },
          };
        case "target-model":
          return { attributes: {} };
        default:
          return { attributes: {} };
      }
    });

    const result = getPopulateQuery("rel-model" as UID.Schema);

    expect(result).toEqual({
      populate: {
        rel: { populate: true },
      },
    });
  });

  test("returns undefined on error", () => {
    mockStrapi.getModel.mockImplementation(() => {
      throw new Error("fail");
    });

    const result = getPopulateQuery("bad-model" as UID.Schema);

    expect(result).toBeUndefined();
  });
});
