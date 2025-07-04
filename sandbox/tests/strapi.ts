import Strapi from '@strapi/strapi';
import supertest from 'supertest';
import type TestAgent from 'supertest/lib/agent';

export let strapiRequest: TestAgent;

export const strapiStart = async () => {
  // create strapi instance
  const context = await Strapi.compileStrapi();
  const strapi = Strapi.createStrapi(context);

  // assign test agent
  strapiRequest = supertest(strapi.server.app.callback());

  // start strapi server
  await strapi.start();
};

export const strapiStop = async () => {
  // stop strapi server
  await strapi.destroy();
};
