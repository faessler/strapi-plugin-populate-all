export default {
  default: {
    relations: true,
  },
  validator(config) {
    const isBoolean = typeof config?.relations === 'boolean';
    const isArrayOfStrings =
      Array.isArray(config?.relations) &&
      config?.relations?.every((relation: unknown) => typeof relation === 'string');

    if (!(isBoolean || isArrayOfStrings)) {
      throw new Error(
        `[populate-all] config "relations" of type ${typeof config?.relation} is not valid. Supported are boolean or Array of strings.`
      );
    }
  },
};
