import request from 'supertest';
import { createApp } from '../../src/app';

describe('City Calls home hero carousel routes', () => {
  it('registers the canonical admin route and protects it with authentication', async () => {
    const response = await request(createApp()).get(
      '/api/v1/websites/city-calls/home-page/hero-carousel/slides'
    );

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});
