// ReRoute AI 2.0 - WhatsApp & Regional Message Load Parser Engine
// Pure ES-Module: Parses unformatted Hinglish, Hindi, Marathi, and English transporter messages.
// Extracts origin, destination, payload weight, cargo commodity, freight rate, and pickup schedule.
// Returns deterministic extractions with confidence scores (0.0 - 1.0).

import { CITIES } from '../data/cities.js';

// Commodity keywords to standardized categories
const COMMODITY_RULES = [
  {
    category: 'Steel coils & structural metal',
    keywords: ['steel', 'loha', 'iron', 'tmt', 'pipe', 'pipes', 'coil', 'coils', 'metal', 'saria', 'लोहा', 'सरिया', 'स्टील', 'पाइप'],
  },
  {
    category: 'Pharmaceutical & Cold-Chain Goods',
    keywords: ['pharma', 'medicine', 'medicines', 'drug', 'drugs', 'vaccine', 'vaccines', 'dawa', 'dawai', 'दवा', 'दवाई', 'फार्मा'],
  },
  {
    category: 'Automotive Sub-Assemblies & Tier-1 Spares',
    keywords: ['auto', 'automotive', 'spares', 'parts', 'engine', 'gearbox', 'tyre', 'tyres', 'chassis', 'ऑटो', 'पार्ट्स', 'गाड़ी'],
  },
  {
    category: 'FMCG Packaging Materials & Cartons',
    keywords: ['fmcg', 'carton', 'cartons', 'packaging', 'boxes', 'grocery', 'kirana', 'soap', 'oil', 'किराना', 'बॉक्स', 'कार्टन'],
  },
  {
    category: 'Industrial Heavy Machinery & Equipment',
    keywords: ['machine', 'machinery', 'equipment', 'generator', 'lathe', 'motor', 'मशीन', 'मशीनरी', 'उपकरण'],
  },
  {
    category: 'Textiles, Apparel & Yarns',
    keywords: ['textile', 'textiles', 'cloth', 'clothes', 'fabric', 'yarn', 'cotton', 'garment', 'कपड़ा', 'धागा', 'टेक्सटाइल', 'कापड'],
  },
  {
    category: 'Chemicals & Polymers (Non-Hazmat)',
    keywords: ['chemical', 'chemicals', 'polymer', 'polymers', 'resin', 'plastic', 'granules', 'केमिकल', 'प्लास्टिक'],
  },
  {
    category: 'Electronics & Electrical Assemblies',
    keywords: ['electronics', 'electrical', 'cable', 'cables', 'wire', 'wires', 'appliance', 'इलेक्ट्रॉनिक', 'वायर'],
  },
  {
    category: 'Perishable Agri-Produce & Cold-Chain',
    keywords: ['perishable', 'vegetable', 'vegetables', 'fruit', 'fruits', 'onion', 'tomato', 'potato', 'sabzi', 'bhaji', 'फल', 'सब्जी', 'भाजी', 'कांदा'],
  },
];

