import { updateMenuAccessSchema } from './users.validation';

describe('Menu access validation', () => {
  it('accepts a list of menu keys, or null for every menu', () => {
    expect(updateMenuAccessSchema.safeParse({ menuAccess: ['Main::Dashboard', 'Website Section::FAQ'] }).success).toBe(true);
    expect(updateMenuAccessSchema.safeParse({ menuAccess: [] }).success).toBe(true);
    expect(updateMenuAccessSchema.safeParse({ menuAccess: null }).success).toBe(true);
  });

  it('rejects missing, blank or unexpected values', () => {
    expect(updateMenuAccessSchema.safeParse({}).success).toBe(false);
    expect(updateMenuAccessSchema.safeParse({ menuAccess: ['  '] }).success).toBe(false);
    expect(updateMenuAccessSchema.safeParse({ menuAccess: [], role: 'ADMIN' }).success).toBe(false);
  });
});
