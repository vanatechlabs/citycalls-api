// Seeds the City Calls navbar (Admin → Navbar List) with every menu and
// service link the website ships in nextfrontend/src/data/services.ts.
//
// Additive and idempotent: a menu is matched by slug and a service link by
// its website path, and anything that already exists is left untouched — so
// re-running it never overwrites names, images, order or status an admin has
// edited. Images are left empty; the website falls back to its own icons.
//
// Run: npm run seed:navbar

import { connectDb, disconnectDb } from '../src/lib/db';
import { NavbarMenuModel } from '../src/modules/websites/city-calls/navbar/navbarMenu.model';
import { NavbarServiceModel } from '../src/modules/websites/city-calls/navbar/navbarService.model';

interface SeedMenu {
  name: string;
  slug: string;
  services: { name: string; slug: string }[];
}

const NAVBAR_SEED: SeedMenu[] = [
  {
    name: 'Home Appliance',
    slug: 'home-appliance',
    services: [
      { name: 'Refrigerator Service', slug: 'refrigerator-service' },
      { name: 'AC Service', slug: 'ac-service' },
      { name: 'Washing Machine Services', slug: 'washing-machine-services' },
      { name: 'Television Repair Services', slug: 'television-repair-services' },
      { name: 'Microwave & Oven Services', slug: 'microwave-oven-services' },
      { name: 'Geyser Repair Services', slug: 'geyser-repair-services' },
      { name: 'Chimney Repair Services', slug: 'chimney-repair-services' },
    ],
  },
  {
    name: 'Pest Control',
    slug: 'pest-control',
    services: [
      { name: 'General Pest Control', slug: 'general-pest-control' },
      { name: 'Termite Control', slug: 'termite-control' },
      { name: 'Cockroach Control', slug: 'cockroach-control' },
      { name: 'Mosquito Control', slug: 'mosquito-control' },
      { name: 'Bed Bug Treatment', slug: 'bed-bug-treatment' },
    ],
  },
  {
    name: 'Sofa Cleaning',
    slug: 'sofa-cleaning',
    services: [
      { name: 'Sofa Shampooing', slug: 'sofa-shampooing' },
      { name: 'Sofa Dry Cleaning', slug: 'sofa-dry-cleaning' },
      { name: 'Carpet Cleaning', slug: 'carpet-cleaning' },
      { name: 'Mattress Cleaning', slug: 'mattress-cleaning' },
    ],
  },
  {
    name: 'Home Cleaning',
    slug: 'home-cleaning',
    services: [
      { name: 'Home Cleaning', slug: 'home-cleaning' },
      { name: 'Kitchen Cleaning', slug: 'kitchen-cleaning' },
      { name: 'Bathroom Cleaning', slug: 'bathroom-cleaning' },
    ],
  },
  // Beauty & Salon is deliberately not in the navbar — it has its own site.
];

async function main() {
  await connectDb();
  let menusCreated = 0;
  let servicesCreated = 0;

  for (const [menuIndex, seedMenu] of NAVBAR_SEED.entries()) {
    let menu = await NavbarMenuModel.findOne({ slug: seedMenu.slug });
    if (!menu) {
      menu = await NavbarMenuModel.create({ name: seedMenu.name, slug: seedMenu.slug, sortOrder: menuIndex });
      menusCreated++;
    }

    for (const [serviceIndex, seedService] of seedMenu.services.entries()) {
      const path = `/services/${seedService.slug}`;
      const exists = await NavbarServiceModel.exists({ menuId: menu._id, path });
      if (exists) continue;
      await NavbarServiceModel.create({ menuId: menu._id, name: seedService.name, path, sortOrder: serviceIndex });
      servicesCreated++;
    }
  }

  console.log(`[seed:navbar] menus created: ${menusCreated}, service links created: ${servicesCreated}`);
}

main()
  .catch((error) => {
    console.error('[seed:navbar] failed', error);
    process.exitCode = 1;
  })
  .finally(() => disconnectDb());
