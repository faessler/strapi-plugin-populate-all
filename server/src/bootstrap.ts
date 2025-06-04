import type { Core, UID } from '@strapi/strapi';
import { getPopulateQuery } from './utils/getPopulateQuery';

const bootstrap = ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.db.lifecycles.subscribe((event) => {
    try {
      // @ts-expect-error `Property 'recursive' does not exist on type 'Params'.ts(2339)`
      if (event.params?.recursive === 'true') {
        if (event.action === 'beforeFindMany' || event.action === 'beforeFindOne') {
          strapi.log.debug(`[populate-all] recursively populate ${event.model.uid}`);

          const populateQuery = getPopulateQuery(event.model.uid as UID.Schema);
          strapi.log.debug(
            `[populate-all] populate query for ${event.model.uid}: ${JSON.stringify(populateQuery.populate)}`
          );
          if (populateQuery?.populate) {
            event.params.populate = populateQuery.populate;
          }
        }
      }
    } catch (error) {
      strapi.log.error(`[populate-all] failed to apply populate db query: ${error}`);
    }
  });
};

export default bootstrap;
