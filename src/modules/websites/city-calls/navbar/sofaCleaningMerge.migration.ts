import { RegistrationModel } from '../../../registrations/registration.model';
import { NavbarMenuModel } from './navbarMenu.model';
import { NavbarServiceModel } from './navbarService.model';

// "Sofa Cleaning" is no longer its own navbar menu: its services (sofa
// shampooing, dry cleaning, carpet, mattress…) sit at the end of the Home
// Cleaning menu. Runs on every server start; once the Sofa Cleaning menu is
// gone (or where it never existed) it does nothing.
export async function mergeSofaCleaningIntoHomeCleaning() {
  const [sofa, home] = await Promise.all([
    NavbarMenuModel.findOne({ slug: 'sofa-cleaning' }).lean(),
    NavbarMenuModel.findOne({ slug: 'home-cleaning' }).lean(),
  ]);
  if (!sofa || !home) return;

  // After Home Cleaning's own services, in their existing order.
  const last = await NavbarServiceModel.findOne({ menuId: home._id }).sort({ sortOrder: -1 }).select('sortOrder').lean();
  let nextOrder = (last?.sortOrder ?? -1) + 1;
  const services = await NavbarServiceModel.find({ menuId: sofa._id }).sort({ sortOrder: 1, createdAt: 1 }).select('_id').lean();
  for (const service of services) {
    await NavbarServiceModel.updateOne({ _id: service._id }, { $set: { menuId: home._id, sortOrder: nextOrder++ } });
  }

  // Bookings are grouped by menu name in admin — keep the old ones findable.
  const bookings = await RegistrationModel.updateMany({ serviceCategory: sofa.name }, { $set: { serviceCategory: home.name } });
  await NavbarMenuModel.deleteOne({ _id: sofa._id });

  console.log(
    `[navbar] moved ${services.length} "${sofa.name}" service(s) into "${home.name}" (${bookings.modifiedCount} booking(s) re-grouped)`
  );
}
