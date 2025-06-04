import type { UID } from '@strapi/strapi';

// memory cache to only execute query generation ones per modelUid
const queryCache: Partial<Record<UID.Schema, any>> = {};

export const getPopulateQuery = (modelUid: UID.Schema): { populate: object | true } | undefined => {
  try {
    // return cached query
    if (queryCache[modelUid]) {
      strapi.log.debug(`[populate-all] query cache hit: ${modelUid}`);
      return queryCache[modelUid];
    }

    // build query
    const query = { populate: {} };
    const model = strapi.getModel(modelUid);

    for (const [fieldName, attribute] of Object.entries(model.attributes || {})) {
      // localization (only populate first level to prevent infinite loop)
      if (fieldName === 'localizations') {
        query.populate[fieldName] = true;
        continue;
      }

      // dynamic zone
      if (attribute.type === 'dynamiczone') {
        const components = Object.fromEntries(
          attribute.components.map((component) => [component, getPopulateQuery(component)])
        );
        query.populate[fieldName] = { on: components };
        continue;
      }

      // component
      if (attribute.type === 'component') {
        query.populate[fieldName] = getPopulateQuery(attribute.component);
        continue;
      }

      // relation
      if (attribute.type === 'relation') {
        // skip private fields
        if (attribute.private === true) {
          continue;
        }

        // allow list of relations to populate OR if true populate all relations
        const relations = strapi.plugin('populate-all').config<boolean | string[]>('relations');

        if (relations === true) {
          // @ts-expect-error target actually exists on attribute
          query.populate[fieldName] = getPopulateQuery(attribute.target);
          continue;
        }
        // @ts-expect-error target actually exists on attribute
        if (Array.isArray(relations) && relations.includes(attribute.target)) {
          // @ts-expect-error target actually exists on attribute
          query.populate[fieldName] = getPopulateQuery(attribute.target);
          continue;
        }
      }

      // media
      if (attribute.type === 'media') {
        query.populate[fieldName] = true;
        continue;
      }
    }

    // fallback to { populate: true }
    if (Object.keys(query.populate).length === 0) {
      query.populate = true;
    }

    // cache query
    strapi.log.debug(`[populate-all] new query cached: ${modelUid}`);
    queryCache[modelUid] = query;
    return query;
  } catch (error) {
    strapi.log.error(`[populate-all] getPopulateQuery(${modelUid}) failed: ${error}`);
    return undefined;
  }
};
