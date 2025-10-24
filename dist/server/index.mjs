const queryCache = {};
const getPopulateQuery = (modelUid, parentsModelUids = []) => {
  try {
    if (queryCache[modelUid]) {
      strapi.log.debug(`[populate-all] query cache hit: ${modelUid}`);
      return structuredClone(queryCache[modelUid]);
    }
    if (parentsModelUids.includes(modelUid)) {
      strapi.log.debug(
        `[populate-all] loop detected skipping population: ${modelUid}`
      );
      return { populate: {} };
    } else {
      parentsModelUids.push(modelUid);
    }
    const query = { populate: {} };
    const model = strapi.getModel(modelUid);
    for (const [fieldName, attribute] of Object.entries(
      model.attributes || {}
    )) {
      if (fieldName === "localizations") {
        query.populate[fieldName] = true;
        continue;
      }
      if (attribute.type === "dynamiczone") {
        const components = Object.fromEntries(
          attribute.components.map((component) => [
            component,
            getPopulateQuery(component, parentsModelUids)
          ])
        );
        query.populate[fieldName] = { on: components };
        continue;
      }
      if (attribute.type === "component") {
        query.populate[fieldName] = getPopulateQuery(
          attribute.component,
          parentsModelUids
        );
        continue;
      }
      if (attribute.type === "relation") {
        if (attribute.private === true) {
          continue;
        }
        const relations = strapi.plugin("populate-all").config("relations");
        if (relations === true) {
          query.populate[fieldName] = getPopulateQuery(
            // @ts-expect-error target actually exists on attribute
            attribute.target,
            parentsModelUids
          );
          continue;
        }
        if (Array.isArray(relations) && relations.includes(attribute.target)) {
          query.populate[fieldName] = getPopulateQuery(
            // @ts-expect-error target actually exists on attribute
            attribute.target,
            parentsModelUids
          );
          continue;
        }
      }
      if (attribute.type === "media") {
        query.populate[fieldName] = true;
      }
    }
    if (Object.keys(query.populate).length === 0) {
      query.populate = true;
    }
    strapi.log.debug(`[populate-all] new query cached: ${modelUid}`);
    queryCache[modelUid] = query;
    return structuredClone(query);
  } catch (error) {
    console.error(
      `[populate-all] getPopulateQuery(${modelUid}) failed: ${error}`
    );
    return void 0;
  }
};
const bootstrap = ({ strapi: strapi2 }) => {
  strapi2.db.lifecycles.subscribe((event) => {
    try {
      if (event.action === "beforeFindMany" || event.action === "beforeFindOne") {
        if (event.params?.populateAll) {
          strapi2.log.debug(
            `[populate-all] recursively populate ${event.model.uid}`
          );
          const populateQuery = getPopulateQuery(event.model.uid);
          if (populateQuery?.populate) {
            event.params.populate = populateQuery.populate;
          }
        }
      }
    } catch (error) {
      console.error(
        `[populate-all] failed to apply populate db query: ${error}`
      );
    }
  });
};
const config = {
  default: {
    relations: true
  },
  validator(config2 = {}) {
    for (const [key, value] of Object.entries(config2)) {
      switch (key) {
        case "relations": {
          const isBoolean = typeof value === "boolean";
          const isArrayOfStrings = Array.isArray(value) && value?.every((relation) => typeof relation === "string");
          if (!(isBoolean || isArrayOfStrings)) {
            throw new Error(
              `[populate-all] config "${key}" of type ${typeof value} is not valid. Supported are boolean or Array of strings.`
            );
          }
          break;
        }
        default:
          strapi.log.warn(
            `[populate-all] unknown config "${key}" provided. This config will be ignored.`
          );
      }
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
      ctx.query.populateAll = true;
    }
    await next();
  }
};
const register = ({ strapi: strapi2 }) => {
  strapi2.server.use(middlewares.populateAll);
};
const index = {
  config,
  register,
  bootstrap
};
export {
  index as default
};
