/* eslint-disable no-console */
/**
 * Seeds the database with the same content the frontend ships as mock data.
 *
 *   node seed.js          # clears + reseeds the 7 public collections
 *
 * Images are stored as relative /photos/... paths (no Cloudinary uploads).
 * The frontend serves matching files from frontend/public/photos/; missing
 * ones will 404 in the browser but won't break rendering. Bookings, contacts,
 * and users are left untouched.
 */

require("dotenv").config();
const mongoose = require("mongoose");

const Destination = require("./models/Destination");
const Itinerary = require("./models/Itinerary");
const Experience = require("./models/Experience");
const Blog = require("./models/Blog");
const TeamMember = require("./models/TeamMember");
const Testimonial = require("./models/Testimonial");
const Company = require("./models/Company");

/* ── Data ─────────────────────────────────────────────────────────── */

const destinations = [
  {
    name: "Bwindi Impenetrable Forest",
    description: "An ancient rainforest in southwestern Uganda, Bwindi is home to roughly half of the world's surviving mountain gorillas. Trekking here puts you face-to-face with a habituated family in their natural element — no fences, no glass, no script.",
    history: "Designated a UNESCO World Heritage Site in 1994, Bwindi covers 331 km² of mist-blanketed slopes that have remained continuously forested for over 25,000 years. The Batwa people, the forest's original inhabitants, lived here for millennia before its gazettement as a national park.",
    googleMapsLink: "https://maps.google.com/?q=Bwindi+Impenetrable+National+Park",
    location: "Kanungu District, Southwestern Uganda",
    region: "West",
    bestTimeToVisit: "June—August · December—February",
    climate: "Cool, misty montane forest · 7—20°C",
    latitude: -1.0833, longitude: 29.6167,
    attractions: ["Gorilla trekking", "Nature walk", "Bird watching", "Conservation tour"],
    wildlife: ["Mountain Gorilla", "Common Chimpanzee", "Black-and-white Colobus", "Olive Baboon"],
    destinationType: "National Park",
    featured: true,
    backgroundImage: { url: "/photos/exp-bwindi-silverback.jpg", cloudinaryId: "mock/dest-bwindi-bg" },
    additionalImages: [
      { url: "/photos/why-baby-gorilla.jpg", cloudinaryId: "mock/dest-bwindi-1" },
      { url: "/photos/exp-trekking-gorilla-stick.jpg", cloudinaryId: "mock/dest-bwindi-2" },
    ],
    facts: [
      "Home to roughly half of the world's mountain gorillas (~459 individuals)",
      "Over 350 bird species, 23 of them Albertine Rift endemics",
      "Permits are limited to 8 visitors per gorilla family per day",
    ],
  },
  {
    name: "Queen Elizabeth National Park",
    description: "Stretching from the Rwenzori foothills to the open savanna of the Western Rift, Queen Elizabeth is Uganda's most biodiverse park — and home to the famous tree-climbing lions of Ishasha.",
    history: "Established in 1952 and named after Queen Elizabeth II's coronation visit, the park covers 1,978 km² across four districts. Its position on the Albertine Rift gives it ten distinct ecosystems within a single boundary.",
    googleMapsLink: "https://maps.google.com/?q=Queen+Elizabeth+National+Park+Uganda",
    location: "Kasese District, Western Rift Valley",
    region: "West",
    bestTimeToVisit: "Year-round · Drier June—August",
    climate: "Warm savanna · 18—28°C",
    latitude: -0.2, longitude: 30.0,
    attractions: ["Safari drive", "Bird watching", "Nature walk", "Sunset viewing"],
    wildlife: ["Lion", "African Elephant", "African Buffalo", "Hippopotamus", "Nile Crocodile", "Leopard"],
    destinationType: "National Park",
    featured: true,
    backgroundImage: { url: "/photos/exp-safari-lions.jpg", cloudinaryId: "mock/dest-qenp-bg" },
    additionalImages: [{ url: "/photos/why-vehicles-sunset.jpg", cloudinaryId: "mock/dest-qenp-1" }],
    facts: [
      "Over 95 mammal species and 600 bird species recorded",
      "Kazinga Channel hosts the world's largest concentration of hippos",
      "One of only two parks in Africa with tree-climbing lions",
    ],
  },
  {
    name: "Murchison Falls National Park",
    description: "Uganda's largest park, split in two by the Nile as it forces itself through a seven-metre rock cleft and explodes into the world's most powerful waterfall.",
    history: "Named by Sir Samuel Baker in 1864 after Roderick Murchison, then-president of the Royal Geographical Society. The park was gazetted in 1952 and covers 3,840 km² of woodland savanna, riverine forest, and papyrus swamp.",
    googleMapsLink: "https://maps.google.com/?q=Murchison+Falls+National+Park",
    location: "Northwestern Uganda, Nile Basin",
    region: "North",
    bestTimeToVisit: "December—February",
    climate: "Hot tropical · 22—32°C",
    latitude: 2.2667, longitude: 31.6833,
    attractions: ["Safari drive", "Bird watching", "Sunset viewing", "Scenic photo stop"],
    wildlife: ["African Elephant", "Lion", "Leopard", "Nile Crocodile", "Giraffe", "African Buffalo"],
    destinationType: "National Park",
    featured: true,
    backgroundImage: { url: "/photos/hero-murchison-falls.jpg", cloudinaryId: "mock/dest-murchison-bg" },
    additionalImages: [],
    facts: [
      "Largest national park in Uganda at 3,840 km²",
      "The Nile drops 43m through a 7m-wide cleft — 300 cubic metres per second",
      "Home to the rare shoebill stork in the Delta region",
    ],
  },
  {
    name: "Kidepo Valley National Park",
    description: "The far north. Karamoja plains, the quietest park in Uganda. Two seasons a year. A place that feels less visited and more arrived-at.",
    history: "Gazetted in 1962, Kidepo lies on the South Sudanese border in a semi-arid corner most Ugandans have never seen. Its 1,442 km² are flanked by the Morungole Mountains and watered only briefly by the Kidepo and Narus rivers.",
    googleMapsLink: "https://maps.google.com/?q=Kidepo+Valley+National+Park",
    location: "Karamoja Region, Far North",
    region: "North",
    bestTimeToVisit: "December—April",
    climate: "Semi-arid · 17—35°C",
    latitude: 3.9167, longitude: 33.75,
    attractions: ["Safari drive", "Scenic photo stop", "Panoramic lookout", "Bird watching"],
    wildlife: ["Lion", "Cheetah", "Plains Zebra", "Giraffe", "African Elephant", "African Buffalo"],
    destinationType: "National Park",
    featured: true,
    backgroundImage: { url: "/photos/dest-kidepo-zebras.jpg", cloudinaryId: "mock/dest-kidepo-bg" },
    additionalImages: [],
    facts: [
      "Uganda's most remote park — 12 hours by road from Kampala",
      "77 mammal species, 28 of them found in no other Ugandan park",
      "Awarded 'Africa's third-best national park' by CNN Travel",
    ],
  },
  {
    name: "Lake Mburo National Park",
    description: "The only park in Uganda where you walk among the wildlife. Compact, central, and the easiest stopover between Kampala and the western parks.",
    history: "Originally a controlled hunting area in 1933, then a game reserve in 1963, then a national park in 1983. The park sits in the Ankole pastoralist heartland — its 370 km² include five lakes and rolling acacia woodland.",
    googleMapsLink: "https://maps.google.com/?q=Lake+Mburo+National+Park",
    location: "Mbarara District, Central-Western Uganda",
    region: "West",
    bestTimeToVisit: "Year-round",
    climate: "Warm savanna · 17—28°C",
    latitude: -0.6, longitude: 30.95,
    attractions: ["Nature walk", "Bird watching", "Safari drive", "Sunset viewing"],
    wildlife: ["Plains Zebra", "Impala", "African Buffalo", "Warthog", "Hippopotamus"],
    destinationType: "National Park",
    featured: false,
    backgroundImage: { url: "/photos/dest-mburo-kob.jpg", cloudinaryId: "mock/dest-mburo-bg" },
    additionalImages: [],
    facts: [
      "Only park in Uganda where guided walking safaris are permitted",
      "Home to 350+ bird species in just 370 km²",
      "The only place to see impala in Uganda — Kampala is named after them",
    ],
  },
  {
    name: "Mount Elgon",
    description: "An extinct shield volcano on the Kenyan border, holding the third-largest caldera in the world and a waterfall — Sipi — that hikers come from three continents to see.",
    history: "At 4,321m, Elgon is older than Kilimanjaro and was once taller. The Bagisu people on its western slopes have farmed Arabica coffee here for six generations, and the mountain remains central to their identity and circumcision rites.",
    googleMapsLink: "https://maps.google.com/?q=Mount+Elgon+National+Park",
    location: "Kapchorwa District, Eastern Border",
    region: "East",
    bestTimeToVisit: "June—August · December—March",
    climate: "Cool highland · 5—22°C",
    latitude: 1.1333, longitude: 34.5333,
    attractions: ["Crater lake hike", "Nature walk", "Bird watching", "Panoramic lookout"],
    wildlife: ["African Elephant", "Vervet Monkey", "Black-and-white Colobus", "Olive Baboon"],
    destinationType: "Mountain Range",
    featured: false,
    backgroundImage: { url: "/photos/dest-elgon-sipi-falls.jpg", cloudinaryId: "mock/dest-elgon-bg" },
    additionalImages: [],
    facts: [
      "Third-largest volcanic caldera in the world — 50 km × 80 km",
      "Sipi Falls drops 100m in three tiers",
      "Arabica coffee from these slopes has its own protected origin status",
    ],
  },
];

