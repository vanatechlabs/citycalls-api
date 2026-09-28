import request from 'supertest';
import { createApp } from '../../src/app';

describe('City Calls home offers routes', () => {
  it('protects the admin offer strip route with authentication', async () => {
    const response = await request(createApp()).get('/api/v1/websites/city-calls/home-page/offers/strip');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('protects the admin offer cards route with authentication', async () => {
    const response = await request(createApp()).get('/api/v1/websites/city-calls/home-page/offers/deals');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});
