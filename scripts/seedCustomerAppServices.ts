import '../src/config/env';
import mongoose from 'mongoose';
import { MasterModel, MasterType } from '../src/modules/config/master.model';
import { BranchModel } from '../src/modules/organization/organization.model';
import { ServiceModel } from '../src/modules/catalog/catalog.model';

type CategoryKey = 'HOME_APPLIANCES' | 'HOME_CLEANING' | 'PEST_CONTROL' | 'BEAUTY_SALOON' | 'HELP_NOW';

interface ServiceSeed {
  category: CategoryKey;
  name: string;
  description: string;
  basePrice?: number;
  visitingCharge?: number;
  durationMinutes?: number;
  checklist?: string[];
}

interface DiagnosticRow {
  service: string;
  complaint: string;
  symptom: string;
  defect: string;
  solution: string;
  solutionCategory: string;
}

const CATEGORIES: { key: CategoryKey; label: string; sortOrder: number }[] = [
  { key: 'HOME_APPLIANCES', label: 'Home Appliances', sortOrder: 1 },
  { key: 'HOME_CLEANING', label: 'Home Cleaning', sortOrder: 2 },
  { key: 'PEST_CONTROL', label: 'Pest Control', sortOrder: 3 },
  { key: 'BEAUTY_SALOON', label: 'Beauty Saloon', sortOrder: 4 },
  { key: 'HELP_NOW', label: 'Help Now', sortOrder: 5 },
];

const beautyServices = [
  'Haircut & Styling',
  'Hair Spa',
  'Facial',
  'Cleanup',
  'Manicure & Pedicure',
  'Waxing',
  'Threading',
  'Makeup',
  'Bridal Makeup',
  "Women's Salon at Home",
  'Hair Coloring',
  'Global Hair Color',
  'Root Touch-Up',
  'Hair Straightening',
  'Hair Smoothening',
  'Keratin Treatment',
  'Hair Rebonding',
  'Hair Treatment',
  'Anti-Dandruff Treatment',
  'Hair Fall Treatment',
  'Head Massage',
  'Hair Wash & Blow Dry',
  'Hair Styling',
  'Party Makeup',
  'Engagement Makeup',
  'Reception Makeup',
  'HD Makeup',
  'Airbrush Makeup',
  'Saree Draping',
  'Hairstyling for Events',
  'Eyebrow Threading',
  'Upper Lip Threading',
  'Full Face Threading',
  'Chin Threading',
  'Face Waxing',
  'Full Arms Waxing',
  'Half Arms Waxing',
  'Full Legs Waxing',
  'Half Legs Waxing',
  'Underarm Waxing',
  'Full Body Waxing',
  'Rica Waxing',
  'Chocolate Waxing',
  'Manicure',
  'Pedicure',
  'Spa Pedicure',
  'Spa Manicure',
  'Gel Manicure',
  'Nail Extension',
  'Nail Art',
  'Nail Removal',
  'Eyelash Extensions',
  'Eyelash Lift',
  'Eyebrow Shaping',
  'Bleach',
  'Face Bleach',
  'Body Bleach',
  'De-Tan Treatment',
  'Body Polishing',
  'Body Scrub',
  'Body Spa',
  'Back Facial',
  'Gold Facial',
  'Diamond Facial',
  'Pearl Facial',
  'Fruit Facial',
  'Bridal Facial',
  'Anti-Ageing Facial',
  'Acne Facial',
  'Hydrating Facial',
  'Skin Polishing',
  'Skin Cleanup',
  'Bridal Skin Care',
  'Pre-Bridal Package',
  'Basic Hair Spa',
  'Premium Hair Spa',
  'Deep Conditioning Hair Spa',
  'Hair Botox Treatment',
  'Premium Hair Botox Treatment',
  'Basic Beauty Package',
  'Glow & Glam Package',
  'Bridal Beauty Package',
  'Party Ready Package',
  'Complete Salon Package',
  'Hair & Beauty Combo',
  'Skin Care Combo',
  'Nail Care Combo',
  'Full Body Care Package',
  'Monthly Beauty Membership',
  'Premium Salon at Home',
  'Luxury Beauty at Home',
];

