declare const _default: {
    /**
     * This is a global middleware to add support for the custom query param `?populate=all`.
     * Since Strapi's validator does not allow custom values for the populate param, we intercept the request here.
     * If `?populate=all` is detected, we omit the value and set `?recursive=true` instead.
     * The bootstrap script later picks up `?recursive=true` to apply the desired populate logic.
     */
    populateAll: (ctx: any, next: any) => Promise<void>;
};
export default _default;