const itineraries = [
  {
    title: "Twelve Days, Five Parks",
    description: "The whole arc — from the gorillas of Bwindi to the lions of Ishasha, the falls of the Nile, the zebra plains of Kidepo, and a last quiet morning by the lake. The trip we build for first-time visitors who want the country, not a slice of it.",
    daysCount: 12, nightsCount: 11,
    highlights: [
      "Gorilla trek in Bwindi (permit included)",
      "Two game drives in Queen Elizabeth incl. Ishasha tree-lions",
      "Top of Murchison Falls — by boat and by land",
      "Two nights in Kidepo, the quietest park in Uganda",
      "Sunrise walk in Lake Mburo with no vehicle",
    ],
    backgroundImage: { url: "/photos/why-vehicles-sunset.jpg", cloudinaryId: "mock/itin-12d-bg" },
    additionalImages: [
      { url: "/photos/hero-murchison-falls.jpg", cloudinaryId: "mock/itin-12d-1" },
      { url: "/photos/dest-kidepo-zebras.jpg", cloudinaryId: "mock/itin-12d-2" },
    ],
    inclusions: ["Hotel pickup and drop-off", "Road transport", "Buffet lunch", "Drinking water", "Tour guide", "Insurance", "Local taxes"],
    days: [
      { dayNumber: 1, activity: "Arrival in Entebbe", description: "Pickup at Entebbe International, briefing dinner at Lake Victoria Serena, early night." },
      { dayNumber: 2, activity: "Transfer to Murchison Falls", description: "Long drive north via Ziwa Rhino Sanctuary — tracking on foot in the afternoon." },
      { dayNumber: 3, activity: "Murchison morning + falls boat", description: "Game drive at dawn, then the launch upriver to the foot of the falls." },
      { dayNumber: 4, activity: "Top of the falls + transfer", description: "Walk to the lip of the falls, then south toward Kibale Forest." },
      { dayNumber: 5, activity: "Chimpanzee tracking, Kibale", description: "Morning permit in Kibale, afternoon community walk at Bigodi Wetlands." },
      { dayNumber: 6, activity: "Queen Elizabeth — Kazinga", description: "Drive into QE, afternoon launch on the Kazinga Channel for hippo and elephant." },
      { dayNumber: 7, activity: "Ishasha lions", description: "Full day in the Ishasha sector — fig trees, tree-climbing lions, sundowner on the savanna." },
      { dayNumber: 8, activity: "Transfer to Bwindi", description: "Short scenic drive south into the Impenetrable Forest. Briefing for trek day." },
      { dayNumber: 9, activity: "Gorilla trek, Bwindi", description: "Permit day. Pre-dawn briefing, trek with rangers, one hour with a habituated family." },
      { dayNumber: 10, activity: "Lake Mburo transfer + walk", description: "Drive east to Mburo. Late afternoon walking safari among zebra and impala." },
      { dayNumber: 11, activity: "Lake Mburo morning + Kampala", description: "Sunrise boat on the lake, then drive back to Kampala." },
      { dayNumber: 12, activity: "Departure", description: "Transfer to Entebbe International." },
    ],
    destinations: [
      { name: "Murchison Falls", duration: "2 nights" },
      { name: "Kibale Forest", duration: "1 night" },
      { name: "Queen Elizabeth", duration: "2 nights" },
      { name: "Bwindi Impenetrable", duration: "2 nights" },
      { name: "Lake Mburo", duration: "1 night" },
    ],
    price: 4850, oldPrice: 5400, currency: "USD",
    featured: true, discount: 10,
    activityTypes: ["Wildlife Safari", "Gorilla Trekking", "Chimpanzee Tracking", "Boat Safari", "Nature Walk"],
  },
  {
    title: "Gorillas & the Western Arc",
    description: "A focused six-night western loop. Bwindi for the gorillas, Queen Elizabeth for the lions, with two slow days through Kibale's chimps in between.",
    daysCount: 7, nightsCount: 6,
    highlights: ["Mountain gorilla permit and trek", "Chimpanzee tracking in Kibale", "Tree-climbing lions of Ishasha", "Boat cruise on Kazinga Channel"],
    backgroundImage: { url: "/photos/exp-bwindi-silverback.jpg", cloudinaryId: "mock/itin-west-bg" },
    additionalImages: [{ url: "/photos/exp-safari-lions.jpg", cloudinaryId: "mock/itin-west-1" }],
    inclusions: ["Hotel pickup and drop-off", "Road transport", "Buffet lunch", "Drinking water", "Tour guide", "Insurance"],
    days: [
      { dayNumber: 1, activity: "Kampala → Kibale", description: "Long but scenic drive west through the equator and tea country." },
      { dayNumber: 2, activity: "Chimp tracking", description: "Permit morning in Kibale. Afternoon swamp walk." },
      { dayNumber: 3, activity: "Kibale → Queen Elizabeth", description: "Short transfer south, afternoon game drive in QE." },
      { dayNumber: 4, activity: "Ishasha + Kazinga", description: "Morning lion search, afternoon boat cruise." },
      { dayNumber: 5, activity: "QE → Bwindi", description: "Scenic drive into the Impenetrable Forest. Briefing." },
      { dayNumber: 6, activity: "Gorilla trek", description: "Permit day. The one hour you came here for." },
      { dayNumber: 7, activity: "Bwindi → Kampala", description: "Long return drive or optional Entebbe flight." },
    ],
    destinations: [
      { name: "Kibale Forest", duration: "2 nights" },
      { name: "Queen Elizabeth", duration: "2 nights" },
      { name: "Bwindi Impenetrable", duration: "2 nights" },
    ],
    price: 2980, oldPrice: null, currency: "USD",
    featured: true, discount: 0,
    activityTypes: ["Gorilla Trekking", "Chimpanzee Tracking", "Wildlife Safari", "Boat Safari"],
  },
  {
    title: "Murchison & the North",
    description: "Four nights tracing the Nile from its passage through Murchison Falls up to the Karamoja plains of Kidepo. For travellers who want big skies and quieter parks.",
    daysCount: 5, nightsCount: 4,
    highlights: ["Top of Murchison Falls on foot", "Boat to the base of the falls", "Kidepo Valley — Uganda's quietest park", "Optional Karamoja cultural visit"],
    backgroundImage: { url: "/photos/hero-murchison-falls.jpg", cloudinaryId: "mock/itin-north-bg" },
    additionalImages: [{ url: "/photos/dest-kidepo-zebras.jpg", cloudinaryId: "mock/itin-north-1" }],
    inclusions: ["Hotel pickup and drop-off", "Road transport", "Buffet lunch", "Drinking water", "Tour guide"],
    days: [
      { dayNumber: 1, activity: "Kampala → Murchison", description: "Drive north with a Ziwa Rhino stop." },
      { dayNumber: 2, activity: "Murchison launch + top of falls", description: "Boat to the base, then walk to the top." },
      { dayNumber: 3, activity: "Transfer to Kidepo", description: "Long drive into Karamoja country." },
      { dayNumber: 4, activity: "Kidepo full day", description: "Narus Valley game drive, sundowner at Apoka." },
      { dayNumber: 5, activity: "Fly back to Entebbe", description: "Bush flight Apoka → Entebbe." },
    ],
    destinations: [
      { name: "Murchison Falls", duration: "2 nights" },
      { name: "Kidepo Valley", duration: "2 nights" },
    ],
    price: 2150, oldPrice: 2400, currency: "USD",
    featured: false, discount: 10,
    activityTypes: ["Wildlife Safari", "Boat Safari", "Cultural Experience", "Scenic Drive"],
  },
  {
    title: "Bwindi in Three Days",
    description: "The shortest possible trip that still does the gorillas justice. Fly in, trek, fly out — for the time-poor.",
    daysCount: 3, nightsCount: 2,
    highlights: ["Bush flight Entebbe → Kihihi", "Full-day gorilla trek", "One full rest day to absorb it"],
    backgroundImage: { url: "/photos/exp-trekking-gorilla-stick.jpg", cloudinaryId: "mock/itin-bwindi3-bg" },
    additionalImages: [],
    inclusions: ["Hotel pickup and drop-off", "Road transport", "Buffet lunch", "Tour guide"],
    days: [
      { dayNumber: 1, activity: "Fly to Bwindi", description: "Morning bush flight, afternoon briefing, dinner at lodge." },
      { dayNumber: 2, activity: "Gorilla trek", description: "Permit day. Habituated family encounter." },
      { dayNumber: 3, activity: "Return", description: "Optional Batwa community visit, then flight back." },
    ],
    destinations: [{ name: "Bwindi Impenetrable", duration: "2 nights" }],
    price: 1990, oldPrice: null, currency: "USD",
    featured: false, discount: 0,
    activityTypes: ["Gorilla Trekking", "Community Visit"],
  },
  {
    title: "Karamoja Cultural Loop",
    description: "Eight days in Uganda's far northeast — pastoralist communities, the Kidepo plains, and Mount Moroto. Designed with the communities we visit, not around them.",
    daysCount: 8, nightsCount: 7,
    highlights: ["Two nights with a Karimojong manyatta", "Mount Moroto half-day hike", "Kidepo Narus Valley game drives", "Visit to a regional craftswomen's co-op"],
    backgroundImage: { url: "/photos/dest-kidepo-zebras.jpg", cloudinaryId: "mock/itin-karamoja-bg" },
    additionalImages: [],
    inclusions: ["Hotel pickup and drop-off", "Road transport", "Buffet lunch", "Drinking water", "Tour guide", "Tips"],
    days: [
      { dayNumber: 1, activity: "Kampala → Soroti", description: "Long road day east." },
      { dayNumber: 2, activity: "Soroti → Moroto", description: "Cross into Karamoja, evening at the manyatta." },
      { dayNumber: 3, activity: "Mount Moroto hike", description: "Half-day hike with a local guide." },
      { dayNumber: 4, activity: "Transfer to Kidepo", description: "Drive north." },
      { dayNumber: 5, activity: "Kidepo Narus Valley", description: "Morning and afternoon game drives." },
      { dayNumber: 6, activity: "Kidepo Kanangorok hot springs", description: "Day trip to the South Sudanese border springs." },
      { dayNumber: 7, activity: "Fly out via Apoka", description: "Bush flight to Entebbe." },
      { dayNumber: 8, activity: "Departure", description: "Transfer to airport." },
    ],
    destinations: [
      { name: "Karamoja", duration: "3 nights" },
      { name: "Kidepo Valley", duration: "3 nights" },
    ],
    price: 3450, oldPrice: null, currency: "USD",
    featured: true, discount: 0,
    activityTypes: ["Cultural Experience", "Hiking", "Wildlife Safari", "Community Visit"],
  },
  {
    title: "The Sipi & Elgon Coffee Days",
    description: "Four nights on the slopes of Mount Elgon — coffee, Sipi Falls, and a half-day on the caldera rim. A slower, eastern alternative to the safari arc.",
    daysCount: 5, nightsCount: 4,
    highlights: ["Sipi Falls three-tier hike", "Bagisu coffee experience — bean to cup", "Caldera rim day hike", "Local market visit in Mbale"],
    backgroundImage: { url: "/photos/dest-elgon-sipi-falls.jpg", cloudinaryId: "mock/itin-elgon-bg" },
    additionalImages: [],
    inclusions: ["Hotel pickup and drop-off", "Road transport", "Morning tea", "Buffet lunch", "Tour guide"],
    days: [
      { dayNumber: 1, activity: "Kampala → Sipi", description: "Drive east to the falls." },
      { dayNumber: 2, activity: "Sipi three-tier hike", description: "All-day hike with a local guide." },
      { dayNumber: 3, activity: "Coffee day", description: "Visit a Bagisu farm, full bean-to-cup experience." },
      { dayNumber: 4, activity: "Elgon caldera rim", description: "Half-day hike toward the rim." },
      { dayNumber: 5, activity: "Return", description: "Drive back via Jinja for a Nile lunch." },
    ],
    destinations: [{ name: "Mount Elgon", duration: "4 nights" }],
    price: 1480, oldPrice: null, currency: "USD",
    featured: false, discount: 0,
    activityTypes: ["Hiking", "Cultural Experience", "Nature Walk", "Community Visit"],
  },
];

