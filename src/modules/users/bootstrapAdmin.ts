import { env } from '../../config/env';
import { hashPassword } from '../auth/auth.service';
import { UserModel } from './users.model';

// Creates one Super Admin who signs in with a username, from the
// BOOTSTRAP_ADMIN_* env vars — the production image has no seed script, so
// this is how such an account reaches the live database. Runs at start-up and
// only ever creates: once the account exists it is left alone (its password
// can then be changed from the admin panel, and the env vars removed).
export async function ensureBootstrapAdmin(): Promise<void> {
  const { username, password, mobile, name } = env.bootstrapAdmin;
  if (!username || !password) return;

  const login = username.trim().toLowerCase();
  if (await UserModel.exists({ username: login })) return;

  if (!mobile || !/^[6-9]\d{9}$/.test(mobile)) {
    console.warn('[bootstrap-admin] BOOTSTRAP_ADMIN_MOBILE must be a 10-digit mobile number — account not created');
    return;
  }
  if (password.length < 8) {
    console.warn('[bootstrap-admin] BOOTSTRAP_ADMIN_PASSWORD must be at least 8 characters — account not created');
    return;
  }
  if (await UserModel.exists({ mobile })) {
    console.warn(`[bootstrap-admin] mobile ${mobile} already belongs to another user — account "${login}" not created`);
    return;
  }

  await UserModel.create({
    name: name || login,
    username: login,
    mobile,
    passwordHash: await hashPassword(password),
    role: 'SUPER_ADMIN',
    status: 'ACTIVE',
  });
  console.log(`[bootstrap-admin] created Super Admin "${login}"`);
}
