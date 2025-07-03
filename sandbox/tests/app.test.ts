import { strapiStart, strapiRequest, strapiStop } from './strapi';
import { afterAll, beforeAll, expect, test } from '@jest/globals';

beforeAll(async () => {
  await strapiStart();
});

afterAll(async () => {
  await strapiStop();
});

test('strapi is defined', async () => {
  const response = await strapiRequest.get('/api/articles/aop0k4a9bi1oa35y0n88c2ku\?status=draft');
  expect(response.text).toBe(
    `{\"data\":{\"id\":1,\"documentId\":\"aop0k4a9bi1oa35y0n88c2ku\",\"title\":\"The internet's Own boy\",\"description\":\"Follow the story of Aaron Swartz, the boy who could change the world\",\"slug\":\"the-internet-s-own-boy\",\"createdAt\":\"2025-06-18T20:14:05.424Z\",\"updatedAt\":\"2025-06-18T20:14:05.424Z\",\"publishedAt\":null},\"meta\":{}}`
  );
});
