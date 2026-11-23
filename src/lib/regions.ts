import type { CountryCode, FtcEvent } from "./events";

/** States / provinces / regions a user can pick as their home area, per country. Codes match the event `st` field. */
export const AREAS: Record<CountryCode, Record<string, string>> = {
  KZ: {
    ALA: "Almaty (city)", AST: "Astana", SHY: "Shymkent",
    ABA: "Abai Region (Semey)", AKM: "Akmola Region", AKT: "Aktobe Region", ALM: "Almaty Region",
    ATY: "Atyrau Region", VOS: "East Kazakhstan", ZHA: "Jambyl Region", ZHT: "Jetisu Region",
    KAR: "Karaganda Region", KUS: "Kostanay Region", KZY: "Kyzylorda Region", MAN: "Mangystau Region",
    SEV: "North Kazakhstan", PAV: "Pavlodar Region", YUZ: "Turkistan Region", ULT: "Ulytau Region",
    ZAP: "West Kazakhstan",
  },
  US: {
    AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado", CT: "Connecticut",
    DE: "Delaware", DC: "District of Columbia", FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois",
    IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
    MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana",
    NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York",
    NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania",
    PR: "Puerto Rico", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas",
    UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
  },
  CA: {
    AB: "Alberta", BC: "British Columbia", MB: "Manitoba", NB: "New Brunswick", NL: "Newfoundland and Labrador",
    NS: "Nova Scotia", NT: "Northwest Territories", NU: "Nunavut", ON: "Ontario", PE: "Prince Edward Island",
    QC: "Quebec", SK: "Saskatchewan", YT: "Yukon",
  },
  RO: {
    B: "București", AB: "Alba", AR: "Arad", AG: "Argeș", BC: "Bacău", BH: "Bihor", BN: "Bistrița-Năsăud",
    BT: "Botoșani", BV: "Brașov", BR: "Brăila", BZ: "Buzău", CS: "Caraș-Severin", CL: "Călărași", CJ: "Cluj",
    CT: "Constanța", CV: "Covasna", DB: "Dâmbovița", DJ: "Dolj", GL: "Galați", GR: "Giurgiu", GJ: "Gorj",
    HR: "Harghita", HD: "Hunedoara", IL: "Ialomița", IS: "Iași", IF: "Ilfov", MM: "Maramureș", MH: "Mehedinți",
    MS: "Mureș", NT: "Neamț", OT: "Olt", PH: "Prahova", SM: "Satu Mare", SJ: "Sălaj", SB: "Sibiu", SV: "Suceava",
    TR: "Teleorman", TM: "Timiș", TL: "Tulcea", VS: "Vaslui", VL: "Vâlcea", VN: "Vrancea",
  },
  TH: {},
  BR: {
    AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia", CE: "Ceará", DF: "Distrito Federal",
    ES: "Espírito Santo", GO: "Goiás", MA: "Maranhão", MT: "Mato Grosso", MS: "Mato Grosso do Sul",
    MG: "Minas Gerais", PA: "Pará", PB: "Paraíba", PR: "Paraná", PE: "Pernambuco", PI: "Piauí",
    RJ: "Rio de Janeiro", RN: "Rio Grande do Norte", RS: "Rio Grande do Sul", RO: "Rondônia", RR: "Roraima",
    SC: "Santa Catarina", SP: "São Paulo", SE: "Sergipe", TO: "Tocantins",
  },
  GR: {
    I: "Attica (Athens)", B: "Central Macedonia (Thessaloniki)", A: "East Macedonia and Thrace", C: "West Macedonia",
    D: "Epirus", E: "Thessaly", F: "Ionian Islands", G: "West Greece", H: "Central Greece", J: "Peloponnese",
    K: "North Aegean", L: "South Aegean", M: "Crete",
  },
  JM: {
    "01": "Kingston", "02": "St. Andrew", "03": "St. Thomas", "04": "Portland", "05": "St. Mary", "06": "St. Ann",
    "07": "Trelawny", "08": "St. James", "09": "Hanover", "10": "Westmoreland", "11": "St. Elizabeth",
    "12": "Manchester", "13": "Clarendon", "14": "St. Catherine",
  },
  GB: {
    "ENG": "England", "SCT": "Scotland", "WLS": "Wales", "NIR": "Northern Ireland",
  },
  IL: {
    "TA": "Tel Aviv", "M": "Central", "JM": "Jerusalem", "HA": "Haifa", "Z": "North", "D": "South",
  },
  MX: {
    "AGU": "Aguascalientes", "BCN": "Baja California", "BCS": "Baja California Sur", "CAM": "Campeche",
    "CHP": "Chiapas", "CHH": "Chihuahua", "CMX": "Ciudad de México", "COA": "Coahuila", "COL": "Colima",
    "DUR": "Durango", "GUA": "Guanajuato", "GRO": "Guerrero", "HID": "Hidalgo", "JAL": "Jalisco",
    "MEX": "Estado de México", "MIC": "Michoacán", "MOR": "Morelos", "NAY": "Nayarit", "NLE": "Nuevo León",
    "OAX": "Oaxaca", "PUE": "Puebla", "QUE": "Querétaro", "ROO": "Quintana Roo", "SLP": "San Luis Potosí",
    "SIN": "Sinaloa", "SON": "Sonora", "TAB": "Tabasco", "TAM": "Tamaulipas", "TLA": "Tlaxcala", "VER": "Veracruz",
    "YUC": "Yucatán", "ZAC": "Zacatecas",
  },
  AU: {
    "NSW": "New South Wales", "VIC": "Victoria", "QLD": "Queensland", "WA": "Western Australia",
    "SA": "South Australia", "TAS": "Tasmania", "ACT": "Australian Capital Territory", "NT": "Northern Territory",
  },
  CN: {
    "BJ": "Beijing", "SH": "Shanghai", "TJ": "Tianjin", "CQ": "Chongqing", "GD": "Guangdong", "ZJ": "Zhejiang",
    "JS": "Jiangsu", "SD": "Shandong", "HN": "Hunan", "HB": "Hubei", "HA": "Henan", "HE": "Hebei", "SC": "Sichuan",
    "FJ": "Fujian", "AH": "Anhui", "JX": "Jiangxi", "SN": "Shaanxi", "SX": "Shanxi", "LN": "Liaoning", "JL": "Jilin",
    "HL": "Heilongjiang", "GX": "Guangxi", "YN": "Yunnan", "GZ": "Guizhou", "HI": "Hainan", "GS": "Gansu",
    "NM": "Inner Mongolia", "XJ": "Xinjiang", "NX": "Ningxia", "QH": "Qinghai", "XZ": "Tibet",
  },
  IN: {
    "DL": "Delhi NCR", "MH": "Maharashtra", "KA": "Karnataka", "TG": "Telangana", "TN": "Tamil Nadu", "GJ": "Gujarat",
    "WB": "West Bengal", "UP": "Uttar Pradesh", "RJ": "Rajasthan", "KL": "Kerala", "AP": "Andhra Pradesh",
    "HR": "Haryana", "PB": "Punjab", "MP": "Madhya Pradesh", "OR": "Odisha", "BR": "Bihar", "AS": "Assam",
    "CT": "Chhattisgarh", "JH": "Jharkhand", "UT": "Uttarakhand", "HP": "Himachal Pradesh", "GA": "Goa",
    "CH": "Chandigarh", "JK": "Jammu and Kashmir", "PY": "Puducherry",
  },
  VN: {
    "HN": "Hà Nội", "SG": "Ho Chi Minh City", "DN": "Đà Nẵng", "HP": "Hải Phòng", "CT": "Cần Thơ",
  },
};

