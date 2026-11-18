"""Build public/events/2026.json for firstnote from the raw FTC-events scrape."""
import json, re, sys
from datetime import datetime

raw = json.load(open(sys.argv[1]))
out_path = sys.argv[2]

COUNTRIES = {"USA": "US", "Canada": "CA", "Romania": "RO", "Brazil": "BR", "Kazakhstan": "KZ", "Thailand": "TH"}

US_TZ = {
    **dict.fromkeys("CT DE DC FL GA IN KY ME MD MA MI NH NJ NY NC OH PA RI SC VT VA WV PR".split(), "America/New_York"),
    **dict.fromkeys("AL AR IL IA KS LA MN MS MO NE ND OK SD TN TX WI".split(), "America/Chicago"),
    **dict.fromkeys("CO ID MT NM UT WY".split(), "America/Denver"),
    "AZ": "America/Phoenix",
    **dict.fromkeys("CA NV OR WA".split(), "America/Los_Angeles"),
    "AK": "America/Anchorage", "HI": "Pacific/Honolulu",
}
# Cities in split-timezone states that differ from the state default
CITY_TZ = {
    ("TX", "El Paso"): "America/Denver",
    ("FL", "Pensacola"): "America/Chicago", ("FL", "Panama City"): "America/Chicago",
    ("FL", "Fort Walton Beach"): "America/Chicago", ("FL", "Destin"): "America/Chicago",
    ("FL", "Navarre"): "America/Chicago", ("FL", "Crestview"): "America/Chicago",
    ("FL", "Milton"): "America/Chicago", ("FL", "Niceville"): "America/Chicago",
    ("KY", "Bowling Green"): "America/Chicago", ("KY", "Paducah"): "America/Chicago",
    ("KY", "Owensboro"): "America/Chicago", ("KY", "Hopkinsville"): "America/Chicago",
    ("KY", "Murray"): "America/Chicago", ("KY", "Madisonville"): "America/Chicago",
    ("IN", "Evansville"): "America/Chicago", ("IN", "Gary"): "America/Chicago",
    ("IN", "Hammond"): "America/Chicago", ("IN", "Merrillville"): "America/Chicago",
    ("IN", "Valparaiso"): "America/Chicago", ("IN", "Crown Point"): "America/Chicago",
    ("IN", "Schererville"): "America/Chicago", ("IN", "Munster"): "America/Chicago",
    ("IN", "Michigan City"): "America/Chicago", ("IN", "La Porte"): "America/Chicago",
    ("MI", "Iron Mountain"): "America/Chicago", ("MI", "Menominee"): "America/Chicago",
    ("MI", "Ironwood"): "America/Chicago",
    ("TN", "Knoxville"): "America/New_York", ("TN", "Chattanooga"): "America/New_York",
    ("TN", "Johnson City"): "America/New_York", ("TN", "Kingsport"): "America/New_York",
    ("TN", "Oak Ridge"): "America/New_York", ("TN", "Maryville"): "America/New_York",
    ("TN", "Cleveland"): "America/New_York", ("TN", "Bristol"): "America/New_York",
    ("TN", "Morristown"): "America/New_York",
    ("ID", "Coeur d'Alene"): "America/Los_Angeles", ("ID", "Moscow"): "America/Los_Angeles",
    ("ID", "Lewiston"): "America/Los_Angeles", ("ID", "Post Falls"): "America/Los_Angeles",
    ("ID", "Sandpoint"): "America/Los_Angeles",
    ("OR", "Ontario"): "America/Boise",
    ("ND", "Dickinson"): "America/Denver", ("ND", "Williston"): "America/Chicago",
    ("SD", "Rapid City"): "America/Denver", ("NE", "Scottsbluff"): "America/Denver",
    ("KS", "Goodland"): "America/Denver",
}
CA_TZ = {"ON": "America/Toronto", "QC": "America/Toronto", "BC": "America/Vancouver", "AB": "America/Edmonton",
         "SK": "America/Regina", "MB": "America/Winnipeg", "NS": "America/Halifax", "NB": "America/Halifax",
         "PE": "America/Halifax", "NL": "America/St_Johns", "YT": "America/Whitehorse", "NT": "America/Yellowknife"}
