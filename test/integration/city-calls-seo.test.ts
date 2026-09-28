import request from 'supertest';
import { createApp } from '../../src/app';

describe('City Calls SEO routes', () => {
  it('protects the admin SEO page list with authentication', async () => {
    const response = await request(createApp()).get('/api/v1/websites/city-calls/seo/pages');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('rejects a public lookup without a valid path', async () => {
    const response = await request(createApp()).get('/api/v1/public/websites/city-calls/seo/meta?path=not-a-path');

    expect(response.status).toBe(422);
  });
});
