import { UserModel } from './users.model';

// Menu Access keys are "<Section>::<Menu title>", so renaming a menu in the
// admin sidebar would silently take it away from users who had it. Old title
// → new title; runs on every server start and only touches users still on an
// old key, so running it again changes nothing.
const RENAMED_MENUS: Record<string, string> = {
  'Registration Section::New Registration': 'Registration Section::New Call',
  'Website Section::Key Features': 'Website Section::Why Choose Us',
};

export async function renameMenuAccessKeys() {
  let modified = 0;
  for (const [from, to] of Object.entries(RENAMED_MENUS)) {
    const result = await UserModel.updateMany({ menuAccess: from }, { $set: { 'menuAccess.$': to } });
    modified += result.modifiedCount;
  }
  if (modified > 0) console.log(`[menu-access] renamed menus for ${modified} user(s)`);
}
