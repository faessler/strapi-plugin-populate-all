import type { Core, UID } from "@strapi/strapi";
import { getPopulateQuery } from "./utils/getPopulateQuery";

const bootstrap = ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.db.lifecycles.subscribe((event) => {
    try {
      if (
        event.action === "beforeFindMany" ||
        event.action === "beforeFindOne"
      ) {
        // @ts-expect-error it's a new key
        if (event.params?.populateAll) {
          strapi.log.debug(
            `[populate-all] recursively populate ${event.model.uid}`
          );

          const populateQuery = getPopulateQuery(event.model.uid as UID.Schema);
          if (populateQuery?.populate) {
            event.params.populate = populateQuery.populate;
          }
        }
      }
    } catch (error) {
      // TODO: temporary console.error instead of strapi.log.error until https://github.com/strapi/strapi/pull/23657 is resolved
      // strapi.log.error(`[populate-all] failed to apply populate db query: ${error}`);
      console.error(
        `[populate-all] failed to apply populate db query: ${error}`
      );
    }
  });
};

export default bootstrap;
