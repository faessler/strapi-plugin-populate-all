import type { UID } from "@strapi/strapi";
export declare const getPopulateQuery: (modelUid: UID.Schema, parentsModelUids?: UID.Schema[]) => {
    populate: object | true;
} | undefined;
