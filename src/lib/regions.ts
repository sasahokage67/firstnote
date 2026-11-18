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
};

export const AREA_LABEL: Record<CountryCode, string> = {
  KZ: "City / region", US: "State", CA: "Province", RO: "County (județ)", TH: "Province", BR: "State",
};

/** Cities that belong to an area even when FIRST files them under another code (e.g. Semey is now in Abai Region). */
const AREA_CITIES: Partial<Record<string, string[]>> = {
  "KZ:ALA": ["Almaty"],
  "KZ:ABA": ["Semey"],
  "KZ:VOS": ["Oskemen", "Ust-Kamenogorsk"],
  "KZ:ZHT": ["Taldykorgan"],
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
