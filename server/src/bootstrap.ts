import type { Core, UID } from '@strapi/strapi';
import { getPopulateQuery } from './utils/getPopulateQuery';

const bootstrap = ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.db.lifecycles.subscribe((event) => {
    // @ts-expect-error `Property 'recursive' does not exist on type 'Params'.ts(2339)`
    if (event.params?.recursive === 'true') {
      if (event.action === 'beforeFindMany' || event.action === 'beforeFindOne') {
        strapi.log.debug(`[populate-all] recursively populate ${event.model.uid}`);

        const populateQuery = getPopulateQuery(event.model.uid as UID.Schema);
        if (populateQuery?.populate) {
          event.params.populate = populateQuery.populate;
        }
      }
    }
  });
};

export default bootstrap;