const experiences = [
  {
    title: "Mountain Gorilla Trek",
    description: "A pre-dawn briefing in Bwindi, then a guided trek through the Impenetrable Forest until you stand fifteen feet from a habituated silverback. Permits are limited to eight visitors per family per day — by design.",
    category: "Gorilla Trekking",
    duration: "Full day · 4—8 hours on foot",
    parks: ["Bwindi Impenetrable"],
    highlights: ["One hour at close range with a habituated family", "Permit and ranger included", "Optional porter service for trek bags"],
    coverImage: { url: "/photos/exp-bwindi-silverback.jpg", cloudinaryId: "mock/exp-gorilla-cover" },
    additionalImages: [
      { url: "/photos/exp-trekking-gorilla-stick.jpg", cloudinaryId: "mock/exp-gorilla-1" },
      { url: "/photos/why-baby-gorilla.jpg", cloudinaryId: "mock/exp-gorilla-2" },
    ],
    featured: true,
    price: 800, currency: "USD", priceUnit: "per permit",
    difficulty: "Challenging", bestTime: "Jun–Sep & Dec–Feb (dry)",
    minAge: 15, groupSize: "Max 8 per family",
    included: ["UWA gorilla permit", "Licensed UWA guide", "Armed ranger escort", "Porter introduction"],
    whatToBring: ["Sturdy hiking boots", "Waterproof jacket", "Long trousers", "Gardening gloves", "Insect repellent"],
  },
  {
    title: "Chimpanzee Tracking · Kibale",
    description: "Kibale holds the highest density of primates in Africa. A morning permit puts you in the forest with one of the habituated communities — closer, louder, and more unsettlingly familiar than you'd expect.",
    category: "Chimpanzee Tracking",
    duration: "Half day · 2—4 hours",
    parks: ["Kibale"],
    highlights: ["Habituated chimpanzee community", "Five other primate species visible on the same trail", "Optional Bigodi Wetlands afternoon walk"],
    coverImage: { url: "/photos/exp-trekking-gorilla-stick.jpg", cloudinaryId: "mock/exp-chimp-cover" },
    additionalImages: [],
    featured: true,
    price: 250, currency: "USD", priceUnit: "per permit",
    difficulty: "Moderate", bestTime: "Jun–Sep & Dec–Feb (dry)",
    minAge: 12, groupSize: "Max 6 per group",
    included: ["Chimpanzee permit", "Park entry", "Trained tracker"],
    whatToBring: ["Closed walking shoes", "Light rain jacket", "1.5 L of water", "Energy snacks"],
  },
  {
    title: "Ishasha Tree-Climbing Lions",
    description: "A full day in the Ishasha sector of Queen Elizabeth, the only place outside Tanzania where lions habitually rest in fig trees. Bring patience and a long lens.",
    category: "Cultural Experience",
    duration: "Full day · sunrise—sunset",
    parks: ["Queen Elizabeth"],
    highlights: ["Three lion prides regularly observed", "Picnic lunch in the savanna", "Sundowner stop on the way back"],
    coverImage: { url: "/photos/exp-safari-lions.jpg", cloudinaryId: "mock/exp-lions-cover" },
    additionalImages: [],
    featured: true,
    price: 80, currency: "USD", priceUnit: "per person",
    difficulty: "Easy", bestTime: "Year-round; best Jun–Sep",
    groupSize: "Max 7 per vehicle",
    included: ["Park entry", "Game-drive vehicle", "Guide", "Picnic lunch"],
    whatToBring: ["Binoculars", "Sun protection", "Long lens if available"],
  },
  {
    title: "Kazinga Channel Boat Cruise",
    description: "Two hours on the channel connecting Lakes George and Edward. The world's largest concentration of hippopotami, plus a procession of elephants and buffalo coming down to drink at dusk.",
    category: "Boat Safari",
    duration: "2—3 hours",
    parks: ["Queen Elizabeth"],
    highlights: ["Largest hippo concentration in the world", "Sunset departures available", "Over 60 bird species visible from the boat"],
    coverImage: { url: "/photos/why-vehicles-sunset.jpg", cloudinaryId: "mock/exp-kazinga-cover" },
    additionalImages: [],
    featured: false,
    price: 35, currency: "USD", priceUnit: "per person",
    difficulty: "Easy", bestTime: "Year-round",
    groupSize: "Boat capacity ~30",
    included: ["Boat fare", "Park entry", "Onboard guide"],
    whatToBring: ["Hat", "Sunscreen", "Camera"],
  },
  {
    title: "Top of Murchison Falls",
    description: "Walk to the lip where the Nile compresses into a seven-metre cleft. The noise sits in your chest. Best done after the morning boat to the base — you see both ends of the same drop.",
    category: "Nature Walk",
    duration: "Half day · 2—3 hours",
    parks: ["Murchison Falls"],
    highlights: ["Stand at the lip of the falls", "Pair with a morning launch to the base", "Sunset photo stop on the return"],
    coverImage: { url: "/photos/hero-murchison-falls.jpg", cloudinaryId: "mock/exp-murchison-cover" },
    additionalImages: [],
    featured: true,
    price: 40, currency: "USD", priceUnit: "per person",
    difficulty: "Moderate", bestTime: "Year-round; best Dec–Mar",
    minAge: 8, groupSize: "Small groups",
    included: ["Park entry", "Ranger guide", "Vehicle to trailhead"],
    whatToBring: ["Closed shoes", "Water", "Light rain jacket"],
  },
  {
    title: "Kidepo Walking Safari",
    description: "A guided foot safari across the Narus Valley with a ranger. Tracks, scat, signs — the slower, quieter way to read a savanna. Limited to small parties.",
    category: "Nature Walk",
    duration: "Half day · 3—4 hours",
    parks: ["Kidepo Valley"],
    highlights: ["Armed-ranger-guided foot safari", "Birding bonus — 470+ species in the park", "Sundowner in the Narus Valley"],
    coverImage: { url: "/photos/dest-kidepo-zebras.jpg", cloudinaryId: "mock/exp-kidepo-cover" },
    additionalImages: [],
    featured: false,
    price: 40, currency: "USD", priceUnit: "per person",
    difficulty: "Moderate", bestTime: "Sep–Mar (dry)",
    minAge: 12, groupSize: "Max 6 per ranger",
    included: ["Armed ranger", "Park entry", "Naturalist guide"],
    whatToBring: ["Closed shoes", "Wide-brim hat", "2 L water", "Sunscreen"],
  },
  {
    title: "Albertine Rift Birding",
    description: "A specialist-guided full-day birding trip across the western parks. 23 Albertine Rift endemics possible, with comfortable hides and minimal driving.",
    category: "Bird Watching",
    duration: "Full day",
    parks: ["Bwindi Impenetrable", "Queen Elizabeth", "Mount Elgon"],
    highlights: ["Specialist birding guide", "Targets: Shoebill, Green-breasted Pitta, Black Bee-eater", "Tailored to your trip list"],
    coverImage: { url: "/photos/dest-elgon-sipi-falls.jpg", cloudinaryId: "mock/exp-birding-cover" },
    additionalImages: [],
    featured: false,
    price: 350, currency: "USD", priceUnit: "per person",
    difficulty: "Easy", bestTime: "Nov–Apr (migrant season)",
    groupSize: "Max 4 per guide",
    included: ["Specialist guide", "Private vehicle", "Lunch", "Park entries"],
    whatToBring: ["Binoculars (8×42 or 10×42)", "Field notebook", "Regional bird guide"],
  },
  {
    title: "Lake Mburo Walking & Horseback",
    description: "The only park in Uganda that permits walking safari without a vehicle. Horseback options for those who want a different rhythm. Compact and easy as a stopover.",
    category: "Adventure",
    duration: "Half day or full day",
    parks: ["Lake Mburo"],
    highlights: ["Walking among zebra, impala, and warthog", "Optional horseback safari (intermediate riders)", "Easy day-trip from Kampala"],
    coverImage: { url: "/photos/dest-mburo-kob.jpg", cloudinaryId: "mock/exp-mburo-cover" },
    additionalImages: [],
    featured: false,
    price: 30, currency: "USD", priceUnit: "per person",
    difficulty: "Easy", bestTime: "Year-round",
    groupSize: "Max 8 per ranger",
    included: ["Park entry", "Ranger guide", "Optional horse hire"],
    whatToBring: ["Closed shoes", "Riding trousers if mounted", "Water"],
  },
];

