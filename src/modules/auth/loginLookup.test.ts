import { loginLookup } from './auth.service';
import { loginSchema } from './auth.validation';

describe('sign-in identifier', () => {
  it('looks up emails, mobile numbers and usernames', () => {
    expect(loginLookup('Vansh@CityCalls.in')).toEqual({ email: 'vansh@citycalls.in' });
    expect(loginLookup('9000000001')).toEqual({ mobile: '9000000001' });
    expect(loginLookup(' Vansh ')).toEqual({ username: 'vansh' });
  });

  it('accepts a short username at the form', () => {
    expect(loginSchema.safeParse({ identifier: 'vansh', password: 'x' }).success).toBe(true);
  });
});
