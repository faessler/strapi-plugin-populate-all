import type { Context, Next } from "koa";
import { PLUGIN_QUERY_DOCUMENT_TAG } from "../config";

export default {
  /**
   * This is a global middleware to add support for the custom query param `?populate=all`.
   * Since Strapi's validator does not allow custom values for the populate param, we intercept the request here.
   * If `?populate=all` is detected, we omit the value and set `?populateAll=true` instead.
   * The bootstrap script later picks up `?populateAll=true` to apply the desired populate logic.
   */
  populateAll: async (ctx: Context, next: Next) => {
    // always bind the tag so we can load the execpected populate hook
    // populateAll=true or ?populateAll (value can be 'true' or null)
    if (
      (ctx.query.populateAll && ctx.query.populateAll !== "false") ||
      ctx.query.populateAll === null
    ) {
      ctx.query._q = [ctx.query._q || "", PLUGIN_QUERY_DOCUMENT_TAG].join("");
    }

    if (ctx.query.populate === "all") {
      ctx.query.populate = undefined;
      ctx.query._q = [ctx.query._q || "", PLUGIN_QUERY_DOCUMENT_TAG].join("");
    }
    await next();
  },
};