const blogs = [
  {
    title: "What a gorilla permit actually buys you",
    date: "2026-04-12",
    category: "Field Notes",
    excerpt: "The $800 question, broken down: where the money goes, what it funds, and why the trek is worth more than the bill.",
    image: "/photos/exp-bwindi-silverback.jpg",
    cloudinaryId: "mock/blog-permit",
    readTime: "7 min read",
    content: "# What a gorilla permit actually buys you\n\nThe price of a Uganda Wildlife Authority gorilla permit went up to $800 in 2024. For first-time bookers, the number lands hard — it's often the single largest line item on the invoice. So it's worth understanding what you're actually paying for.\n\n## Where the money goes\n\nRoughly 65% of the permit fee goes to Uganda Wildlife Authority operations: ranger salaries, anti-poaching patrols, veterinary care for habituated families, and the slow, careful work of habituating new families (a process that takes 2—3 years). About 20% returns to the communities surrounding Bwindi via a revenue-sharing programme. The remainder funds research and infrastructure.\n\n## What you get in return\n\nA single permit grants one hour with a habituated family. There are 19 habituated families in Bwindi, each visited by no more than 8 people per day. The maths is deliberate: the gorillas see a small number of humans for a short time, and the rest of their day is theirs.\n\n## Why we don't push the half-day option\n\nYou can buy a habituation experience permit — four hours with a family being prepared for tourism — for $1,500. It exists, and we book it on request. But we steer most clients toward the standard one-hour trek. The longer experience disturbs younger family members more than the older ones can absorb, and the difference between one and four hours, in our experience, isn't four times the trip.\n\n## What to bring\n\nLong sleeves, rain layer, sturdy boots, walking gloves (the foliage bites), and a porter — they're $20, and the hire supports community employment. Don't bring a flash. Don't wear bright red.",
  },
  {
    title: "Why we drive the long way north",
    date: "2026-03-28",
    category: "On the Road",
    excerpt: "There's a 90-minute flight from Entebbe to Apoka. We rarely take it. Here's what the twelve-hour drive gives you that the flight doesn't.",
    image: "/photos/dest-kidepo-zebras.jpg",
    cloudinaryId: "mock/blog-northdrive",
    readTime: "5 min read",
    content: "# Why we drive the long way north\n\nThe bush flight from Entebbe to Apoka in Kidepo takes 90 minutes. The drive takes twelve hours, sometimes more if the rains have done what the rains do. We almost always recommend the drive. Here's why.\n\n## The country between\n\nThe road north takes you through Karamoja — a region most Ugandan-born travellers haven't visited either. Pastoralist communities, semi-arid plains, Mount Moroto rising out of the heat haze. None of this is visible from 8,000 feet. Skipping the drive means skipping the country.\n\n## Arrival, properly\n\nKidepo is the quietest park in Uganda because it's hard to reach. Flying in doesn't change the park, but it changes you. You arrive without context — without having watched the landscape thin out, without the slow shift from green hills to red earth. The drive is the on-ramp.\n\n## When to take the flight\n\nWe do book the flight for clients with under five days, or for those returning south after Kidepo (it's a brutal drive twice). But when there's time, we drive. The flight is convenient. The drive is the trip.",
  },
  {
    title: "The unwritten ethics of safari photography",
    date: "2026-03-10",
    category: "Field Notes",
    excerpt: "When to lower the camera. When to ask. And why the best photographers we work with shoot less, not more.",
    image: "/photos/exp-safari-lions.jpg",
    cloudinaryId: "mock/blog-photo-ethics",
    readTime: "6 min read",
    content: "# The unwritten ethics of safari photography\n\nA few thoughts on the camera-in-the-savanna question — based not on rules but on watching how people end up regretting their photos, or not regretting them, over the years.\n\n## Animals\n\nThe rangers will give you the rules — no flash, no calling, no clicking too aggressively in close encounters. Follow them. The rest is judgement. A good rule: if your subject is reacting to you, you've stopped being a witness and started being part of the scene. Lower the camera.\n\n## People\n\nThis is the harder one. Photographing people in communities you visit — without their explicit yes, in their language — is something most thoughtful travellers do once and never again. The Karimojong are not landscape. The Batwa are not part of the forest. Ask first, ask through your guide, ask twice if you're not sure. Pay when asked. Send the photo back when you can.\n\n## What to shoot less of\n\nAnimals at their kills. People with their children. Anything inside a homestead unless explicitly invited in. The thing the workshop influencers shoot — closeups of \"tribal\" hands, faces, jewellery — without consent.\n\n## What to shoot more of\n\nThe road. The vehicles. The other guests. Your own boots after a wet trek. The lodges at 4am. The things you'll forget if you don't.",
  },
  {
    title: "Coffee, briefly: the Bagisu story",
    date: "2026-02-18",
    category: "Culture",
    excerpt: "Six generations of Arabica on the western slopes of Mount Elgon — and why the coffee day is the surprise highlight of every Sipi trip.",
    image: "/photos/dest-elgon-sipi-falls.jpg",
    cloudinaryId: "mock/blog-bagisu",
    readTime: "4 min read",
    content: "# Coffee, briefly: the Bagisu story\n\nIf you've drunk speciality coffee in the last decade, you've probably had Bagisu beans without knowing it. They go by 'Mount Elgon Arabica' on the bag.\n\n## The geography\n\nThe western slopes of Elgon — between 1,600 and 1,900 metres — are nearly perfect for Arabica: volcanic soil, two rainy seasons, cool nights. The Bagisu people have farmed coffee here since the 1920s, though their occupation of these slopes goes back centuries.\n\n## The taste\n\nBright, floral, with a clean acidity. Cuppers describe Bagisu coffee as having \"blueberry top notes.\" We've seen people on our Sipi trip taste their morning cup and book a return visit before lunch.\n\n## The day\n\nOur coffee day is a half-day farm visit: picking with a Bagisu family, hand-pulping, washing, drying, roasting, brewing. The whole bean-to-cup process in five hours. It is the most surprising day on the Elgon trip — guests arrive expecting Sipi Falls to be the highlight, leave talking about the coffee.",
  },
  {
    title: "Reading the seasons: when to visit each park",
    date: "2026-01-30",
    category: "Planning",
    excerpt: "A short, opinionated guide to Uganda's two dry seasons, two wet seasons, and the question of when to book.",
    image: "/photos/why-vehicles-sunset.jpg",
    cloudinaryId: "mock/blog-seasons",
    readTime: "8 min read",
    content: "# Reading the seasons: when to visit each park\n\nUganda has two dry seasons (December—February, June—August) and two wet seasons. Each park has its own preferences within that pattern.\n\n## The standard answer\n\nFor most clients, we recommend December—February or June—August. Roads are firm, gorilla treks are shorter, and game-viewing in the open savanna parks (Murchison, Queen Elizabeth, Kidepo) is at its best because animals concentrate around water.\n\n## The contrarian answer\n\nThe shoulder seasons (March—May, September—November) are increasingly our quiet recommendation for return visitors. Fewer people, lush landscapes, dramatic light, lower lodge rates. The gorilla treks are longer and muddier, but you'll often have the family to yourself.\n\n## Park-by-park\n\n**Bwindi**: trek any time of year. June—August and December—February are easier walks. Off-season treks have charm and far fewer visitors.\n\n**Queen Elizabeth**: year-round. Ishasha is best in dry season because the lions sit more in fig trees when the grass is short.\n\n**Murchison**: December—February strongly preferred. Wet season makes the long drives miserable.\n\n**Kidepo**: December—April only. The roads in are impassable other months.\n\n**Mount Elgon**: June—August and December—March. Sipi is dramatic in any weather.\n\n**Lake Mburo**: year-round. It's a stopover, weather doesn't really matter.",
  },
  {
    title: "What goes in the vehicle",
    date: "2026-01-12",
    category: "Behind the Scenes",
    excerpt: "A full inventory of what our guides carry in the back of the Land Cruiser, and why each item is on the list.",
    image: "/photos/why-guides-vehicles.jpg",
    cloudinaryId: "mock/blog-vehicle",
    readTime: "5 min read",
    content: "# What goes in the vehicle\n\nA few clients have asked, so: here is the standard kit we carry in our safari vehicles. Not a sales pitch — a useful list if you're prepping your own gear.\n\n## Always in the back\n\n- Two full toolkits (heavy and light)\n- Spare tyre + a second spare on long northern trips\n- 80 litres of drinking water minimum\n- Cooler with chilled drinks and ice\n- Two first-aid kits (one ranger-grade)\n- Snake bite kit\n- Recovery straps and a hi-lift jack\n- Satellite phone (signal-free zones do exist here)\n- Charging hub with USB-C, Lightning, USB-A, 12V\n- Picnic kit for four (full plates, cutlery, glasses)\n\n## What we bring for clients on request\n\n- Birding telescope and tripod\n- Spare binoculars\n- Long lens loaner (Sony 200—600mm)\n- Power banks\n- Lightweight rain ponchos\n- Insect repellent and sunscreen\n\n## What we won't be carrying\n\nAnything single-use plastic that we can avoid. Bottled water in disposable bottles. Disposable plates and cutlery. We've moved away from these over the last few years — partly the cost, mostly the principle.",
  },
];