const cleaningRows = [
  {
    name: 'House Cleaning',
    trained: [
      'Sweep and mop accessible floors',
      'Dust and wipe furniture and wardrobes',
      'Dust reachable walls, fans, ceilings',
      'Change or rearrange existing bedding',
      'Dispose of wet and dry household waste',
    ],
    excluded: [
      'Cleaning unsafe or inaccessible areas',
      'Any tasks involving ladders or working at height',
      'Moving heavy furniture or appliances',
      'Cleaning outside home areas',
      'Child, elderly, pet or medical care',
    ],
  },
  {
    name: 'Dishwashing',
    trained: [
      'Wash regular household utensils',
      'Scrub and clean the kitchen sink',
      'Clean burners & wipe stove top',
      'Dispose of wet/dry kitchen waste',
      'Leave sink area clean and dry',
    ],
    excluded: [
      'Chimney, degreasing or duct cleaning',
      'Cleaning inside of electrical appliances',
      'Heavy scrubbing of burnt/old deposits',
      'Handling broken glass/ sharp waste',
      'No specialised cookware handling',
    ],
  },
  {
    name: 'Meal Prep',
    trained: [
      'Wash and chop vegetables',
      'Knead dough and prep batter',
      'Marinate and basic ingredient prep',
      'Clean and organize the prep area',
      'Store prepped items properly',
    ],
    excluded: [
      'Full meal cooking or plating',
      'Non-vegetarian meat preparation',
      'Specialized or gourmet recipes',
      'Grocery shopping or sourcing',
      'Operating unfamiliar appliances',
    ],
  },
  {
    name: 'Bathroom Cleaning',
    trained: [
      'Clean mirrors and reachable walls',
      'Clean WC (rim, seat, and lid)',
      'Scrub sinks and wipe fittings',
      'Mop and dry the bathroom floor',
      'Basic surface clean in bathroom',
    ],
    excluded: [
      'Hard stains, grouts or acid wash',
      'Cleaning ceilings and exhausts',
      'No drain unclogging/dismantling',
      'Handling biohazard waste',
      'No electrical or open wiring work',
    ],
  },
  {
    name: 'Laundry & Ironing',
    trained: [
      'Sort clothes and machine wash',
      'Dry clothes on a line or rack',
      'Fold and arrange in cupboards',
      'Iron regular daily wear clothes',
      'Tidy the laundry area after work',
    ],
    excluded: [
      'Ironing delicate or expensive fabrics',
      'Handling biohazard-stained clothes',
      'Cleaning the washing machine or dryer',
      'Advanced stain treatments',
      'Hand washing bed sheets, or footwear',
    ],
  },
  {
    name: 'Dusting & Wiping',
    trained: [
      'Dusting shelves and furniture',
      'Wipe counters, tables & decor',
      'Clean window sills/grills',
      'Remove accessible cobwebs',
      'Clean appliance exteriors',
    ],
    excluded: [
      'Dusting ceilings or high areas',
      'Using unstable stools or ladders',
      'No chandeliers or fragile items',
      'No exterior grills/windows',
      'Stain removal or restoration',
    ],
  },
  {
    name: 'Other Home Cleaning Tasks',
    trained: [
      'Clean reachable fans and cobwebs',
      'Basic meal prep (washing/chopping)',
      'Clean fridge',
      'Organising wardrobes',
      'Clean kitchen slab and stove top',
      'Clean windows (interior areas)',
    ],
    excluded: [
      'Change or rearrange existing bedding',
      'Arrange sofa cushions',
      'Arrange tabletops (dining or study)',
      'Clean and shine mirrors and taps',
      'Clean appliance exteriors',
    ],
  },
];