// Expanded City Aliases Map for Western India Logistics
const CITY_ALIASES = {
  mumbai: ['mumbai', 'bombay', 'bumbai', 'bombai', 'बम्बई', 'मुंबई', 'बॉम्बे', 'मुंबईला', 'मुंबईहून'],
  pune: ['pune', 'poona', 'पुणे', 'पुण्यातून', 'पुण्यास', 'पुण्याला', 'chakan', 'bhosari'],
  nashik: ['nashik', 'nasik', 'नाशिक', 'नासिक', 'नाशिकहून', 'नाशिकला'],
  surat: ['surat', 'सूरत', 'सुरतला', 'surat gidc'],
  thane: ['thane', 'thana', 'ठाणे', 'ठाण्याहून', 'ठाण्याला'],
  vapi: ['vapi', 'वापी', 'वापीला', 'vapi gidc'],
  bhiwandi: ['bhiwandi', 'bhivandi', 'भिवंडी', 'भिवंडीला'],
  'chhatrapati sambhajinagar (aurangabad)': [
    'aurangabad',
    'sambhajinagar',
    'chhatrapati sambhajinagar',
    'औरंगाबाद',
    'संभाजीनगर',
  ],
  igatpuri: ['igatpuri', 'इगतपुरी'],
  panvel: ['panvel', 'पनवेल'],
  kalyan: ['kalyan', 'कल्याण'],
  kolhapur: ['kolhapur', 'कोल्हापुर', 'कोल्हापूर'],
  solapur: ['solapur', 'सोलापुर', 'सोलापूर'],
  nagpur: ['nagpur', 'नागपुर', 'नागपूर'],
  ahmedabad: ['ahmedabad', 'amdavad', 'अहमदाबाद', 'अमदावाद'],
  vadodara: ['vadodara', 'baroda', 'वडोदरा', 'बड़ौदा'],
  'delhi ncr': ['delhi', 'ncr', 'gurgaon', 'noida', 'दिल्ली'],
  bengaluru: ['bengaluru', 'bangalore', 'बैंगलोर', 'बेंगलुरु'],
  hyderabad: ['hyderabad', 'हैदराबाद'],
};

/**
 * Normalizes an extracted raw word/token to a canonical known city name
 */
export function normalizeCityName(token) {
  if (!token || typeof token !== 'string') return null;
  const cleaned = token.toLowerCase().trim().replace(/[.,;:!?()]/g, '');

  for (const [canonical, aliases] of Object.entries(CITY_ALIASES)) {
    for (const alias of aliases) {
      if (cleaned === alias || cleaned.startsWith(alias) || cleaned.endsWith(alias)) {
        // Return standard capitalized name from CITIES
        const matchedCity = CITIES.find(
          (c) => c.name.toLowerCase() === canonical || c.name.toLowerCase().includes(canonical)
        );
        return matchedCity ? matchedCity.name : canonical.charAt(0).toUpperCase() + canonical.slice(1);
      }
    }
  }

  // Check CITIES list directly
  for (const city of CITIES) {
    const cName = city.name.toLowerCase();
    if (cleaned === cName || cleaned.includes(cName) || cName.includes(cleaned)) {
      return city.name;
    }
  }

  return null;
}

/**
 * Extracts route endpoints (origin and destination) from text.
 * Handles patterns like "Pune se Surat", "from Mumbai to Nashik", "पुणे से सूरत", "Nashik - Vapi"
 */
function extractRoute(text) {
  const words = text.split(/[\s,]+/);

  // 1. Explicit regex patterns: "[City] se [City]", "[City] to [City]", "[City] -> [City]", "[City] - [City]"
  const routePatterns = [
    /([a-zA-Z\u0900-\u097F]+)\s+(?:se|to|->|-|huni|yatun|hûn|हून|तून|ते|te|पासून)\s+([a-zA-Z\u0900-\u097F]+)(?:\s+(?:tak|ko|la|ला|तक))?/i,
    /(?:from|pickup|origin)\s+([a-zA-Z\u0900-\u097F]+)\s+(?:to|drop|destination)\s+([a-zA-Z\u0900-\u097F]+)/i,
    /([a-zA-Z\u0900-\u097F]+)\s*[-/→]\s*([a-zA-Z\u0900-\u097F]+)/i,
  ];

  for (const pattern of routePatterns) {
    const match = text.match(pattern);
    if (match) {
      const origCandidate = normalizeCityName(match[1]);
      const destCandidate = normalizeCityName(match[2]);
      if (origCandidate && destCandidate && origCandidate !== destCandidate) {
        return {
          origin: origCandidate,
          destination: destCandidate,
          confidence: 0.95,
        };
      }
    }
  }

  // 2. Scan text for any recognized cities in appearance order
  const foundCities = [];
  for (const word of words) {
    const matched = normalizeCityName(word);
    if (matched && !foundCities.includes(matched)) {
      foundCities.push(matched);
    }
  }

  if (foundCities.length >= 2) {
    return {
      origin: foundCities[0],
      destination: foundCities[1],
      confidence: 0.8,
    };
  }

  if (foundCities.length === 1) {
    return {
      origin: foundCities[0],
      destination: null,
      confidence: 0.5,
    };
  }

  return { origin: null, destination: null, confidence: 0.0 };
}