const team = [
  { fullName: "Joseph Mukasa", position: "Founder & Lead Guide", bio: "Founded Ubuntu Footprints in 2014 after a decade guiding for the larger operators. Holds the senior UWA guide certification and has led over 200 gorilla trekking parties. Based in Kampala, often on the road.", linkedIn: "https://linkedin.com/in/joseph-mukasa-ubuntu", category: "Leadership", image: "/photos/why-guides-vehicles.jpg", cloudinaryId: "mock/team-joseph" },
  { fullName: "Annet Nakato", position: "Operations Director", bio: "Runs the back office — permits, lodges, logistics, the parts that keep trips on the road. Joined the team in 2017 from Volcanoes Safaris.", linkedIn: "https://linkedin.com/in/annet-nakato", category: "Operations", image: "/photos/why-baby-gorilla.jpg", cloudinaryId: "mock/team-annet" },
  { fullName: "Patrick Kintu", position: "Head of Guiding", bio: "Twelve years guiding across all of Uganda's parks, specialty in the northern circuit (Murchison, Kidepo). Patrick leads our most senior trips and trains incoming guides.", linkedIn: "https://linkedin.com/in/patrick-kintu", category: "Leadership", image: "/photos/exp-safari-lions.jpg", cloudinaryId: "mock/team-patrick" },
  { fullName: "Sarah Birungi", position: "Senior Guide · Western Circuit", bio: "Sarah grew up in Kabale, on the edge of Bwindi. She has been guiding gorilla treks for nine years and speaks Rufumbira, Kiga, and English fluently. Her family was among the first park-edge co-op members.", linkedIn: "https://linkedin.com/in/sarah-birungi", category: "Operations", image: "/photos/exp-bwindi-silverback.jpg", cloudinaryId: "mock/team-sarah" },
  { fullName: "David Okot", position: "Senior Guide · Northern Circuit", bio: "From Gulu. Specialist in Kidepo and Murchison and the long road between them. David is the guide most clients request for their second visit.", linkedIn: "https://linkedin.com/in/david-okot", category: "Operations", image: "/photos/dest-kidepo-zebras.jpg", cloudinaryId: "mock/team-david" },
  { fullName: "Grace Akello", position: "Community Liaison", bio: "Grace coordinates our community programmes across Kanungu, Karamoja, and Bugisu. Her work makes sure community visits run on community terms — not ours.", linkedIn: "https://linkedin.com/in/grace-akello", category: "Community", image: "/photos/dest-mburo-kob.jpg", cloudinaryId: "mock/team-grace" },
  { fullName: "Brice Niyonkuru", position: "Digital & Booking Systems", bio: "Builds and maintains the booking platform, the website, and the internal tools that keep the operations team out of spreadsheets. Based between Kampala and Kigali.", linkedIn: "https://linkedin.com/in/brice-niyonkuru", category: "Engineering", image: "/photos/why-vehicles-sunset.jpg", cloudinaryId: "mock/team-brice" },
  { fullName: "Dr. Helen Nansubuga", position: "Advisor · Conservation", bio: "Wildlife veterinarian with the Uganda Wildlife Authority. Advises us on gorilla habituation, anti-poaching, and the responsible-tourism guidelines we follow.", linkedIn: "https://linkedin.com/in/helen-nansubuga", category: "Advisory Board", image: "/photos/dest-elgon-sipi-falls.jpg", cloudinaryId: "mock/team-helen" },
];