BR_TZ = {"AM": "America/Manaus", "RR": "America/Boa_Vista", "RO": "America/Porto_Velho", "AC": "America/Rio_Branco",
         "MT": "America/Cuiaba", "MS": "America/Campo_Grande", "PA": "America/Belem", "AP": "America/Belem",
         "MA": "America/Fortaleza", "PI": "America/Fortaleza", "CE": "America/Fortaleza", "RN": "America/Fortaleza",
         "PB": "America/Fortaleza", "PE": "America/Recife", "AL": "America/Maceio", "SE": "America/Maceio",
         "BA": "America/Bahia", "TO": "America/Araguaina"}  # everything else: Sao_Paulo


def tz_for(co, st, city):
    if co == "US":
        return CITY_TZ.get((st, city)) or US_TZ.get(st, "America/New_York")
    if co == "CA":
        return CA_TZ.get(st, "America/Toronto")
    if co == "BR":
        return BR_TZ.get(st, "America/Sao_Paulo")
    if co == "RO":
        return "Europe/Bucharest"
    if co == "KZ":
        return "Asia/Qyzylorda"  # Kazakhstan is a single UTC+5 zone since 2024
    if co == "TH":
        return "Asia/Bangkok"
    return "UTC"


def kind(code, name):
    b = re.sub(r"\d+$", "", code)
    n = name.lower()
    if code.startswith("FTCCMP"): return "worlds"
    if b.endswith("LA") or "leadership award" in n: return "leadership"
    if b.endswith("CMP") or "championship" in n: return "championship"
    if b.endswith("KO") or "kickoff" in n or "kick off" in n or "kick-off" in n: return "kickoff"
    if b.endswith("LT") or "league tournament" in n or "interleague" in n: return "league_tournament"
    if b.endswith("Q") or "qualifier" in n or "regional" in n: return "qualifier"
    if b.endswith(("N", "S", "OS")) or "scrimmage" in n or "screamage" in n: return "scrimmage"
    if b.endswith("M") or "meet" in n: return "league_meet"
    return "other"


def dates(s):
    found = re.findall(r"([A-Z][a-z]+ \d{1,2}, \d{4})", s)
    if not found: return None, None
    f = [datetime.strptime(x, "%B %d, %Y").strftime("%Y-%m-%d") for x in found]
    return f[0], f[-1]


events = []
for e in raw:
    if not e["loc"]: continue  # "Event in planning" – no date/place yet
    m = re.match(r"^(.*), ?([^ ,]+) (\w+)$", e["loc"])
    if not m: continue
    city, st, country = m.groups()
    co = COUNTRIES.get(country)
    if not co: continue
    if e["c"].startswith("ON"): continue  # Military & Diplomatic, not a country program
    s, en = dates(e["d"])
    if not s: continue
    if "cancel" in e["n"].lower(): continue
    city = city.replace("Bucuresti", "București").replace("Bucharest", "București")
    events.append({
        "c": e["c"], "n": e["n"], "t": kind(e["c"], e["n"]), "s": s, "e": en,
        "city": city, "st": st, "co": co, "rg": e["r"] if co in ("US",) else "",
        "v": e["v"], "tz": tz_for(co, st, city),
    })

events.sort(key=lambda x: (x["s"], x["n"]))
json.dump({"season": "2026-2027 BIOBUZZ", "source": "ftc-events.firstinspires.org",
           "updated": "2026-11-18", "events": events},
          open(out_path, "w"), ensure_ascii=False, separators=(",", ":"))
import collections
print(len(events), collections.Counter(x["co"] for x in events), collections.Counter(x["t"] for x in events))
