import type { UID } from "@strapi/strapi";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { getPopulateQuery, queryCache } from "../getPopulateQuery";

describe("getPopulateQuery: recursion", () => {
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

  // self-referencing article model used across the tests
  const useArticleModel = () => {
    mockStrapi.getModel.mockImplementation((uid) => {
      switch (uid) {
        case "article":
          return {
            attributes: {
              related: { type: "relation", target: "article" },
            },
          };
        default:
          return { attributes: {} };
      }
    });
  };

  test("does not recurse when the modelUid has no recursion config", () => {
    mockStrapi.plugin.mockReturnValue({
      config: vi
        .fn()
        .mockImplementation((key) => (key === "relations" ? true : undefined)),
    });
    useArticleModel();

    const result = getPopulateQuery("article" as UID.Schema);

    // related is detected but stops on the very first self-reference
    expect(result).toEqual({
      populate: { related: { populate: {} } },
    });
  });

  test("recurses one level deep when configured with 1", () => {
    mockStrapi.plugin.mockReturnValue({
      config: vi.fn().mockImplementation((key) => {
        if (key === "relations") return true;
        if (key === "recursion") return { article: 1 };
        return undefined;
      }),
    });
    useArticleModel();

    const result = getPopulateQuery("article" as UID.Schema);

    // article → related (article) → related (stops here)
    expect(result).toEqual({
      populate: {
        related: { populate: { related: { populate: {} } } },
      },
    });
  });

  test("recurses two levels deep when configured with 2", () => {
    mockStrapi.plugin.mockReturnValue({
      config: vi.fn().mockImplementation((key) => {
        if (key === "relations") return true;
        if (key === "recursion") return { article: 2 };
        return undefined;
      }),
    });
    useArticleModel();

    const result = getPopulateQuery("article" as UID.Schema);

    // article → related → related → related (stops here)
    expect(result).toEqual({
      populate: {
        related: {
          populate: {
            related: { populate: { related: { populate: {} } } },
          },
        },
      },
    });
  });

  test("only recurses for configured modelUids", () => {
    // article is configured but author is not — author must not self-recurse
    mockStrapi.plugin.mockReturnValue({
      config: vi.fn().mockImplementation((key) => {
        if (key === "relations") return true;
        if (key === "recursion") return { article: 1 };
        return undefined;
      }),
    });
    mockStrapi.getModel.mockImplementation((uid) => {
      switch (uid) {
        case "article":
          return {
            attributes: {
              author: { type: "relation", target: "author" },
              related: { type: "relation", target: "article" },
            },
          };
        case "author":
          return {
            attributes: {
              colleague: { type: "relation", target: "author" },
            },
          };
        default:
          return { attributes: {} };
      }
    });

    const result = getPopulateQuery("article" as UID.Schema);

    // author recurses into colleague (first hop is always allowed),
    // but author → colleague → colleague stops because author has no recursion config
    expect(result).toEqual({
      populate: {
        author: { populate: { colleague: { populate: {} } } },
        related: {
          populate: {
            author: { populate: { colleague: { populate: {} } } },
            related: { populate: {} },
          },
        },
      },
    });
  });

  test("treats depth independently per modelUid", () => {
    // article allowed 1 level deep, page allowed 2 levels deep — counters don't bleed across uids
    mockStrapi.plugin.mockReturnValue({
      config: vi.fn().mockImplementation((key) => {
        if (key === "relations") return true;
        if (key === "recursion") return { article: 1, page: 2 };
        return undefined;
      }),
    });
    mockStrapi.getModel.mockImplementation((uid) => {
      switch (uid) {
        case "article":
          return {
            attributes: {
              related: { type: "relation", target: "article" },
              page: { type: "relation", target: "page" },
            },
          };
        case "page":
          return {
            attributes: {
              child: { type: "relation", target: "page" },
            },
          };
        default:
          return { attributes: {} };
      }
    });

    const result = getPopulateQuery("article" as UID.Schema);

    // page is allowed 2 levels deep → 3 page nodes in chain (root + 2 children)
    const pageSubtree = {
      populate: {
        child: {
          populate: { child: { populate: { child: { populate: {} } } } },
        },
      },
    };

    expect(result).toEqual({
      populate: {
        related: {
          populate: {
            related: { populate: {} },
            page: pageSubtree,
          },
        },
        page: pageSubtree,
      },
    });
  });
});