const testimonials = [
  { name: "Eleanor Whitfield", location: "London, UK", trip: "Twelve Days, Five Parks", headline: "The country, not a slice of it.", quote: "Joseph and his team built us the trip we'd been describing badly to other operators for years. Twelve days, five parks, and somehow it never felt rushed. The gorilla morning in Bwindi was the most quietly extraordinary thing I've done.", rating: 5, featured: true },
  { name: "Marcus Tanaka", location: "Toronto, Canada", trip: "Gorillas & the Western Arc", headline: "Quietly extraordinary.", quote: "I've done safaris in Kenya, Tanzania, Botswana. Uganda is different — denser, greener, more human. The Ubuntu Footprints team understood I wasn't here for a checklist. They gave us space to be still, especially at Ishasha.", rating: 5, featured: true },
  { name: "Sofia Hernández", location: "Madrid, Spain", trip: "Bwindi in Three Days", headline: "Permits, flights, every detail.", quote: "We had three days. They made it possible — permits, the bush flight, two perfect nights at the lodge. The trek itself took five hours. The hour with the gorillas felt like five minutes.", rating: 5, featured: true },
  { name: "James Okello", location: "Nairobi, Kenya", trip: "Karamoja Cultural Loop", headline: "Travel that respects the place.", quote: "I'm from this region and I was nervous about how the Karamoja visit would be framed. It was handled with real care — by local guides, on terms set by the communities. That matters. It's why I'd send my own family with them.", rating: 5, featured: false },
  { name: "Priya Nair", location: "Mumbai, India", trip: "Murchison & the North", headline: "The Nile, up close.", quote: "Five nights up north — Murchison and Kidepo. The walk to the top of the falls is something I'll think about for years. The Kidepo light at sundown is something else entirely. Worth the long drive.", rating: 5, featured: true },
  { name: "Henrik Larsen", location: "Copenhagen, Denmark", trip: "The Sipi & Elgon Coffee Days", headline: "A slower, eastern trip.", quote: "We didn't want the big safari arc. They built us a four-night coffee-and-hike trip on Mount Elgon that we still talk about. The Bagisu farm day was the highlight — beans we picked, roasted, and drank that evening.", rating: 5, featured: false },
];

