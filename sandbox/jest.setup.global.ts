import { strapiStart, strapiStop } from './tests/strapi';
import { afterAll, beforeAll } from '@jest/globals';

beforeAll(async () => {
  await strapiStart();
});

afterAll(async () => {
  await strapiStop();
});
