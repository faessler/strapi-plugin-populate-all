"use strict";
const config = {
  default: {
    relations: true
  },
  validator(config2) {
    const isBoolean = typeof config2?.relations === "boolean";
    const isArrayOfStrings = Array.isArray(config2?.relations) && config2?.relations?.every((relation) => typeof relation === "string");
    if (!(isBoolean || isArrayOfStrings)) {
      throw new Error(
        `[populate-all] config "relations" of type ${typeof config2?.relation} is not valid. Supported are boolean or Array of strings.`
      );
    }
  }
};
const middlewares = {
  /**
   * This is a global middleware to add support for the custom query param `?populate=all`.
   * Since Strapi's validator does not allow custom values for the populate param, we intercept the request here.
   * If `?populate=all` is detected, we omit the value and set `?recursive=true` instead.
   * The bootstrap script later picks up `?recursive=true` to apply the desired populate logic.
   */
  populateAll: async (ctx, next) => {
    if (ctx.query.populate === "all") {
      ctx.query.populate = void 0;
      ctx.query.recursive = "true";
    }
    await next();
  }
};
const register = ({ strapi: strapi2 }) => {
  strapi2.server.use(middlewares.populateAll);
};
const queryCache = {};
const getPopulateQuery = (modelUid) => {
  try {
    if (queryCache[modelUid]) {
      strapi.log.debug(`[populate-all] query cache hit: ${modelUid}`);
      return queryCache[modelUid];
    }
    const query = { populate: {} };
    const model = strapi.getModel(modelUid);
    for (const fieldName in model.attributes) {
      const attribute = model.attributes[fieldName];
      if (fieldName === "localizations") {
        continue;
      }
      if (attribute.type === "dynamiczone") {
        const components = Object.fromEntries(
          attribute.components.map((component) => [component, getPopulateQuery(component)])
        );
        query.populate[fieldName] = { on: components };
        continue;
      }
      if (attribute.type === "component") {
        query.populate[fieldName] = getPopulateQuery(attribute.component);
        continue;
      }
      if (attribute.type === "relation") {
        if (attribute.private === true) {
          continue;
        }
        const relations = strapi.plugin("populate-all").config("relations");
        strapi.log.debug(`[populate-all] relations to populate ${JSON.stringify(relations)}`);
        if (relations === true) {
          query.populate[fieldName] = getPopulateQuery(attribute.target);
          continue;
        }
        if (Array.isArray(relations) && relations.includes(attribute.target)) {
          query.populate[fieldName] = getPopulateQuery(attribute.target);
          continue;
        }
      }
      if (attribute.type === "media") {
        query.populate[fieldName] = { populate: true };
        continue;
      }
    }
    if (Object.keys(query.populate).length === 0) {
      query.populate = true;
    }
    strapi.log.debug(`[populate-all] new query cached: ${modelUid}`);
    queryCache[modelUid] = query;
    return query;
  } catch (error) {
    strapi.log.error(`[populate-all] getPopulateQuery(${modelUid}) failed: ${error}`);
    return void 0;
  }
};
const bootstrap = ({ strapi: strapi2 }) => {
  strapi2.db.lifecycles.subscribe((event) => {
    if (event.params?.recursive === "true") {
      if (event.action === "beforeFindMany" || event.action === "beforeFindOne") {
        strapi2.log.debug(`[populate-all] recursively populate ${event.model.uid}`);
        const populateQuery = getPopulateQuery(event.model.uid);
        if (populateQuery?.populate) {
          event.params.populate = populateQuery.populate;
        }
      }
    }
  });
};
const index = {
  config,
  register,
  bootstrap
};
module.exports = index;
