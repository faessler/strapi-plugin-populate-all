export default {
  default: {
    relations: true,
  },
  validator(config: Record<string, unknown> = {}) {
    for (const [key, value] of Object.entries(config)) {
      switch (key) {
        case 'relations': {
          const isBoolean = typeof value === 'boolean';
          const isArrayOfStrings =
            Array.isArray(value) &&
            value?.every((relation: unknown) => typeof relation === 'string');
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
  },
};