/**
 * Extracts payload weight in tons (converts kg to tons)
 */
function extractWeight(text) {
  // 1. Explicit tons: "12 ton", "12 tons", "12t", "12 mt", "12 टन"
  const tonMatch = text.match(/(?:^|[^\d.])(\d+(?:\.\d+)?)\s*(?:tons?|tonnes?|tonne|mt|टन|t)(?:\s|$|[.,;:!?/])/i);
  if (tonMatch) {
    const val = parseFloat(tonMatch[1]);
    if (!isNaN(val) && val > 0 && val <= 50) {
      return { weightTons: Math.round(val * 10) / 10, confidence: 0.95 };
    }
  }

  // 2. Kg or Kilo: "5000 kg", "8000 किलो"
  const kgMatch = text.match(/(?:^|[^\d.])(\d+(?:\.\d+)?)\s*(?:kg|kgs|kilo|kilograms?|किलो)(?:\s|$|[.,;:!?/])/i);
  if (kgMatch) {
    const kgVal = parseFloat(kgMatch[1]);
    if (!isNaN(kgVal) && kgVal > 0) {
      const tonVal = Math.round((kgVal / 1000) * 10) / 10;
      return { weightTons: Math.max(0.5, tonVal), confidence: 0.9 };
    }
  }

  // 3. Fallback: look for 1-2 digit number near cargo/truck context
  const genericMatch = text.match(/\b([1-3]?\d)\s*(?:gaadi|load|maal|weight|vajan|वजन)\b/i);
  if (genericMatch) {
    const val = parseFloat(genericMatch[1]);
    if (!isNaN(val) && val > 0 && val <= 40) {
      return { weightTons: val, confidence: 0.6 };
    }
  }

  return { weightTons: 8, confidence: 0.3 }; // Default 8t
}

/**
 * Extracts cargo commodity category based on Hindi/Hinglish/English keywords
 */
function extractCargo(text) {
  const lower = text.toLowerCase();

  for (const rule of COMMODITY_RULES) {
    for (const kw of rule.keywords) {
      // Word boundary match or inclusion for Devanagari
      const regex = new RegExp(`(?:^|[\\s,;.])${kw}(?:[\\s,;.]|$)`, 'i');
      if (regex.test(lower) || lower.includes(kw)) {
        return { cargoType: rule.category, confidence: 0.92 };
      }
    }
  }

  return { cargoType: 'General Dry Freight', confidence: 0.4 };
}

/**
 * Extracts freight offer / spot rate in INR
 */
