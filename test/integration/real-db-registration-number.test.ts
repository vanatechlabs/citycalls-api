import request from 'supertest';
import { createApp } from '../../src/app';
import { connectTestDb, disconnectTestDb } from '../setup/testDb';
import { UserModel } from '../../src/modules/users/users.model';
import { RolePermissionModel } from '../../src/modules/config/rolePermissions.model';
import { loadPermissionCache } from '../../src/lib/permissionCache';
import { signAccessToken } from '../../src/lib/jwt';
import { nextRegistrationNo, updateNumberSettings, DEFAULT_NUMBER_SETTINGS } from '../../src/modules/registrations/registrationNumber';
import { createRegistration } from '../../src/modules/registrations/registrations.service';

// Registration number series (CC2026100705 = CityCalls, 7 Oct 2026, 5th of the
// day) against a real in-memory MongoDB: the daily counter, concurrent
// bookings, settings changes and the Settings API.
describe('Registration number series (real in-memory MongoDB)', () => {
  jest.setTimeout(60_000);
  let token: string;
  const actor = { name: 'Test Admin' };

  // 7 Oct 2026, 1:30 PM in India.
  const OCT_7 = new Date('2026-10-07T08:00:00Z');
  const OCT_8 = new Date('2026-10-08T08:00:00Z');

  beforeAll(async () => {
    await connectTestDb();
    const user = await UserModel.create({
      name: 'Admin', email: 'regno@test.local', mobile: '9333333333', passwordHash: 'x', role: 'SUPER_ADMIN', status: 'ACTIVE',
    });
    await RolePermissionModel.create([
      { role: 'SUPER_ADMIN', module: 'config', action: 'view', dataScope: 'ALL' },
      { role: 'SUPER_ADMIN', module: 'config', action: 'manageSettings', dataScope: 'ALL' },
    ]);
    await loadPermissionCache();
    token = signAccessToken({ sub: user._id.toString(), role: 'SUPER_ADMIN' });
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  it('counts up from 01 each day', async () => {
    expect(await nextRegistrationNo(OCT_7)).toBe('CC2026100701');
    expect(await nextRegistrationNo(OCT_7)).toBe('CC2026100702');
    expect(await nextRegistrationNo(OCT_7)).toBe('CC2026100703');
    // Next day starts again at 01.
    expect(await nextRegistrationNo(OCT_8)).toBe('CC2026100801');
    // …and the 7th keeps its own count.
    expect(await nextRegistrationNo(OCT_7)).toBe('CC2026100704');
  });

  it('never gives two bookings at the same moment the same number', async () => {
    const day = new Date('2026-10-09T08:00:00Z');
    const numbers = await Promise.all(Array.from({ length: 25 }, () => nextRegistrationNo(day)));
    expect(new Set(numbers).size).toBe(25);
    expect([...numbers].sort()).toEqual(Array.from({ length: 25 }, (_, i) => `CC20261009${String(i + 1).padStart(2, '0')}`));
  });

  it('saves a new registration with the new number', async () => {
    const registration = await createRegistration(
      {
        fullName: 'Vansh Chaudhary', email: 'vansh@example.com', phone: '9876543210', address: 'Raj Nagar',
        pincode: '201002', city: 'Ghaziabad', state: 'Uttar Pradesh', serviceName: 'AC Service', issueDescription: 'Not cooling',
      },
      actor
    );
    expect(registration.registrationNo).toMatch(/^CC\d{8}\d{2,}$/);
  });

  it('follows changed settings, with a fresh count for the new series', async () => {
    await updateNumberSettings({ ...DEFAULT_NUMBER_SETTINGS, prefix: 'CCX', separator: '-', sequenceDigits: 3 }, actor);
    expect(await nextRegistrationNo(OCT_7)).toBe('CCX-20261007-001');
    // Month-wise series: counter restarts per month, not per day.
    await updateNumberSettings({ ...DEFAULT_NUMBER_SETTINGS, includeDay: false }, actor);
    expect(await nextRegistrationNo(OCT_7)).toBe('CC20261001');
    expect(await nextRegistrationNo(OCT_8)).toBe('CC20261002');
    await updateNumberSettings(DEFAULT_NUMBER_SETTINGS, actor);
  });

  it('Settings API: needs login, returns settings + next number, saves and validates', async () => {
    const app = createApp();
    expect((await request(app).get('/api/v1/registration-number-settings')).status).toBe(401);

    const got = await request(app).get('/api/v1/registration-number-settings').set('Authorization', `Bearer ${token}`);
    expect(got.status).toBe(200);
    expect(got.body.data).toMatchObject({ prefix: 'CC', includeYear: true, includeMonth: true, includeDay: true, sequenceDigits: 2, separator: '' });
    expect(got.body.data.nextNumber).toMatch(/^CC\d{10,}$/);

    const saved = await request(app)
      .put('/api/v1/registration-number-settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...DEFAULT_NUMBER_SETTINGS, prefix: 'cct' });
    expect(saved.status).toBe(200);
    expect(saved.body.data.prefix).toBe('CCT');
    expect(saved.body.data.nextNumber).toMatch(/^CCT\d{8}01$/);
    expect(saved.body.data.updatedBy?.name).toBe('Admin');

    const bad = await request(app)
      .put('/api/v1/registration-number-settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...DEFAULT_NUMBER_SETTINGS, prefix: 'C C' });
    expect(bad.status).toBe(422);
  });
});