export const AREA_LABEL: Record<CountryCode, string> = {
  KZ: "City / region", US: "State", CA: "Province", RO: "County (județ)", TH: "Province", BR: "State", GR: "Region", JM: "Parish",
  GB: "Nation", IL: "District", MX: "State", AU: "State", CN: "Province", IN: "State", VN: "City / province",
};

/** Cities that belong to an area even when FIRST files them under another code (e.g. Semey is now in Abai Region). */
const AREA_CITIES: Partial<Record<string, string[]>> = {
  "KZ:ALA": ["Almaty"],
  "KZ:ABA": ["Semey"],
  "KZ:VOS": ["Oskemen", "Ust-Kamenogorsk"],
  "KZ:ZHT": ["Taldykorgan"],
  "JM:01": ["Kingston"],
};

export function areaName(co: CountryCode, code: string | null | undefined): string {
  if (!code) return "";
  return AREAS[co]?.[code] ?? code;
}

export function isArea(co: CountryCode, code: unknown): code is string {
  return typeof code === "string" && code in (AREAS[co] ?? {});
}

/** Whether an event is in the given area. */
export function inArea(ev: FtcEvent, area: string): boolean {
  if (ev.st === area) return true;
  return (AREA_CITIES[`${ev.co}:${area}`] ?? []).includes(ev.city);
}

/** Russian names for Kazakhstan areas (other countries keep their local names). */
export const AREAS_RU_KZ: Record<string, string> = {
  ALA: "Алматы (город)", AST: "Астана", SHY: "Шымкент",
  ABA: "Абайская область (Семей)", AKM: "Акмолинская область", AKT: "Актюбинская область", ALM: "Алматинская область",
  ATY: "Атырауская область", VOS: "Восточно-Казахстанская область", ZHA: "Жамбылская область", ZHT: "Жетысуская область",
  KAR: "Карагандинская область", KUS: "Костанайская область", KZY: "Кызылординская область", MAN: "Мангистауская область",
  SEV: "Северо-Казахстанская область", PAV: "Павлодарская область", YUZ: "Туркестанская область", ULT: "Улытауская область",
  ZAP: "Западно-Казахстанская область",
};

