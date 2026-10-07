// Seeds Admin → Customer App → Home Banner with the six top banners the
// customer app ships in lib/screens/home_screen.dart (_homeHeroSlides), and
// uploads their photos from that repo's assets/home_top_bannar/ folder.
//
// Additive and idempotent: a banner is matched by its two title lines, and
// one that already exists is left untouched — so re-running it never
// overwrites copy, images, order or status an admin has edited.
//
// Run: npm run seed:home-banners [-- <path to assets/home_top_bannar>]

import fs from 'fs';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';
import { connectDb, disconnectDb } from '../src/lib/db';
import { env } from '../src/config/env';
import { folderFor, isCloudinaryEnabled, saveLocalFile } from '../src/lib/fileStorage';
import { HomeBannerModel } from '../src/modules/customer-app/home-banners/homeBanner.model';

const ENTITY_TYPE = 'APP_HOME_BANNER';
const CATEGORY = 'APP_HOME_BANNER_IMAGE' as const;

const DEFAULT_ASSETS_DIR = path.resolve(__dirname, '..', '..', 'citycalls-customer-mobile', 'assets', 'home_top_bannar');

const HOME_BANNER_SEED = [
  {
    tagLine: 'Trusted Professionals',
    titleLine1: 'AC Service',
    titleLine2: '& Repair',
    description: 'Expert technicians for cooling, gas refill and installation.',
    file: 'ac-bannar.png',
    altText: 'CityCalls technician servicing a split AC',
  },
  {
    tagLine: 'Doorstep Service',
    titleLine1: 'Washing Machine',
    titleLine2: 'Repair',
    description: 'Front-load, top-load and semi-automatic — all brands.',
    file: 'wosing-bannar.png',
    altText: 'CityCalls technician repairing a washing machine',
  },
  {
    tagLine: 'Brand Experts',
    titleLine1: 'Refrigerator',
    titleLine2: 'Repair',
    description: 'Cooling issues, gas refill and compressor repair.',
    file: 'frez-bannar.png',
    altText: 'CityCalls technician repairing a refrigerator',
  },
  {
    tagLine: 'Pure Water',
    titleLine1: 'RO Purifier',
    titleLine2: 'Service',
    description: 'Filter change, repair and regular maintenance.',
    file: 'ro-bannar.png',
    altText: 'CityCalls technician servicing an RO water purifier',
  },
  {
    tagLine: 'Same Day Visit',
    titleLine1: 'TV Repair',
    titleLine2: '& Installation',
    description: 'LED, LCD and Smart TV repair and wall mounting.',
    file: 'tv-bannar.png',
    altText: 'CityCalls technician installing a TV',
  },
  {
    tagLine: 'Deep Cleaning',
    titleLine1: 'Kitchen Chimney',
    titleLine2: 'Service',
    description: 'Deep cleaning and repair for a smoke-free kitchen.',
    file: 'chemni-bannar.png',
    altText: 'CityCalls technician servicing a kitchen chimney',
  },
];

// Same storage the admin's upload flow uses: Cloudinary when enabled,
// otherwise the API's local uploads folder.
async function uploadImage(bannerId: string, absolutePath: string): Promise<string> {
  if (isCloudinaryEnabled()) {
    cloudinary.config({
      cloud_name: env.cloudinary.cloudName,
      api_key: env.cloudinary.apiKey,
      api_secret: env.cloudinary.apiSecret,
    });
    const result = await cloudinary.uploader.upload(absolutePath, {
      folder: folderFor(ENTITY_TYPE, bannerId, CATEGORY),
    });
    return result.secure_url;
  }
  const saved = saveLocalFile(ENTITY_TYPE, bannerId, CATEGORY, path.basename(absolutePath), fs.readFileSync(absolutePath));
  return saved.url;
}

async function main() {
  const assetsDir = path.resolve(process.argv[2] ?? DEFAULT_ASSETS_DIR);
  for (const banner of HOME_BANNER_SEED) {
    const filePath = path.join(assetsDir, banner.file);
    if (!fs.existsSync(filePath)) throw new Error(`Banner image not found: ${filePath}`);
  }

  await connectDb();
  let created = 0;

  for (const [index, { file, ...fields }] of HOME_BANNER_SEED.entries()) {
    const existing = await HomeBannerModel.findOne({ titleLine1: fields.titleLine1, titleLine2: fields.titleLine2 });
    if (existing) {
      console.log(`[seed] skip  "${fields.titleLine1} ${fields.titleLine2}" (already exists)`);
      continue;
    }

    const banner = await HomeBannerModel.create({
      ...fields,
      buttonText: 'Book a Service',
      sortOrder: index + 1,
      status: 'ACTIVE',
    });
    try {
      banner.image = await uploadImage(String(banner._id), path.join(assetsDir, file));
      await banner.save();
    } catch (error) {
      // Don't leave an image-less banner behind; the next run retries it.
      await banner.deleteOne();
      throw error;
    }
    created += 1;
    console.log(`[seed] added "${fields.titleLine1} ${fields.titleLine2}" → ${banner.image}`);
  }

  console.log(`[seed] done: ${created} added, ${HOME_BANNER_SEED.length - created} skipped`);
}

main()
  .catch((error) => {
    console.error('[seed] failed:', error);
    process.exitCode = 1;
  })
  .finally(() => disconnectDb());
