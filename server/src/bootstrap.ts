import type { Core, UID } from "@strapi/strapi";
import { PLUGIN_QUERY_DOCUMENT_TAG } from "./config";
import { getPopulateQuery } from "./utils/getPopulateQuery";

const bootstrap = ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.db.lifecycles.subscribe((event) => {
    try {
      if (
        event.action === "beforeFindMany" ||
        event.action === "beforeFindOne"
      ) {
        // There is a whitelist of keys we can use to detect our
        // filter from the params
        // https://github.com/strapi/strapi/blob/develop/packages/core/utils/src/content-api-constants.ts
        // We cheat.
        if (event.params._q?.includes(PLUGIN_QUERY_DOCUMENT_TAG)) {
          strapi.log.debug(
            `[populate-all] recursively populate ${event.model.uid}`
          );

          const populateQuery = getPopulateQuery(event.model.uid as UID.Schema);
          if (populateQuery?.populate) {
            event.params.populate = populateQuery.populate;
          }

          // Clean our tag from the custom query.
          const query = event.params._q.replace(PLUGIN_QUERY_DOCUMENT_TAG, "");
          if (query.length > 0) {
            event.params._q = query;
          } else {
            delete event.params._q;
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
