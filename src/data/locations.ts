/**
 * Locations Database
 *
 * Predefined list of major cities for zmanim (sunrise/sunset) calculations.
 * Each location has lat/lng/timezone for accurate astronomical computation.
 *
 * Users can also define a custom location.
 */

export interface Location {
  id: string;          // 'jerusalem' | 'custom' | etc.
  name_he: string;
  name_en: string;
  lat: number;         // Decimal degrees (positive = North)
  lng: number;         // Decimal degrees (positive = East)
  timezone: string;    // IANA timezone, e.g. 'Asia/Jerusalem'
  country: 'IL' | 'US' | 'UK' | 'EU' | 'OTHER' | 'CUSTOM';
}

export const LOCATIONS: Location[] = [
  // ===== Israel =====
  { id: 'jerusalem',   name_he: 'ירושלים',      name_en: 'Jerusalem',    lat: 31.7683, lng: 35.2137, timezone: 'Asia/Jerusalem', country: 'IL' },
  { id: 'tel_aviv',    name_he: 'תל אביב',       name_en: 'Tel Aviv',     lat: 32.0853, lng: 34.7818, timezone: 'Asia/Jerusalem', country: 'IL' },
  { id: 'bnei_brak',   name_he: 'בני ברק',       name_en: 'Bnei Brak',    lat: 32.0809, lng: 34.8338, timezone: 'Asia/Jerusalem', country: 'IL' },
  { id: 'haifa',       name_he: 'חיפה',          name_en: 'Haifa',        lat: 32.7940, lng: 34.9896, timezone: 'Asia/Jerusalem', country: 'IL' },
  { id: 'tzfat',       name_he: 'צפת',           name_en: 'Tzfat',        lat: 32.9646, lng: 35.4960, timezone: 'Asia/Jerusalem', country: 'IL' },
  { id: 'tveria',      name_he: 'טבריה',         name_en: 'Tiberias',     lat: 32.7922, lng: 35.5312, timezone: 'Asia/Jerusalem', country: 'IL' },
  { id: 'beer_sheva',  name_he: 'באר שבע',       name_en: 'Beer Sheva',   lat: 31.2518, lng: 34.7913, timezone: 'Asia/Jerusalem', country: 'IL' },
  { id: 'ashdod',      name_he: 'אשדוד',         name_en: 'Ashdod',       lat: 31.8040, lng: 34.6500, timezone: 'Asia/Jerusalem', country: 'IL' },
  { id: 'netanya',     name_he: 'נתניה',         name_en: 'Netanya',      lat: 32.3215, lng: 34.8532, timezone: 'Asia/Jerusalem', country: 'IL' },
  { id: 'rehovot',     name_he: 'רחובות',        name_en: 'Rehovot',      lat: 31.8969, lng: 34.8086, timezone: 'Asia/Jerusalem', country: 'IL' },
  { id: 'petach_tikva',name_he: 'פתח תקווה',     name_en: 'Petach Tikva', lat: 32.0878, lng: 34.8878, timezone: 'Asia/Jerusalem', country: 'IL' },
  { id: 'elad',        name_he: 'אלעד',          name_en: 'Elad',         lat: 32.0522, lng: 34.9528, timezone: 'Asia/Jerusalem', country: 'IL' },
  { id: 'modiin_ilit', name_he: 'מודיעין עילית', name_en: 'Modiin Illit', lat: 31.9347, lng: 35.0403, timezone: 'Asia/Jerusalem', country: 'IL' },
  { id: 'beitar',      name_he: 'ביתר עילית',    name_en: 'Beitar Illit', lat: 31.6965, lng: 35.1175, timezone: 'Asia/Jerusalem', country: 'IL' },
  { id: 'eilat',       name_he: 'אילת',          name_en: 'Eilat',        lat: 29.5577, lng: 34.9519, timezone: 'Asia/Jerusalem', country: 'IL' },
  { id: 'ashkelon',    name_he: 'אשקלון',        name_en: 'Ashkelon',     lat: 31.6688, lng: 34.5715, timezone: 'Asia/Jerusalem', country: 'IL' },

  // ===== USA =====
  { id: 'new_york',    name_he: 'ניו יורק',      name_en: 'New York',     lat: 40.7128, lng: -74.0060, timezone: 'America/New_York',    country: 'US' },
  { id: 'brooklyn',    name_he: 'ברוקלין',       name_en: 'Brooklyn',     lat: 40.6782, lng: -73.9442, timezone: 'America/New_York',    country: 'US' },
  { id: 'lakewood',    name_he: 'לייקווד',       name_en: 'Lakewood NJ',  lat: 40.0979, lng: -74.2176, timezone: 'America/New_York',    country: 'US' },
  { id: 'monsey',      name_he: 'מאנסי',         name_en: 'Monsey',       lat: 41.1115, lng: -74.0684, timezone: 'America/New_York',    country: 'US' },
  { id: 'miami',       name_he: 'מיאמי',         name_en: 'Miami',        lat: 25.7617, lng: -80.1918, timezone: 'America/New_York',    country: 'US' },
  { id: 'los_angeles', name_he: 'לוס אנג׳לס',    name_en: 'Los Angeles',  lat: 34.0522, lng: -118.2437, timezone: 'America/Los_Angeles', country: 'US' },
  { id: 'chicago',     name_he: 'שיקגו',         name_en: 'Chicago',      lat: 41.8781, lng: -87.6298, timezone: 'America/Chicago',     country: 'US' },
  { id: 'baltimore',   name_he: 'בולטימור',      name_en: 'Baltimore',    lat: 39.2904, lng: -76.6122, timezone: 'America/New_York',    country: 'US' },
  { id: 'toronto',     name_he: 'טורונטו',       name_en: 'Toronto',      lat: 43.6532, lng: -79.3832, timezone: 'America/Toronto',     country: 'US' },

  // ===== UK =====
  { id: 'london',      name_he: 'לונדון',        name_en: 'London',       lat: 51.5074, lng: -0.1278, timezone: 'Europe/London',    country: 'UK' },
  { id: 'manchester',  name_he: 'מנצ׳סטר',       name_en: 'Manchester',   lat: 53.4808, lng: -2.2426, timezone: 'Europe/London',    country: 'UK' },
  { id: 'gateshead',   name_he: 'גייטסהד',       name_en: 'Gateshead',    lat: 54.9526, lng: -1.6014, timezone: 'Europe/London',    country: 'UK' },

  // ===== Europe =====
  { id: 'paris',       name_he: 'פריז',          name_en: 'Paris',        lat: 48.8566, lng: 2.3522,  timezone: 'Europe/Paris',     country: 'EU' },
  { id: 'antwerp',     name_he: 'אנטוורפן',      name_en: 'Antwerp',      lat: 51.2194, lng: 4.4025,  timezone: 'Europe/Brussels',  country: 'EU' },
  { id: 'amsterdam',   name_he: 'אמסטרדם',       name_en: 'Amsterdam',    lat: 52.3676, lng: 4.9041,  timezone: 'Europe/Amsterdam', country: 'EU' },
  { id: 'zurich',      name_he: 'ציריך',         name_en: 'Zurich',       lat: 47.3769, lng: 8.5417,  timezone: 'Europe/Zurich',    country: 'EU' },
  { id: 'vienna',      name_he: 'וינה',          name_en: 'Vienna',       lat: 48.2082, lng: 16.3738, timezone: 'Europe/Vienna',    country: 'EU' },
  { id: 'moscow',      name_he: 'מוסקבה',        name_en: 'Moscow',       lat: 55.7558, lng: 37.6173, timezone: 'Europe/Moscow',    country: 'EU' },

  // ===== Other =====
  { id: 'melbourne',   name_he: 'מלבורן',        name_en: 'Melbourne',    lat: -37.8136, lng: 144.9631, timezone: 'Australia/Melbourne', country: 'OTHER' },
  { id: 'sydney',      name_he: 'סידני',         name_en: 'Sydney',       lat: -33.8688, lng: 151.2093, timezone: 'Australia/Sydney',    country: 'OTHER' },
  { id: 'johannesburg',name_he: 'יוהנסבורג',     name_en: 'Johannesburg', lat: -26.2041, lng: 28.0473,  timezone: 'Africa/Johannesburg', country: 'OTHER' },
  { id: 'buenos_aires',name_he: 'בואנוס איירס',  name_en: 'Buenos Aires', lat: -34.6037, lng: -58.3816, timezone: 'America/Argentina/Buenos_Aires', country: 'OTHER' },
  { id: 'mexico_city', name_he: 'מקסיקו סיטי',   name_en: 'Mexico City',  lat: 19.4326, lng: -99.1332, timezone: 'America/Mexico_City', country: 'OTHER' },
];

/** Default location = Jerusalem */
export const DEFAULT_LOCATION: Location = LOCATIONS[0]!;

/** Find a location by ID */
export function findLocation(id: string): Location | undefined {
  return LOCATIONS.find(l => l.id === id);
}

/** Group locations by country for UI display */
export function groupedLocations(): Record<string, Location[]> {
  const groups: Record<string, Location[]> = {};
  for (const loc of LOCATIONS) {
    if (!groups[loc.country]) groups[loc.country] = [];
    groups[loc.country]!.push(loc);
  }
  return groups;
}
