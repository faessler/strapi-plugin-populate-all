import type { UID } from "@strapi/strapi";

// memory cache to only execute query generation ones per modelUid
// biome-ignore lint/suspicious/noExplicitAny: any object can be cached
const queryCache: Partial<Record<UID.Schema, any>> = {};

export const getPopulateQuery = (
  modelUid: UID.Schema,
  parentsModelUids: UID.Schema[] = []
): { populate: object | true } | undefined => {
  try {
    // return cached query
    if (queryCache[modelUid]) {
      strapi.log.debug(`[populate-all] query cache hit: ${modelUid}`);
      return structuredClone(queryCache[modelUid]); // return a clone to avoid mutating the original object
    }

    // prevent infinite loop
    if (parentsModelUids.includes(modelUid)) {
      strapi.log.debug(
        `[populate-all] loop detected skipping population: ${modelUid}`
      );
      return { populate: {} };
    } else {
      parentsModelUids.push(modelUid);
    }

    // build query
    const query = { populate: {} };
    const model = strapi.getModel(modelUid);

    for (const [fieldName, attribute] of Object.entries(
      model.attributes || {}
    )) {
      // localization (only populate first level to prevent infinite loop)
      if (fieldName === "localizations") {
        query.populate[fieldName] = true;
        continue;
      }

      // dynamic zone
      if (attribute.type === "dynamiczone") {
        const components = Object.fromEntries(
          attribute.components.map((component) => [
            component,
            getPopulateQuery(component, parentsModelUids),
          ])
        );
        query.populate[fieldName] = { on: components };
        continue;
      }

      // component
      if (attribute.type === "component") {
        query.populate[fieldName] = getPopulateQuery(
          attribute.component,
          parentsModelUids
        );
        continue;
      }

      // relation
      if (attribute.type === "relation") {
        // skip private fields
        if (attribute.private === true) {
          continue;
        }

        // allow list of relations to populate OR if true populate all relations
        const relations = strapi
          .plugin("populate-all")
          .config<boolean | string[]>("relations");

        if (relations === true) {
          query.populate[fieldName] = getPopulateQuery(
            // @ts-expect-error target actually exists on attribute
            attribute.target,
            parentsModelUids
          );
          continue;
        }
        // @ts-expect-error target actually exists on attribute
        if (Array.isArray(relations) && relations.includes(attribute.target)) {
          query.populate[fieldName] = getPopulateQuery(
            // @ts-expect-error target actually exists on attribute
            attribute.target,
            parentsModelUids
          );
          continue;
        }
      }

      // media
      if (attribute.type === "media") {
        query.populate[fieldName] = true;
      }
    }

    // fallback to { populate: true }
    if (Object.keys(query.populate).length === 0) {
      query.populate = true;
    }

    // cache query
    strapi.log.debug(`[populate-all] new query cached: ${modelUid}`);
    queryCache[modelUid] = query;
    return structuredClone(query); // return a clone to avoid mutating the original object
  } catch (error) {
    // TODO: temporary console.error instead of strapi.log.error until https://github.com/strapi/strapi/pull/23657 is resolved
    // strapi.log.error(`[populate-all] getPopulateQuery(${modelUid}) failed: ${error}`);
    console.error(
      `[populate-all] getPopulateQuery(${modelUid}) failed: ${error}`
    );
    return undefined;
  }
};
