export interface CategoryConfig {
  slug: string;
  dbCategory: string;
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  heroImage: string;
  iconName: 'Laptop' | 'Monitor' | 'Cpu' | 'Headphones' | 'HardDrive' | 'Wifi';
  subCategories: string[];
  highlights: { label: string; value: string }[];
  buyingAdvice: {
    question: string;
    answer: string;
  }[];
}

export const CATEGORIES_DATA: CategoryConfig[] = [
  {
    slug: 'laptops-notebooks',
    dbCategory: 'Laptops & Notebooks',
    name: 'Laptops & Mobile Workstations',
    shortName: 'Laptops & PCs',
    tagline: 'Aerospace-Grade Portables Engineered for High-Throughput South African Creators',
    description:
      'From 14-inch carbon-magnesium executive ultrabooks to 16-inch Core Ultra 9 / RTX 40-series mobile workstations. Every laptop is bench-tested in Johannesburg, fitted with factory-calibrated OLED panels, high-capacity all-day batteries suited for load shedding resilience, and protected by comprehensive 2-year local warranties.',
    heroImage: '/src/assets/images/product_laptop_pro_1793053698062.jpg',
    iconName: 'Laptop',
    subCategories: ['All Laptops', 'Creator & Workstation', 'Ultrabooks & Portables'],
    highlights: [
      { label: 'Display Panel', value: 'Factory Calibrated 3.2K / 2.8K OLED' },
      { label: 'Charging', value: '140W / 65W GaN Fast Charge' },
      { label: 'Local Warranty', value: '2-Year On-Site South Africa' },
      { label: 'Dispatch', value: 'Same-day from Sandton Depot' },
    ],
    buyingAdvice: [
      {
        question: 'How do Mevo laptops perform during South African load shedding?',
        answer:
          'Our StudioBook and AeroBook laptops feature high-density 90Wh and 72Wh battery banks paired with Intel Core Ultra hybrid architectures. Under balanced creator workloads, expect 10 to 14 hours of continuous operation. Plus, universal USB-C Power Delivery allows recharging from 65W+ portable power banks or DC backup stations.',
      },
      {
        question: 'Are RAM and SSDs user-upgradeable?',
        answer:
          'While LPDDR5X memory is soldered to deliver maximum 7467MHz memory bandwidth for AI neural tasks, all Mevo laptops include a secondary user-accessible M.2 PCIe 4.0 NVMe expansion slot for storage scaling.',
      },
      {
        question: 'What is included in the South African warranty?',
        answer:
          'Every laptop includes 24 months of full hardware replacement warranty covering the motherboard, screen, battery, and cooling system, serviced directly from our Sandton service center.',
      },
    ],
  },
  {
    slug: 'monitors-displays',
    dbCategory: 'Monitors & Displays',
    name: 'Curved OLED & Creator Displays',
    shortName: 'Displays',
    tagline: 'Quantum Dot OLED & IPS Black Reference Panels with True Color Fidelity',
    description:
      'Experience infinite contrast ratios, razor-sharp 0.03ms pixel response times, and hardware color calibration. Whether you are editing 4K HDR broadcast footage or running multi-window engineering suites, Lumina displays deliver unmatched visual clarity and integrated single-cable USB-C docking.',
    heroImage: '/src/assets/images/product_monitor_ultrawide_1793053698041.jpg',
    iconName: 'Monitor',
    subCategories: ['All Displays', 'Curved OLED', 'Color-Critical Displays'],
    highlights: [
      { label: 'Technology', value: 'QD-OLED & IPS Black' },
      { label: 'Color Gamut', value: '99.3% DCI-P3 · Delta E < 1' },
      { label: 'Docking', value: '90W / 96W USB-C KVM PD' },
      { label: 'Burn-in Warranty', value: '3-Year Zero Pixel Guarantee' },
    ],
    buyingAdvice: [
      {
        question: 'Why choose QD-OLED over traditional IPS gaming monitors?',
        answer:
          'Quantum Dot OLED panels illuminate each pixel individually, yielding true 0.000 nits blacks and an infinite static contrast ratio. Unlike traditional backlit monitors with blooming and backlight bleed, QD-OLED provides instantaneous 0.03ms transition speeds and immaculate shadow detail.',
      },
      {
        question: 'Does the monitor support single-cable charging for Mac and PC?',
        answer:
          'Yes. Both our 34" Curved OLED and 27" 4K ColorMaster models feature Thunderbolt / USB-C with up to 96W Power Delivery, delivering high-speed video, USB peripheral hub passthrough, and laptop charging over a single cable.',
      },
      {
        question: 'What coverage is provided under the 3-Year Burn-in Warranty?',
        answer:
          'Lumina monitors include advanced pixel cleaning heuristics and a comprehensive 3-year warranty covering any image retention or stuck sub-pixels with immediate Sandton replacement.',
      },
    ],
  },
  {
    slug: 'desktops-workstations',
    dbCategory: 'Desktops & Workstations',
    name: 'Custom Precision Workstations',
    shortName: 'Custom Desktops',
    tagline: 'Hand-Crafted High-Compute Towers & Small Form Factor Systems',
    description:
      'Assembled by master system integrators in Johannesburg. Featuring liquid-cooled multi-core processors, NVIDIA RTX 40-series accelerators, and whisper-quiet custom acoustic dampening. Every tower undergoes a 48-hour thermal soak and memory validation stress test before delivery.',
    heroImage: '/src/assets/images/product_desktop_workstation_1793053699096.jpg',
    iconName: 'Cpu',
    subCategories: ['All Workstations', 'High Performance', 'Compact Workstations'],
    highlights: [
      { label: 'Quality Control', value: '48-Hour Thermal Benchmark' },
      { label: 'Cooling', value: 'Custom 360mm Liquid Loop' },
      { label: 'Warranty', value: '3-Year Parts & Labor Local' },
      { label: 'Delivery', value: 'Dedicated Heavy Metro Courier' },
    ],
    buyingAdvice: [
      {
        question: 'How are workstations packaged and shipped safely across South Africa?',
        answer:
          'All custom towers are secured with high-density expanding internal InstaPak foam that suspends heavy graphics cards and heatsinks during transit. Each unit is shipped in double-walled reinforced crates via fragile freight courier.',
      },
      {
        question: 'Can I request custom hardware configurations?',
        answer:
          'Yes. We maintain extensive component inventory at our Sandton hub, allowing custom GPU, storage array, or ECC memory expansions prior to dispatch.',
      },
    ],
  },
  {
    slug: 'audio-peripherals',
    dbCategory: 'Audio & Peripherals',
    name: 'Audiophile Gear & Peripherals',
    shortName: 'Audio & Gear',
    tagline: 'Planar-Magnetic ANC Acoustics & CNC Aluminum Mechanical Keyboards',
    description:
      'Elevate your daily workstation tactile and acoustic experience. From wireless beryllium-diaphragm ANC headphones offering 45dB noise attenuation to gasket-mounted mechanical keyboards with factory-lubricated switches and hot-swappable sockets.',
    heroImage: '/src/assets/images/product_headphones_anc_1793053698607.jpg',
    iconName: 'Headphones',
    subCategories: ['All Audio & Gear', 'Over-Ear Headphones', 'Keyboards'],
    highlights: [
      { label: 'Noise Reduction', value: '45dB Adaptive Hybrid ANC' },
      { label: 'Audio Streaming', value: 'Sony LDAC 990kbps High-Res' },
      { label: 'Build Quality', value: 'CNC 6061 Anodized Aluminum' },
      { label: 'Battery Life', value: 'Up to 40 Hours Continuous' },
    ],
    buyingAdvice: [
      {
        question: 'Is LDAC high-resolution streaming supported on Android and Windows?',
        answer:
          'Yes, Aeon Elite supports 24-bit/96kHz LDAC lossless streaming natively on Android 8.0+ and via compatible Bluetooth transmitters on Windows and macOS.',
      },
      {
        question: 'Are Nova Pro keyboards compatible with Apple macOS?',
        answer:
          'Yes, all Nova mechanical keyboards feature a dedicated hardware toggle for Windows and Mac key layouts, with custom Command and Option replacement keycaps included in the box.',
      },
    ],
  },
  {
    slug: 'storage-devices',
    dbCategory: 'Storage Devices',
    name: 'Gen5 NVMe & Extreme Portable SSDs',
    shortName: 'Gen5 SSDs',
    tagline: 'Uncompromising 14,000 MB/s Throughput & Rugged On-Location Storage',
    description:
      'Maximize data transfer rates for 8K video timelines, complex database queries, and AI local LLM weights. From internal PCIe 5.0 M.2 drives equipped with passive thermal spreaders to IP67-rated portable USB4 drives that withstand rough South African safari and field conditions.',
    heroImage: '/src/assets/images/category_storage_ssd_1793214066602.jpg',
    iconName: 'HardDrive',
    subCategories: ['All Storage', 'Internal SSDs', 'External & Portable SSDs'],
    highlights: [
      { label: 'Internal Speeds', value: 'Up to 14,000 MB/s Read' },
      { label: 'Portable Armor', value: 'IP67 Water & 3m Drop Drop-Proof' },
      { label: 'NAND Flash', value: '232-Layer 3D TLC' },
      { label: 'Endurance', value: 'Up to 3,000 TBW · 5-Year Warranty' },
    ],
    buyingAdvice: [
      {
        question: 'Do I need a PCIe 5.0 compatible motherboard for TeraSync Gen5 SSDs?',
        answer:
          'While TeraSync Gen5 is backwards-compatible with PCIe 4.0 and 3.0 slots (running at maximum Gen4 speeds of ~7,400 MB/s), full 14,000 MB/s performance requires an AMD AM5 (X670/B650/X870) or Intel 13th/14th Gen PCIe 5.0 M.2 slot.',
      },
      {
        question: 'How tough is the TeraSync Rugged Extreme Portable SSD?',
        answer:
          'Encased in an aircraft aluminum core encased in shock-absorbing silicone armor, it is IP67 rated against heavy dust, rain, and drops onto concrete from up to 3 meters.',
      },
    ],
  },
  {
    slug: 'networking-smart-home',
    dbCategory: 'Networking & Smart Home',
    name: 'WiFi 7 Networking & Smart Infrastructure',
    shortName: 'WiFi 7 Networking',
    tagline: 'Multi-Gigabit Tri-Band WiFi 7 Engineered for South African Fiber Connections',
    description:
      'Unlock the full speed of your 500Mbps or 1Gbps South African fiber link (Openserve, Vumatel, Frogfoot, MetroFibre). Featuring 320MHz channel bandwidth, Multi-Link Operation (MLO), dual 10GbE multi-gig ethernet ports, and seamless whole-home mesh coverage.',
    heroImage: '/src/assets/images/category_wifi7_router_1793214079340.jpg',
    iconName: 'Wifi',
    subCategories: ['All Networking', 'Routers & Mesh'],
    highlights: [
      { label: 'Wireless Standard', value: 'Tri-Band WiFi 7 (802.11be)' },
      { label: 'Wired Ports', value: 'Dual 10GbE WAN/LAN Ports' },
      { label: 'Max Throughput', value: '19 Gbps Aggregate Wireless' },
      { label: 'Coverage Area', value: 'Up to 350m² per unit' },
    ],
    buyingAdvice: [
      {
        question: 'Will WiFi 7 work with my existing phones and laptops?',
        answer:
          'Yes, WiFi 7 is fully backwards-compatible with all existing WiFi 6, 6E, 5 (AC), and 2.4GHz smart devices. Existing devices will experience improved stability and lower network latency due to advanced preamble puncturing.',
      },
      {
        question: 'How do 10GbE ports benefit a home or office setup?',
        answer:
          'Dual 10GbE ports allow you to connect a multi-gigabit fiber ONT on one port and connect a high-speed NAS (Network Attached Storage) or managed switch on the second port without bottlenecks.',
      },
    ],
  },
];

export function getCategoryBySlug(slug: string): CategoryConfig | undefined {
  return CATEGORIES_DATA.find((c) => c.slug === slug);
}

export function getCategoryByDbName(name: string): CategoryConfig | undefined {
  return CATEGORIES_DATA.find((c) => c.dbCategory.toLowerCase() === name.toLowerCase());
}
