import type { UID } from "@strapi/strapi";

// memory cache to only execute query generation once per requested model path
// biome-ignore lint/suspicious/noExplicitAny: any object can be cached
export const queryCache: Record<string, any> = {};

// generate a unique cache key from the model uid and its parent model uids
// returns "parent1|parent2|...|modelUid" or just "modelUid" if no parents
const buildCacheKey = (
  modelUid: UID.Schema,
  parentsModelUids: UID.Schema[]
): string => {
  if (parentsModelUids.length === 0) {
    return modelUid;
  }
  return `${parentsModelUids.join("|")}|${modelUid}`;
};

export const getPopulateQuery = (
  modelUid: UID.Schema,
  parentsModelUids: UID.Schema[] = []
): { populate: object | true } | undefined => {
  try {
    // user config to enable/disable cache
    const useCache =
      strapi.plugin("populate-all").config<boolean>("cache") ?? true;

    const cacheKey = buildCacheKey(modelUid, parentsModelUids);

    // return cached query
    if (useCache && queryCache[cacheKey]) {
      strapi.log.debug(`[populate-all] query cache hit: ${cacheKey}`);
      return structuredClone(queryCache[cacheKey]); // return a clone to avoid mutating the original object
    }

    // prevent infinite loop
    if (parentsModelUids.includes(modelUid)) {
      strapi.log.debug(
        `[populate-all] loop detected skipping population: ${modelUid}`
      );
      return { populate: {} };
    }

    // copy parents uids to avoid mutating the original array during recursion
    const nextParentsModelUids = [...parentsModelUids, modelUid];

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
            getPopulateQuery(component, nextParentsModelUids),
          ])
        );
        query.populate[fieldName] = { on: components };
        continue;
      }

      // component
      if (attribute.type === "component") {
        query.populate[fieldName] = getPopulateQuery(
          attribute.component,
          nextParentsModelUids
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
            nextParentsModelUids
          );
          continue;
        }
        // @ts-expect-error target actually exists on attribute
        if (Array.isArray(relations) && relations.includes(attribute.target)) {
          query.populate[fieldName] = getPopulateQuery(
            // @ts-expect-error target actually exists on attribute
            attribute.target,
            nextParentsModelUids
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
    if (useCache) {
      strapi.log.debug(`[populate-all] new query cached: ${cacheKey}`);
      queryCache[cacheKey] = query;
    }
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
