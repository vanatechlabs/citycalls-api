import request from 'supertest';
import { createApp } from '../../src/app';

describe('Registration routes', () => {
  it('protects the registrations route with authentication', async () => {
    const response = await request(createApp()).get('/api/v1/registrations');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('protects the unread counts route with authentication', async () => {
    const response = await request(createApp()).get('/api/v1/registrations/unread');

    expect(response.status).toBe(401);
  });

  it('validates the public website booking before saving', async () => {
    const response = await request(createApp()).post('/api/v1/public/registrations').send({});

    expect(response.status).toBe(422);
  });
});