export function areaNameIn(lang: "en" | "ru", co: CountryCode, code: string | null | undefined): string {
  if (!code) return "";
  if (lang === "ru" && co === "KZ" && AREAS_RU_KZ[code]) return AREAS_RU_KZ[code]!;
  return areaName(co, code);
}

const US_STATE_TZ: Record<string, string> = {
  ...Object.fromEntries("CT DE DC FL GA IN KY ME MD MA MI NH NJ NY NC OH PA RI SC VT VA WV PR".split(" ").map((s) => [s, "America/New_York"])),
  ...Object.fromEntries("AL AR IL IA KS LA MN MS MO NE ND OK SD TN TX WI".split(" ").map((s) => [s, "America/Chicago"])),
  ...Object.fromEntries("CO ID MT NM UT WY".split(" ").map((s) => [s, "America/Denver"])),
  AZ: "America/Phoenix",
  ...Object.fromEntries("CA NV OR WA".split(" ").map((s) => [s, "America/Los_Angeles"])),
  AK: "America/Anchorage",
  HI: "Pacific/Honolulu",
};
const CA_TZ: Record<string, string> = {
  ON: "America/Toronto", QC: "America/Toronto", BC: "America/Vancouver", AB: "America/Edmonton", SK: "America/Regina",
  MB: "America/Winnipeg", NS: "America/Halifax", NB: "America/Halifax", PE: "America/Halifax", NL: "America/St_Johns",
  YT: "America/Whitehorse", NT: "America/Yellowknife", NU: "America/Iqaluit",
};
const BR_TZ: Record<string, string> = {
  AM: "America/Manaus", RR: "America/Boa_Vista", RO: "America/Porto_Velho", AC: "America/Rio_Branco", MT: "America/Cuiaba",
  MS: "America/Campo_Grande", PA: "America/Belem", AP: "America/Belem", MA: "America/Fortaleza", PI: "America/Fortaleza",
  CE: "America/Fortaleza", RN: "America/Fortaleza", PB: "America/Fortaleza", PE: "America/Recife", AL: "America/Maceio",
  SE: "America/Maceio", BA: "America/Bahia", TO: "America/Araguaina",
};
const COUNTRY_TZ: Record<CountryCode, string> = {
  KZ: "Asia/Qyzylorda", RO: "Europe/Bucharest", TH: "Asia/Bangkok", US: "America/New_York", CA: "America/Toronto", BR: "America/Sao_Paulo",
  GR: "Europe/Athens", JM: "America/Jamaica",
  GB: "Europe/London", IL: "Asia/Jerusalem", MX: "America/Mexico_City", AU: "Australia/Sydney", CN: "Asia/Shanghai",
  IN: "Asia/Kolkata", VN: "Asia/Ho_Chi_Minh",
};
// Multi-zone countries: zone per state (everything else uses the country default above).
export const AU_TZ: Record<string, string> = {
  NSW: "Australia/Sydney", ACT: "Australia/Sydney", VIC: "Australia/Melbourne", TAS: "Australia/Hobart",
  QLD: "Australia/Brisbane", SA: "Australia/Adelaide", NT: "Australia/Darwin", WA: "Australia/Perth",
};
export const MX_TZ: Record<string, string> = {
  BCN: "America/Tijuana", BCS: "America/Mazatlan", SIN: "America/Mazatlan", NAY: "America/Mazatlan", SON: "America/Hermosillo",
  CHH: "America/Chihuahua", COA: "America/Monterrey", NLE: "America/Monterrey", TAM: "America/Monterrey", DUR: "America/Monterrey",
  ROO: "America/Cancun", YUC: "America/Merida", CAM: "America/Merida",
};

/**
 * Time zone of the user's home area (state / province / city). Used to show every event in "your" time.
 * Without an area, multi-zone countries fall back to the browser's zone.
 */
export function areaTimeZone(co: CountryCode | null, area: string | null): string | undefined {
  if (!co) return undefined;
  if (co === "US") return area ? US_STATE_TZ[area] : undefined;
  if (co === "CA") return area ? CA_TZ[area] : undefined;
  if (co === "BR") return area ? BR_TZ[area] ?? "America/Sao_Paulo" : undefined;
  if (co === "AU") return area ? AU_TZ[area] ?? COUNTRY_TZ.AU : undefined;
  if (co === "MX") return area ? MX_TZ[area] ?? COUNTRY_TZ.MX : undefined;
  return COUNTRY_TZ[co];
}
