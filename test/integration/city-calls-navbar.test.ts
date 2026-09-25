import request from 'supertest';
import { createApp } from '../../src/app';
import * as navbarService from '../../src/modules/websites/city-calls/navbar/navbar.service';

describe('City Calls navbar routes', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('registers the admin menu route and protects it with authentication', async () => {
    const response = await request(createApp()).get('/api/v1/websites/city-calls/navbar/menus');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('exposes navbar data publicly without caching it', async () => {
    jest.spyOn(navbarService, 'listPublicNavbarMenus').mockResolvedValue([]);

    const response = await request(createApp()).get('/api/v1/public/websites/city-calls/navbar/menus');

    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body).toMatchObject({
      success: true,
      data: [],
    });
  });
});
