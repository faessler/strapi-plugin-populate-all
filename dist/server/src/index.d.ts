declare const _default: {
    config: {
        default: {
            relations: boolean;
        };
        validator(config?: Record<string, unknown>): void;
    };
    register: ({ strapi }: {
        strapi: import("@strapi/types/dist/core").Strapi;
    }) => void;
    bootstrap: ({ strapi }: {
        strapi: import("@strapi/types/dist/core").Strapi;
    }) => void;
};
export default _default;