const companyDoc = {
  name: "Ubuntu Footprints",
  description: "A cultural brand from Kampala — curated travel, original African art, and creative storytelling. Walk together, lift together, grow together.",
  isActive: true,
  contact: {
    primaryPhone: "+256 414 000 000",
    whatsappNumber: "+256 700 000 000",
    primaryEmail: "hello@ubuntufootprints.com",
    planEmail: "plan@ubuntufootprints.com",
    legalEmail: "legal@ubuntufootprints.com",
    privacyEmail: "privacy@ubuntufootprints.com",
    officeAddress: "Kololo Hill, Kampala",
    officeHours: "Mon — Sat · 8 am — 6 pm EAT",
    responseTime: "Within 24 hours",
  },
  social: {
    instagram: "https://instagram.com/ubuntufootprints",
    x: "https://x.com/ubuntufootprints",
    facebook: "https://facebook.com/ubuntufootprints",
    linkedin: "https://linkedin.com/company/ubuntufootprints",
    tripadvisor: "https://tripadvisor.com/ubuntufootprints",
    tiktok: "https://tiktok.com/@ubuntufootprints",
  },
  meta: {
    legalName: "Ubuntu Footprints Ltd.",
    foundedYear: "2014",
    tagline: "Walk together. Lift together. Grow together.",
  },
  almanac: {
    permitAvailability: "4 remaining · Q2",
    permitStatus: "8 booked",
    nextDeparture: "24 MAY",
    nextDepartureStatus: "2 seats left",
    guideOnCall: "Joseph Mukasa",
    seasonStatus: "Long dry · ends 30 Jun",
    roadsStatus: "Roads firm",
    waitingListStatus: "Q3 closed · Q4 open",
  },
};

