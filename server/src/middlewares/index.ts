export default {
  /**
   * This is a global middleware to add support for the custom query param `?populate=all`.
   * Since Strapi's validator does not allow custom values for the populate param, we intercept the request here.
   * If `?populate=all` is detected, we omit the value and set `?recursive=true` instead.
   * The bootstrap script later picks up `?recursive=true` to apply the desired populate logic.
   */
  populateAll: async (ctx, next) => {
    if (ctx.query.populate === "all") {
      ctx.query.populate = undefined;
      ctx.query.populateAll = true;
    }
    await next();
  },
};