const serviceSeeds: ServiceSeed[] = [
  ...beautyServices.map((name, index) => ({
    category: 'BEAUTY_SALOON' as const,
    name,
    description: `${name} service at home by a trained CityCalls beauty professional.`,
    basePrice: index < 10 ? 299 : 499,
    visitingCharge: 99,
    durationMinutes: name.toLowerCase().includes('bridal') || name.toLowerCase().includes('package') ? 150 : 60,
  })),
  ...cleaningRows.map((row) => ({
    category: 'HOME_CLEANING' as const,
    name: row.name,
    description: `Included: ${row.trained.join('; ')}. Not included: ${row.excluded.join('; ')}.`,
    basePrice: 299,
    visitingCharge: 99,
    durationMinutes: 60,
    checklist: row.trained,
  })),
  ...[
    'AC Repair & Service',
    'AC Installation',
    'AC Gas Filling',
    'Washing Machine Repair',
    'Refrigerator Repair',
    'RO Water Purifier Service',
    'Geyser Repair & Service',
    'Chimney Repair & Service',
    'Microwave Oven Repair',
    'Dishwasher Repair',
    'LED TV Repair',
    'Inverter Repair',
    'Air Cooler Repair',
    'Kitchen Appliance Repair',
  ].map((name) => ({
    category: 'HOME_APPLIANCES' as const,
    name,
    description: `${name} at home by a verified CityCalls technician.`,
    basePrice: 399,
    visitingCharge: 99,
    durationMinutes: 75,
  })),
  ...[
    'General Pest Control',
    'Cockroach Control',
    'Termite Control',
    'Bed Bug Treatment',
    'Mosquito Control',
    'Rodent Control',
    'Ant Control',
    'Lizard Control',
    'Flea Control',
    'Wood Borer Control',
    'Disinfection Service',
  ].map((name) => ({
    category: 'PEST_CONTROL' as const,
    name,
    description: `${name} for homes and small offices using safe, professional treatment methods.`,
    basePrice: 699,
    visitingCharge: 99,
    durationMinutes: 90,
  })),
  ...[
    ['Dishwashing Help', 'Daily utensil washing and sink-area cleaning support.'],
    ['Cooking Help', 'Basic home cooking support for daily meals.'],
    ['Meal Prep Help', 'Vegetable washing, chopping, dough prep, batter prep, and kitchen prep support.'],
    ['House Maid Help', 'General household helper support for daily home tasks.'],
    ['Floor Sweeping & Mopping', 'Sweep and mop accessible floors for daily home upkeep.'],
    ['Dusting & Wiping Help', 'Dust and wipe reachable shelves, furniture, counters, and tables.'],
    ['Laundry Help', 'Sort, machine wash, dry, fold, and arrange regular clothes.'],
    ['Ironing Help', 'Iron regular daily-wear clothes at home.'],
    ['Bathroom Helper', 'Basic bathroom surface cleaning, mirror cleaning, sink wiping, and floor mopping.'],
    ['Kitchen Helper', 'Kitchen slab, stove top, sink, and basic appliance-exterior cleaning support.'],
    ['Bedding Change Help', 'Change or rearrange existing bedding and tidy sleeping areas.'],
    ['Wardrobe Organising Help', 'Fold and arrange clothes and organise accessible wardrobe sections.'],
    ['Fridge Cleaning Help', 'Basic reachable fridge cleaning and organising support.'],
    ['Window Interior Cleaning', 'Clean accessible interior windows, sills, and grills.'],
    ['Trash Disposal Help', 'Dispose of regular wet and dry household waste.'],
    ['Party Cleanup Help', 'Post-party basic cleanup, dishwashing, floor cleaning, and surface wiping support.'],
    ['Move-In Household Help', 'Basic household setup help after shifting, including cleaning and organising.'],
    ['Senior Citizen Daily Help', 'Assisted daily household-task support for elderly customers.'],
    ['One-Time Home Helper', 'Book a household helper for a one-time daily-task visit.'],
    ['Monthly Home Helper', 'Regular household helper support for daily or weekly home tasks.'],
    ['Custom Household Help', 'Tell us your household requirement when it does not fit a listed task.'],
  ].map(([name, description]) => ({
    category: 'HELP_NOW' as const,
    name,
    description,
    basePrice: 199,
    visitingCharge: 49,
    durationMinutes: 60,
  })),
];

function slugKey(label: string): string {
  return label
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
}

