import { BlogContent } from './blogs.model';

// The articles citycalls.in showed before blogs were editable. Copied into the
// database the first time Admin → Blog List is opened; until then the website
// shows these as they are.
const img = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=70`;

type DefaultBlog = Omit<BlogContent, 'h1Title' | 'metaKeywords' | 'status' | 'featured' | 'metaTitle' | 'metaDescription' | 'canonicalTag' | 'ogTitle' | 'ogImage' | 'openGraphTags' | 'schemaMarkup'> & {
  publishedAt: string;
};

const BLOGS: DefaultBlog[] = [
  {
    slug: '5-signs-your-ac-needs-servicing',
    title: '5 Signs Your AC Needs Servicing Before Summer Hits',
    excerpt: 'Weak airflow, strange smells, water leaks — spot the signals early and save on repairs.',
    image: img('photo-1621905251189-08b45d6a269e'),
    imageAlt: 'Technician servicing a split AC',
    author: 'Rohit Sharma',
    publishedAt: '2026-05-12',
    category: 'Home Appliance',
    content:
      '<p>Every summer we get thousands of AC service requests in Ghaziabad — and 8 out of 10 could have been prevented. Here are five signs your AC is asking for a service call.</p>' +
      '<ol><li><strong>Weak or warm airflow</strong> — usually a clogged filter or low gas.</li>' +
      '<li><strong>Unusual smell</strong> — bacterial growth on the evaporator coil.</li>' +
      '<li><strong>Water dripping indoors</strong> — blocked drain pipe.</li>' +
      '<li><strong>Loud rattling</strong> — a loose fan blade or worn bearing.</li>' +
      '<li><strong>High electricity bills</strong> — the compressor is working overtime.</li></ol>' +
      '<p>A ₹499 service now is far cheaper than a ₹6,000 compressor later.</p>',
  },
  {
    slug: 'monsoon-pest-control-checklist',
    title: 'The Monsoon Pest-Control Checklist Every Ghaziabad Home Needs',
    excerpt: "Cockroaches, mosquitoes and termites peak in the rains. Here's how to stay ahead of them.",
    image: img('photo-1526397751294-331021109fbd'),
    imageAlt: 'Rain on a window during monsoon',
    author: 'Neha Verma',
    publishedAt: '2026-06-03',
    category: 'Pest Control',
    content:
      '<p>Monsoon in NCR means one thing to pests — party time. Standing water, high humidity and cool corners create the ideal breeding ground. Here is our tried-and-tested checklist.</p>' +
      '<ul><li>Empty flowerpot trays weekly.</li><li>Seal cracks in bathroom tiles.</li><li>Store dry food in airtight containers.</li>' +
      '<li>Get a preventive gel-bait treatment before June.</li><li>Never ignore wood dust near skirting — that\'s termite territory.</li></ul>' +
      '<p>Book a preventive treatment and enjoy the rains without the guests.</p>',
  },
  {
    slug: 'how-often-should-you-deep-clean-your-sofa',
    title: 'How Often Should You Deep-Clean Your Sofa? (Answer May Surprise You)',
    excerpt: "That plush 3-seater collects more dust than a doormat. Here's the honest servicing schedule.",
    image: img('photo-1555041469-a586c61ea9bc'),
    imageAlt: 'Grey fabric sofa in a living room',
    author: 'Ananya Iyer',
    publishedAt: '2026-07-01',
    category: 'Cleaning',
    content:
      '<p>Your sofa is the most-used piece of furniture in your home — and the most neglected. Dust mites, dead skin cells, pet dander and food particles pile up inside the cushions.</p>' +
      '<p>Our recommendation: deep-clean every 4 months if you have kids or pets, every 6 months otherwise. A single session is around ₹1,200 for a 3-seater and takes ~90 minutes.</p>',
  },
  {
    slug: 'at-home-salon-hygiene-standards',
    title: 'The 7 Hygiene Standards to Demand From Any At-Home Salon',
    excerpt: 'Single-use waxing strips, sealed disposables, sanitised tools — non-negotiables.',
    image: img('photo-1560066984-138dadb4c035'),
    imageAlt: 'Salon tools laid out on a table',
    author: 'Priya Malhotra',
    publishedAt: '2026-07-10',
    category: 'Beauty & Salon',
    content:
      '<p>At-home beauty is convenient — but only if hygiene is uncompromising. Here are the seven things a professional at-home service must always deliver.</p>' +
      '<ol><li>Sealed, single-use disposables.</li><li>UV-sanitised metal tools.</li><li>Fresh linen for every client.</li>' +
      '<li>Product freshness — never squeezed from bulk tubs.</li><li>Handwash before starting.</li><li>Gloves for waxing.</li>' +
      '<li>Trained, verified professional with an ID card.</li></ol>',
  },
  {
    slug: 'ro-water-purifier-maintenance-tips',
    title: '5 RO Water Purifier Maintenance Tips for Clean Drinking Water',
    excerpt: "Don't wait for your RO to stop working. Regular filter changes keep your water safe and tasty.",
    image: img('photo-1548839140-29a749e1cf4d'),
    imageAlt: 'Glass of clean drinking water',
    author: 'Kunal Gupta',
    publishedAt: '2026-08-05',
    category: 'Home Appliance',
    content: '<p>RO purifiers need love too. Ensure you change your pre-filters every 3-4 months and get a complete service annually.</p>',
  },
  {
    slug: 'how-to-remove-stubborn-bathroom-stains',
    title: 'How to Remove Stubborn Bathroom Stains in Minutes',
    excerpt: "Hard water stains ruining your bathroom's look? Try these expert cleaning hacks.",
    image: img('photo-1584622650111-993a426fbf0a'),
    imageAlt: 'Clean white bathroom',
    author: 'Ananya Iyer',
    publishedAt: '2026-08-18',
    category: 'Cleaning',
    content: '<p>Hard water stains are the enemy of shiny tiles. Using a mix of vinegar and baking soda can help, or you can book a professional deep clean.</p>',
  },
  {
    slug: 'microwave-not-heating-troubleshooting',
    title: 'Microwave Not Heating? Common Causes and Fixes',
    excerpt: "Is your microwave turning on but food stays cold? Here's what might be wrong.",
    image: img('photo-1584269600464-37b1b58a9fe7'),
    imageAlt: 'Microwave oven in a kitchen',
    author: 'Rohit Sharma',
    publishedAt: '2026-09-02',
    category: 'Home Appliance',
    content: '<p>Magnetron failure, door switch issues, or a blown diode could be the culprit. Never try to fix a microwave yourself due to high voltage risks.</p>',
  },
  {
    slug: 'diy-facial-vs-professional-facial',
    title: "DIY Facial vs. Professional At-Home Facial: What's the Difference?",
    excerpt: 'Are store-bought kits enough, or do you need a professional touch for that glow?',
    image: img('photo-1512290923902-8a9f81dc236c'),
    imageAlt: 'Woman getting a facial',
    author: 'Priya Malhotra',
    publishedAt: '2026-09-15',
    category: 'Beauty & Salon',
    content: '<p>While DIY facials are great for maintenance, professional facials offer deep extraction, targeted treatments, and proper massage techniques.</p>',
  },
];

export const DEFAULT_BLOGS = BLOGS.map(({ publishedAt, ...blog }) => ({
  ...blog,
  h1Title: '',
  metaKeywords: '',
  status: 'PUBLISHED' as const,
  featured: false,
  metaTitle: '',
  metaDescription: '',
  canonicalTag: '',
  ogTitle: '',
  ogImage: '',
  openGraphTags: '',
  schemaMarkup: '',
  publishedAt: new Date(`${publishedAt}T10:00:00+05:30`),
}));
