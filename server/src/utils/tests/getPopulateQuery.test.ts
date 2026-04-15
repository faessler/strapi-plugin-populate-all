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

  test("does not leak parentsModelUids between siblings", () => {
    // Scenario: a dynamic zone has two components that both relate to the same
    // target model ("shared-target"). Before the fix (pull#26), parentsModelUids was
    // passed by reference, so "shared-target" visited in comp-a would still be
    // in the visited set when comp-b was processed, incorrectly triggering loop
    // detection and returning an empty populate for the second branch.
    mockStrapi.plugin.mockReturnValue({
      config: vi.fn().mockImplementation((key: string) => {
        if (key === "relations") return true; // populate all relations
        if (key === "cache") return false; // disable cache so the second branch hits loop detection
        return undefined;
      }),
    });

    mockStrapi.getModel.mockImplementation((uid) => {
      switch (uid) {
        case "parent-model":
          return {
            attributes: {
              dz: {
                type: "dynamiczone",
                components: ["comp-a", "comp-b"],
              },
            },
          };
        case "comp-a":
          return {
            attributes: {
              relA: { type: "relation", target: "shared-target" },
            },
          };
        case "comp-b":
          return {
            attributes: {
              relB: { type: "relation", target: "shared-target" },
            },
          };
        case "shared-target":
          return {
            attributes: {
              name: { type: "string" },
            },
          };
        default:
          return { attributes: {} };
      }
    });

    const result = getPopulateQuery("parent-model" as UID.Schema);

    // Both comp-a and comp-b should fully populate shared-target
    expect(result).toEqual({
      populate: {
        dz: {
          on: {
            "comp-a": {
              populate: {
                relA: { populate: true },
              },
            },
            "comp-b": {
              populate: {
                relB: { populate: true },
              },
            },
          },
        },
      },
    });

    // shared-target must NOT trigger loop detection in either branch
    expect(mockStrapi.log.debug).not.toHaveBeenCalledWith(
      expect.stringContaining("loop detected")
    );
  });

  test("returns undefined on error", () => {
    mockStrapi.getModel.mockImplementation(() => {
      throw new Error("fail");
    });

    const result = getPopulateQuery("bad-model" as UID.Schema);

    expect(result).toBeUndefined();
  });
});