/* ── Runner ───────────────────────────────────────────────────────── */

async function run() {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI not set in .env");
    process.exit(1);
  }

  console.log("Connecting to MongoDB…");
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected.");

  console.log("\nClearing public collections…");
  await Promise.all([
    Destination.deleteMany({}),
    Itinerary.deleteMany({}),
    Experience.deleteMany({}),
    Blog.deleteMany({}),
    TeamMember.deleteMany({}),
    Testimonial.deleteMany({}),
    Company.deleteMany({}),
  ]);

  console.log("Inserting destinations…");
  await Destination.insertMany(destinations);

  console.log("Inserting itineraries…");
  await Itinerary.insertMany(itineraries);

  console.log("Inserting experiences…");
  await Experience.insertMany(experiences);

  console.log("Inserting blogs…");
  await Blog.insertMany(blogs);

  console.log("Inserting team…");
  await TeamMember.insertMany(team);

  console.log("Inserting testimonials…");
  await Testimonial.insertMany(testimonials);

  console.log("Inserting company singleton…");
  await Company.create(companyDoc);

  const counts = {
    destinations: await Destination.countDocuments(),
    itineraries: await Itinerary.countDocuments(),
    experiences: await Experience.countDocuments(),
    blogs: await Blog.countDocuments(),
    team: await TeamMember.countDocuments(),
    testimonials: await Testimonial.countDocuments(),
    company: await Company.countDocuments(),
  };

  console.log("\nSeed complete:");
  console.table(counts);

  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error("\nSeed failed:", err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