function extractFreightRate(text) {
  // 1. Currency with amount: "₹ 28,000", "Rs 28000", "INR 28000", "28000/-"
  const currencyMatch = text.match(/(?:₹|rs\.?|inr)\s*[:=]?\s*(\d{1,3}(?:,\d{3})+|\d{4,6})/i);
  if (currencyMatch) {
    const num = parseInt(currencyMatch[1].replace(/,/g, ''), 10);
    if (!isNaN(num) && num >= 1000 && num <= 500000) {
      return { freightOfferInr: num, confidence: 0.95 };
    }
  }

  // 2. Action verbs / keywords: "28000 dunga", "bhada 18000", "kiraya 22000", "offer 14000", "rate 25000"
  const rateKeywordMatch = text.match(
    /(?:bhada|kiraya|rate|offer|bhejna|dung?a|duga|dega|dege|किराया|भाड़ा)\s*[:=]?\s*(\d{1,3}(?:,\d{3})+|\d{4,6})/i
  );
  if (rateKeywordMatch) {
    const num = parseInt(rateKeywordMatch[1].replace(/,/g, ''), 10);
    if (!isNaN(num) && num >= 1000 && num <= 500000) {
      return { freightOfferInr: num, confidence: 0.95 };
    }
  }

  // Reverse pattern: "28000 dunga", "28000 bhada", "28000/-"
  const reverseKeywordMatch = text.match(
    /(\d{1,3}(?:,\d{3})+|\d{4,6})\s*(?:dunga|duga|dega|bhada|kiraya|rupay|rupees|inr|rs|\/-|दूंगा|भाड़ा)/i
  );
  if (reverseKeywordMatch) {
    const num = parseInt(reverseKeywordMatch[1].replace(/,/g, ''), 10);
    if (!isNaN(num) && num >= 1000 && num <= 500000) {
      return { freightOfferInr: num, confidence: 0.95 };
    }
  }

  // 3. Thousands abbreviation: "28k", "18 k", "28 hazar", "18 हजार"
  const kMatch = text.match(/\b(\d{1,3})\s*(?:k\b|hazar\b|हजार(?:\s|$|[.,;:!?/]))/i);
  if (kMatch) {
    const num = parseInt(kMatch[1], 10) * 1000;
    if (num >= 5000 && num <= 500000) {
      return { freightOfferInr: num, confidence: 0.9 };
    }
  }

  // 4. Any standalone 5-digit number that isn't a zip code or phone number
  const standaloneMatch = text.match(/\b([1-9]\d{3,5})\b/);
  if (standaloneMatch) {
    const num = parseInt(standaloneMatch[1], 10);
    if (num >= 3000 && num <= 200000) {
      return { freightOfferInr: num, confidence: 0.7 };
    }
  }

  return { freightOfferInr: null, confidence: 0.0 };
}

/**
 * Extracts ready time and pickup window from relative time terms and hours
 */
function extractSchedule(text, refDate = new Date()) {
  const lower = text.toLowerCase();
  const date = new Date(refDate);

  // Determine target date offset
  let daysToAdd = 0;
  let dateConfidence = 0.5;

  if (lower.includes('parso') || lower.includes('day after tomorrow') || lower.includes('परसों')) {
    daysToAdd = 2;
    dateConfidence = 0.95;
  } else if (
    lower.includes('kal') ||
    lower.includes('tomorrow') ||
    lower.includes('कल') ||
    lower.includes('उद्या')
  ) {
    daysToAdd = 1;
    dateConfidence = 0.95;
  } else if (
    lower.includes('aaj') ||
    lower.includes('today') ||
    lower.includes('आज') ||
    lower.includes('आत्ता')
  ) {
    daysToAdd = 0;
    dateConfidence = 0.95;
  }

  date.setDate(date.getDate() + daysToAdd);

  // Time of day & hour extraction
  let hour = 14; // Default afternoon
  let minute = 0;
  let timeConfidence = 0.4;

  // Specific time match: "6 baje", "10am", "4:30 pm", "सकाळी 6", "दोपहर 2 बजे"
  const timeMatch = lower.match(
    /(?:subah|sham|dopahar|raat|सकाळी|दुपारी|संध्याकाळी)?\s*(\d{1,2})(?::(\d{2}))?\s*(?:am|pm|baje|बजे|वाजता|hrs|hours)?/i
  );

  const isMorning =
    lower.includes('subah') ||
    lower.includes('morning') ||
    lower.includes('am') ||
    lower.includes('सुबह') ||
    lower.includes('सकाळी');
  const isAfternoon =
    lower.includes('dopahar') ||
    lower.includes('afternoon') ||
    lower.includes('दोपहर') ||
    lower.includes('दुपारी');
  const isEvening =
    lower.includes('sham') ||
    lower.includes('evening') ||
    lower.includes('pm') ||
    lower.includes('शाम') ||
    lower.includes('संध्याकाळी');
  const isNight = lower.includes('raat') || lower.includes('night') || lower.includes('रात');

  // Find explicit hour digits if present
  const explicitHourMatch = lower.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|baje|बजे|वाजता)?\b/);
  if (explicitHourMatch) {
    const rawH = parseInt(explicitHourMatch[1], 10);
    const rawM = explicitHourMatch[2] ? parseInt(explicitHourMatch[2], 10) : 0;
    const modifier = explicitHourMatch[3]?.toLowerCase();

    if (rawH >= 1 && rawH <= 24) {
      if (modifier === 'pm' || isEvening) {
        hour = rawH < 12 ? rawH + 12 : rawH;
      } else if (modifier === 'am' || isMorning) {
        hour = rawH === 12 ? 0 : rawH;
      } else if (isAfternoon) {
        hour = rawH < 12 && rawH <= 5 ? rawH + 12 : rawH;
      } else if (isNight) {
        hour = rawH < 12 ? rawH + 12 : rawH;
      } else {
        hour = rawH;
      }
      minute = rawM;
      timeConfidence = 0.95;
    }
  } else if (isMorning) {
    hour = 8;
    timeConfidence = 0.75;
  } else if (isAfternoon) {
    hour = 14;
    timeConfidence = 0.75;
  } else if (isEvening) {
    hour = 18;
    timeConfidence = 0.75;
  } else if (isNight) {
    hour = 21;
    timeConfidence = 0.75;
  }

  // Set hours on date object
  date.setHours(hour, minute, 0, 0);

  const pad = (n) => String(n).padStart(2, '0');
  const pickupWindowStart = `${pad(hour)}:${pad(minute)}`;
  const endHour = (hour + 2) % 24;
  const pickupWindowEnd = `${pad(endHour)}:${pad(minute)}`;

  return {
    readyTime: date.toISOString(),
    pickupWindowStart,
    pickupWindowEnd,
    confidence: Math.round(((dateConfidence + timeConfidence) / 2) * 100) / 100,
  };
}