function uniqueRows(rows: DiagnosticRow[]): DiagnosticRow[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = `${row.service}|${row.complaint}|${row.symptom}|${row.defect}|${row.solution}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Beauty & Salon and Help Now are plain book-and-go services: there is no
// complaint/symptom/defect/solution chain to link, so they get none.
const CATEGORIES_WITHOUT_DIAGNOSTICS: CategoryKey[] = ['BEAUTY_SALOON', 'HELP_NOW'];

function genericDiagnostics(seed: ServiceSeed): DiagnosticRow[] {
  if (CATEGORIES_WITHOUT_DIAGNOSTICS.includes(seed.category)) return [];

  if (seed.category === 'HOME_CLEANING') {
    return [
      { service: seed.name, complaint: `${seed.name} Needed`, symptom: 'Dust, Stains or Untidy Area', defect: 'Regular Cleaning Due', solution: `${seed.name} Service`, solutionCategory: 'Cleaning' },
      { service: seed.name, complaint: 'Hygiene Concern', symptom: 'Area Needs Fresh Cleaning', defect: 'Dirt Build-Up', solution: `${seed.name} Sanitized Cleaning`, solutionCategory: 'Cleaning' },
    ];
  }

  if (seed.category === 'PEST_CONTROL') {
    return [
      { service: seed.name, complaint: `${seed.name} Needed`, symptom: 'Pest Activity Visible', defect: 'Infestation Source Active', solution: `${seed.name} Treatment`, solutionCategory: 'Pest Treatment' },
      { service: seed.name, complaint: 'Pests Returning Again', symptom: 'Recurring Pest Movement', defect: 'Entry Points or Eggs Untreated', solution: `${seed.name} Follow-Up`, solutionCategory: 'Follow-up' },
    ];
  }

  if (seed.category === 'HOME_APPLIANCES') {
    return [
      { service: seed.name, complaint: `${seed.name} Required`, symptom: 'Appliance Not Working Properly', defect: 'Part, Wiring or Servicing Issue', solution: `${seed.name} Diagnosis`, solutionCategory: 'Diagnosis' },
      { service: seed.name, complaint: 'Appliance Service Due', symptom: 'Performance Reduced', defect: 'Maintenance Pending', solution: `${seed.name} Service`, solutionCategory: 'Service' },
    ];
  }

  return [
    { service: seed.name, complaint: `${seed.name} Needed`, symptom: 'Daily Household Task Pending', defect: 'Household Help Required', solution: `${seed.name} Booking`, solutionCategory: 'Household Help' },
    { service: seed.name, complaint: 'Home Helper Required', symptom: 'Regular Chores Need Support', defect: 'No Helper Available', solution: `${seed.name} Support`, solutionCategory: 'Daily Help' },
  ];
}

class MasterCache {
  private byType = new Map<MasterType, Map<string, mongoose.Types.ObjectId>>();
  private keysInUse = new Map<MasterType, Set<string>>();
  stats = { reused: 0, created: 0 };

  async preload(masterType: MasterType) {
    const existing = await MasterModel.find({ masterType });
    const labelMap = new Map<string, mongoose.Types.ObjectId>();
    const keys = new Set<string>();
    for (const doc of existing) {
      labelMap.set(doc.label.trim().toLowerCase(), doc._id);
      keys.add(doc.key);
    }
    this.byType.set(masterType, labelMap);
    this.keysInUse.set(masterType, keys);
  }

  async upsert(masterType: MasterType, label: string, meta?: Record<string, unknown>) {
    const norm = label.trim().toLowerCase();
    const labelMap = this.byType.get(masterType)!;
    const existingId = labelMap.get(norm);
    if (existingId) {
      this.stats.reused++;
      if (meta) await MasterModel.updateOne({ _id: existingId }, { $set: { meta } });
      return existingId;
    }

    const keys = this.keysInUse.get(masterType)!;
    const baseKey = slugKey(label);
    let key = baseKey;
    let suffix = 2;
    while (keys.has(key)) key = `${baseKey}_${suffix++}`;

    const doc = await MasterModel.create({ masterType, key, label: label.trim(), meta: meta ?? {}, active: true });
    keys.add(key);
    labelMap.set(norm, doc._id);
    this.stats.created++;
    return doc._id;
  }
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI as string);

  const categoryIds = new Map<CategoryKey, mongoose.Types.ObjectId>();
  for (const category of CATEGORIES) {
    const doc = await MasterModel.findOneAndUpdate(
      { masterType: 'SERVICE_CATEGORY', key: category.key },
      {
        $set: {
          label: category.label,
          sortOrder: category.sortOrder,
          active: true,
        },
      },
      { upsert: true, new: true }
    );
    categoryIds.set(category.key, doc._id);
  }

  await MasterModel.updateMany(
    { masterType: 'SERVICE_CATEGORY', key: { $nin: CATEGORIES.map((category) => category.key) } },
    { $set: { active: false } }
  );
  await BranchModel.updateMany({}, { $addToSet: { serviceCategoryIds: { $each: [...categoryIds.values()] } } });

  const seededServiceNames = [...new Set(serviceSeeds.map((service) => service.name.trim()))];
  await ServiceModel.updateMany(
    { categoryId: { $in: [...categoryIds.values()] }, name: { $nin: seededServiceNames } },
    { $set: { active: false } }
  );

  let upserted = 0;
  for (const seed of serviceSeeds) {
    const categoryId = categoryIds.get(seed.category);
    if (!categoryId) throw new Error(`Missing category ${seed.category}`);

    await ServiceModel.findOneAndUpdate(
      { name: seed.name.trim() },
      {
        $set: {
          name: seed.name.trim(),
          description: seed.description,
          categoryId,
          expectedDurationMinutes: seed.durationMinutes ?? 60,
          pricing: {
            basePrice: seed.basePrice ?? 0,
            visitingCharge: seed.visitingCharge ?? 0,
            inspectionCharge: 0,
            emergencyCharge: 299,
          },
          mandatoryChecklist: seed.checklist ?? [],
          slaMinutes: 1440,
          active: true,
        },
        $setOnInsert: {
          applicableBrandIds: [],
          applicableProductTypeIds: [],
          complaintTypeIds: [],
          symptomIds: [],
          defectIds: [],
          solutionTypeIds: [],
          requiredSkills: [],
          warrantyPeriodDays: 0,
          requiredDocuments: [],
          requiredImages: { before: 0, after: 0 },
          customFields: [],
        },
      },
      { upsert: true, new: true }
    );
    upserted++;
  }

  const cache = new MasterCache();
  await Promise.all([
    cache.preload('COMPLAINT_TYPE'),
    cache.preload('SYMPTOM'),
    cache.preload('DEFECT'),
    cache.preload('SOLUTION'),
  ]);

  const diagnosticsByService = new Map<string, {
    complaintTypeIds: Set<string>;
    symptomIds: Set<string>;
    defectIds: Set<string>;
    solutionTypeIds: Set<string>;
  }>();

  for (const row of uniqueRows(serviceSeeds.flatMap(genericDiagnostics))) {
    const complaintId = await cache.upsert('COMPLAINT_TYPE', row.complaint);
    const symptomId = await cache.upsert('SYMPTOM', row.symptom);
    const defectId = await cache.upsert('DEFECT', row.defect);
    const solutionId = await cache.upsert('SOLUTION', row.solution, { repairCategory: row.solutionCategory });

    let links = diagnosticsByService.get(row.service);
    if (!links) {
      links = {
        complaintTypeIds: new Set(),
        symptomIds: new Set(),
        defectIds: new Set(),
        solutionTypeIds: new Set(),
      };
      diagnosticsByService.set(row.service, links);
    }
    links.complaintTypeIds.add(complaintId.toString());
    links.symptomIds.add(symptomId.toString());
    links.defectIds.add(defectId.toString());
    links.solutionTypeIds.add(solutionId.toString());
  }

  let servicesLinked = 0;
  for (const [serviceName, links] of diagnosticsByService) {
    const res = await ServiceModel.updateOne(
      { name: serviceName },
      {
        $set: {
          complaintTypeIds: [...links.complaintTypeIds],
          symptomIds: [...links.symptomIds],
          defectIds: [...links.defectIds],
          solutionTypeIds: [...links.solutionTypeIds],
        },
      }
    );
    if (res.matchedCount > 0) servicesLinked++;
  }

  const cleared = await ServiceModel.updateMany(
    { categoryId: { $in: CATEGORIES_WITHOUT_DIAGNOSTICS.map((key) => categoryIds.get(key)) } },
    { $set: { complaintTypeIds: [], symptomIds: [], defectIds: [], solutionTypeIds: [] } }
  );
  console.log(`[seed-customer-app-services] services with diagnostic links cleared (Beauty/Help Now): ${cleared.modifiedCount}`);

  console.log(`[seed-customer-app-services] categories active: ${CATEGORIES.length}`);
  console.log(`[seed-customer-app-services] services upserted: ${upserted}`);
  console.log(`[seed-customer-app-services] beauty saloon services: ${beautyServices.length}`);
  console.log(`[seed-customer-app-services] home cleaning services: ${cleaningRows.length}`);
  console.log(`[seed-customer-app-services] diagnostic masters: ${cache.stats.created} created, ${cache.stats.reused} reused`);
  console.log(`[seed-customer-app-services] services linked with diagnostics: ${servicesLinked}`);
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
