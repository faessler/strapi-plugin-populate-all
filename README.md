# Strapi Plugin Populate All

[![Static Badge](https://img.shields.io/badge/strapi-market-4945FF?logo=strapi)](https://market.strapi.io/plugins/strapi-plugin-populate-all) [![NPM Version](https://img.shields.io/npm/v/strapi-plugin-populate-all?logo=npm&color=%23cb3837)](https://www.npmjs.com/package/strapi-plugin-populate-all) [![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/faessler/strapi-plugin-populate-all/test.yml?branch=main&logo=github&label=tests)](https://github.com/faessler/strapi-plugin-populate-all/actions/workflows/test.yml)

A lightweight Strapi plugin that enables you to **recursively populate** all nested components, dynamic zones and relations in your REST API responses using a simple query parameter: `?populate=all`.

## Features

- Use `?populate=all` in your API requests to automatically and deeply populate all nested relations, components, and dynamic zones for any content type.
- Fine-tune which relations are populated using plugin configuration.
- The generated populate queries are cached, so repeated REST requests for the same model are faster.

## Installation

All you need to do is install the plugin. Strapi should automatically detect and include it.

```
npm install strapi-plugin-populate-all
```

## Usage

Just add `?populate=all` to your REST API request, for example: `GET /api/articles?populate=all`
This will return the article with all nested components, dynamic zones and relations fully populated, regardless of depth.

## Configuration

You can configure which relations should be populated by default.  
Add the following to your Strapi project's `config/plugins.js` (or `config/plugins.ts`):

```js
module.exports = {
  "populate-all": {
    enabled: true,
    config: {
      // Populate all relations recursively (default)
      relations: true,

      // OR: Do not populate any relations
      relations: false,

      // OR: Only populate specific collection types by UID
      relations: ["api::article.article", "api::category.category"],
    },
  },
};
```

## How it works

- The plugin provides a global middleware that intercepts requests with `?populate=all` and rewrites the query to trigger recursive population.
- In the background, it builds a standard Strapi populate query as described in the [Strapi documentation](https://docs.strapi.io/cms/api/rest/populate-select).
- You can control which relations are included using the relations config option.
- Inside the document API, you can set `populate: '*'` and `recursive: true` to make it work