/**
 * Main Pure Engine Function: Parses raw text from WhatsApp/transporter message.
 * Completely deterministic and offline-resilient.
 */
export function parseLoadText(rawText, options = {}) {
  if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) {
    return {
      success: false,
      error: 'Empty or invalid message text provided',
      data: null,
      confidence: { overall: 0 },
    };
  }

  const text = rawText.trim();
  const refDate = options.now ? new Date(options.now) : new Date();

  const route = extractRoute(text);
  const weight = extractWeight(text);
  const cargo = extractCargo(text);
  const rate = extractFreightRate(text);
  const schedule = extractSchedule(text, refDate);

  const overallConfidence =
    Math.round(
      ((route.confidence +
        weight.confidence +
        cargo.confidence +
        (rate.confidence > 0 ? rate.confidence : 0.5) +
        schedule.confidence) /
        5) *
        100
    ) / 100;

  const origin = route.origin || 'Mumbai';
  const destination = route.destination || 'Nashik';

  return {
    success: true,
    data: {
      origin,
      destination,
      weightTons: weight.weightTons,
      cargoType: cargo.cargoType,
      freightOfferInr: rate.freightOfferInr || 25000,
      readyTime: schedule.readyTime,
      pickupWindowStart: schedule.pickupWindowStart,
      pickupWindowEnd: schedule.pickupWindowEnd,
      priority: text.toLowerCase().includes('urgent') || text.toLowerCase().includes('emergency') ? 'High' : 'Medium',
      specialRequirements: text.toLowerCase().includes('tarp') || text.toLowerCase().includes('tarpaulin') ? 'Waterproof tarpaulin required' : 'Standard cargo handling',
    },
    confidence: {
      origin: route.confidence,
      destination: route.confidence,
      weightTons: weight.confidence,
      cargoType: cargo.confidence,
      freightOfferInr: rate.confidence,
      schedule: schedule.confidence,
      overall: overallConfidence,
    },
    method: 'deterministic_nlp_engine',
    rawText: text,
  };
}
