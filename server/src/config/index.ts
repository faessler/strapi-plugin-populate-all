export const PLUGIN_QUERY_DOCUMENT_TAG = "populate-all";

export default {
  default: {
    relations: true,
  },
  validator(config: Record<string, unknown> = {}) {
    for (const [key, value] of Object.entries(config)) {
      switch (key) {
        case "cache": {
          const isBoolean = typeof value === "boolean";
          if (!isBoolean) {
            throw new Error(
              `[populate-all] config "${key}" of type ${typeof value} is not valid. Supported is boolean.`
            );
          }
          break;
        }

        case "relations": {
          const isBoolean = typeof value === "boolean";
          const isArrayOfStrings =
            Array.isArray(value) &&
            value?.every((relation: unknown) => typeof relation === "string");
          if (!(isBoolean || isArrayOfStrings)) {
            throw new Error(
              `[populate-all] config "${key}" of type ${typeof value} is not valid. Supported are boolean or Array of strings.`
            );
          }
          break;
        }

        case "recursion": {
          const isRecordOfNumbers =
            typeof value === "object" &&
            value !== null &&
            !Array.isArray(value) &&
            Object.values(value).every(
              (depth: unknown) =>
                typeof depth === "number" &&
                Number.isInteger(depth) &&
                depth >= 0
            );
          if (!isRecordOfNumbers) {
            throw new Error(
              `[populate-all] config "${key}" of type ${typeof value} is not valid. Supported is an object mapping modelUid to a non-negative integer depth.`
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
  },
};
