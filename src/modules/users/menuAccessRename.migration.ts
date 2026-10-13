import { UserModel } from './users.model';

// Menu Access keys are "<Section>::<Menu title>", so renaming a menu in the
// admin sidebar would silently take it away from users who had it. Old title
// → new title; runs on every server start and only touches users still on an
// old key, so running it again changes nothing.
const RENAMED_MENUS: Record<string, string> = {
  'Registration Section::New Registration': 'Registration Section::New Call',
  // Applied in order, so users still on "New Registration" end up here too.
  'Registration Section::New Call': 'Registration Section::Add New Call',
  'Website Section::Key Features': 'Website Section::Why Choose Us',
};

// Whole sidebar sections that were renamed: every "<old section>::<menu>" key
// moves to "<new section>::<menu>".
const RENAMED_SECTIONS: Record<string, string> = {
  'Registration Section': 'Service Call Section',
};

export async function renameMenuAccessKeys() {
  let modified = 0;
  for (const [from, to] of Object.entries(RENAMED_MENUS)) {
    const result = await UserModel.updateMany({ menuAccess: from }, { $set: { 'menuAccess.$': to } });
    modified += result.modifiedCount;
  }
  for (const [from, to] of Object.entries(RENAMED_SECTIONS)) {
    const prefix = `${from}::`;
    const users = await UserModel.find({ menuAccess: { $regex: `^${prefix}` } }).select('menuAccess').lean();
    for (const user of users) {
      const menuAccess = [...new Set((user.menuAccess ?? []).map((key: string) => (key.startsWith(prefix) ? `${to}::${key.slice(prefix.length)}` : key)))];
      await UserModel.updateOne({ _id: user._id }, { $set: { menuAccess } });
      modified += 1;
    }
  }
  if (modified > 0) console.log(`[menu-access] renamed menus for ${modified} user(s)`);
}
