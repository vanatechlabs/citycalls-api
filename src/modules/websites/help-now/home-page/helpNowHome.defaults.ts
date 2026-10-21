import type { HelpNowHomeContent, HelpNowHomeSection } from './helpNowHome.validation';

// What the Help Now home page showed when it was hard-coded, so each admin
// page opens already filled in. Images are the website's own files
// (nexthelpnow/public/assets), previewed from the website.
export const HELP_NOW_HOME_DEFAULTS: HelpNowHomeContent = {
  hero: {
    slides: [
      {
        image: '/assets/Banner/h1.png',
        alt: 'Help Now maid wiping a table in a bright living room',
        badge: 'Premium Maid Services',
        titleLine1: 'Your Home,',
        titleLine2: 'Our Priority.',
        description:
          'Transform your lifestyle with our expert, background-checked maids. Dedicated home care tailored for your daily comfort.',
        primaryButtonText: 'Book Service Now',
        primaryButtonLink: '#services',
        secondaryButtonText: 'Explore Process',
        secondaryButtonLink: '#how-it-works',
        active: true,
      },
      {
        image: '/assets/Banner/h2.png',
        alt: 'Help Now maid washing dishes at the kitchen sink',
        badge: 'Same-Day Hourly Booking',
        titleLine1: 'Book in Minutes,',
        titleLine2: 'Relax for Hours.',
        description: 'Flexible hourly booking — choose your preferred time slot, and we handle the rest with perfection.',
        primaryButtonText: 'Book Service Now',
        primaryButtonLink: '#services',
        secondaryButtonText: 'Explore Process',
        secondaryButtonLink: '#how-it-works',
        active: true,
      },
      {
        image: '/assets/Banner/h3.png',
        alt: 'Help Now maid cleaning a bathroom washbasin',
        badge: '100% Satisfaction Guaranteed',
        titleLine1: 'Expert Maids,',
        titleLine2: 'Spotless Homes.',
        description:
          'Background-verified professionals arrive on time with complete supplies. Transparent pricing without hidden fees.',
        primaryButtonText: 'Book Service Now',
        primaryButtonLink: '#services',
        secondaryButtonText: 'Explore Process',
        secondaryButtonLink: '#how-it-works',
        active: true,
      },
    ],
  },
  marquee: {
    items: [
      { label: 'Book trusted maids by the hour', icon: 'BookOpen' },
      { label: 'Flexible timings', icon: 'Clock' },
      { label: 'Safe & secure', icon: 'ShieldCheck' },
      { label: '100% satisfaction', icon: 'Star' },
      { label: 'A part of CityCalls', icon: 'Sparkles' },
    ],
    status: 'ACTIVE',
  },
  about: {
    eyebrow: 'About HelpNow',
    heading: 'A Part of CityCalls —',
    highlight: 'CityCalls',
    headingLine2: 'Trusted by Thousands of Homes',
    description:
      'HelpNow is the maid services division of CityCalls. With a legacy of trust and quality, we bring you reliable, ' +
      'background-verified maids for all your cleaning needs. Flexible hourly booking, transparent pricing, and a ' +
      "hassle-free experience — that's the HelpNow promise.",
    points: [
      'Part of CityCalls — trusted brand with years of experience',
      'Verified & trained maids — background-checked and well-trained',
      'Safe, secure & reliable — your safety is our priority',
      'On-time service — maids arrive with all essentials',
      'No hidden charges — transparent pricing you can trust',
      'Flexible hourly booking — fits your schedule perfectly',
      '24/7 dedicated assistance — quick resolution for all your queries',
      'Complete satisfaction guarantee — hassle-free re-cleaning support',
    ],
    cards: [
      {
        title: 'Trusted Brand with Years of Experience',
        description: 'Part of CityCalls — a trusted platform with thousands of verified service bookings.',
        image: '/assets/Images/ab1.png',
        alt: 'Help Now maid wiping a kitchen counter',
      },
      {
        title: 'Safe, Secure & Reliable',
        description: 'Your safety and privacy are our top priority at every step of the process.',
        image: '/assets/Images/ab2.png',
        alt: 'Help Now maid cleaning a bathroom washbasin',
      },
      {
        title: 'Verified & Trained Maids',
        description: 'Background-checked and well-trained professionals for every home.',
        image: '/assets/Images/ab3.png',
        alt: 'Help Now maid wiping a sofa in a living room',
      },
      {
        title: 'Flexible Hourly Booking',
        description: 'Book maids by the hour that fits your schedule. Flexible & hassle-free.',
        image: '/assets/Images/ab4.png',
        alt: 'Help Now maid mopping a living room floor',
      },
    ],
    status: 'ACTIVE',
  },
  services: {
    cards: [
      {
        title: 'Dish Washing',
        subtitle: 'Utensil Care',
        subtitle2: '',
        description: 'Sparkling clean utensils with thorough hygiene, grease-free washing, and organized kitchen storage.',
        image: '/assets/Images/h1.png',
        alt: 'Help Now maid washing dishes in a modern kitchen',
      },
      {
        title: 'Kitchen',
        subtitle: 'Cleaning',
        subtitle2: 'Sanitization',
        description: 'Deep sanitized kitchen counters, stovetops, sink cleaning, and spotless tile wiping.',
        image: '/assets/Images/h2.png',
        alt: 'Help Now maid sanitising a kitchen counter and stovetop',
      },
      {
        title: 'Fan & Window',
        subtitle: 'Care',
        subtitle2: '',
        description: 'Dust-free windows, glass cleaning, mesh wiping, and high ceiling fan restoration.',
        image: '/assets/Images/h3.png',
        alt: 'Help Now helper dusting a ceiling fan',
      },
      {
        title: 'Laundry &',
        subtitle: 'Ironing',
        subtitle2: '',
        description: 'Fresh, neatly washed, folded & crisp steam ironed clothes delivered with care.',
        image: '/assets/Images/h4.png',
        alt: 'Help Now maid ironing clothes beside a laundry basket',
      },
      {
        title: 'Expert Home',
        subtitle: 'Care',
        subtitle2: '',
        description: 'Background-checked, police-verified professional maids tailored for your daily home comfort.',
        image: '/assets/Images/h5.png',
        alt: 'Help Now helper vacuuming a living room carpet',
      },
    ],
    status: 'ACTIVE',
  },
  faq: {
    eyebrow: 'Support & Info',
    heading: 'Frequently Asked Questions',
    highlight: 'Questions',
    description: 'Find answers to common inquiries about booking, services, and policies with HelpNow.',
    items: [
      {
        question: 'How quickly can I get a maid?',
        answer: 'For most services in Ghaziabad, we send a verified maid within 60–90 minutes of booking. You can also schedule a specific slot in advance.',
        image: '/assets/Images/h1.png',
        alt: 'Help Now maid arriving for a home visit',
        active: true,
      },
      {
        question: 'Do I pay before or after the service?',
        answer: 'Your choice — pay online while booking (UPI, card or net banking via Razorpay), or pay after the service is done.',
        image: '/assets/Images/h2.png',
        alt: 'Customer paying for a Help Now service',
        active: true,
      },
      {
        question: 'Is there a service guarantee?',
        answer: 'Yes. If you are not satisfied, tell us and we will send another helper or sort it out with you.',
        image: '/assets/Images/h3.png',
        alt: 'Help Now helper finishing a cleaning job',
        active: true,
      },
      {
        question: 'Are the maids background-verified?',
        answer: 'Every helper is background-verified, trained by HelpNow and rated by customers. Low-rated helpers are removed.',
        image: '/assets/Images/h4.png',
        alt: 'Verified Help Now maid at work',
        active: true,
      },
      {
        question: "What if I'm not happy with the service?",
        answer: "Call or WhatsApp our support team with your booking ID. We'll send another helper or make it right — your call.",
        image: '/assets/Images/h5.png',
        alt: 'Help Now support resolving a customer request',
        active: true,
      },
      {
        question: 'Do you serve areas outside Ghaziabad?',
        answer: "Right now we're focused on Ghaziabad. Noida, Greater Noida and Delhi are on our roadmap.",
        image: '/assets/Banner/dish.png',
        alt: 'Help Now service area across Ghaziabad',
        active: true,
      },
    ],
    status: 'ACTIVE',
  },
};

// A fresh copy, so callers can never mutate the defaults.
export function helpNowHomeDefault<K extends HelpNowHomeSection>(section: K): HelpNowHomeContent[K] {
  return structuredClone(HELP_NOW_HOME_DEFAULTS[section]);
}
