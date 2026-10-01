// The 30 MLB teams: ids, abbreviations, names, brand colours and a credited home-ballpark photo.
// Browser-safe (no imports). Keyed by the MLB abbreviation used in data/build/index.json.
// Ballpark photos are Wikimedia Commons files (1920px thumbnails); credit and license come from each file page.
// Brand colours: the teams' official primary and secondary colours. Retrieved from Wikimedia Commons on 2026-09-30.

export const TEAMS = {
  ATH: { id: 133, abbr: "ATH", fgAbbr: "ATH", name: "Athletics", league: "American League", division: "American League West", venueId: 2529,
    colors: { primary: "#003831", secondary: "#EFB21E" },
    ballparkPhoto: { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Sutter_Health_Park_view_on_an_off-day.jpg/1920px-Sutter_Health_Park_view_on_an_off-day.jpg", page: "https://commons.wikimedia.org/wiki/File:Sutter_Health_Park_view_on_an_off-day.jpg", credit: "Quintin Soloviev", license: "CC BY 4.0" } },
  ATL: { id: 144, abbr: "ATL", fgAbbr: "ATL", name: "Atlanta Braves", league: "National League", division: "National League East", venueId: 4705,
    colors: { primary: "#CE1141", secondary: "#13274F" },
    ballparkPhoto: { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Truist_Park.jpg/1920px-Truist_Park.jpg", page: "https://commons.wikimedia.org/wiki/File:Truist_Park.jpg", credit: "Andrew nyr", license: "CC BY-SA 4.0" } },
  AZ: { id: 109, abbr: "AZ", fgAbbr: "ARI", name: "Arizona Diamondbacks", league: "National League", division: "National League West", venueId: 15,
    colors: { primary: "#A71930", secondary: "#E3D4AD" },
    ballparkPhoto: { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Chase_Field_%2851809484371%29.jpg/1920px-Chase_Field_%2851809484371%29.jpg", page: "https://commons.wikimedia.org/wiki/File:Chase_Field_(51809484371).jpg", credit: "Gage Skidmore from Surprise, AZ, United States of America", license: "CC BY-SA 2.0" } },
  BAL: { id: 110, abbr: "BAL", fgAbbr: "BAL", name: "Baltimore Orioles", league: "American League", division: "American League East", venueId: 2,
    colors: { primary: "#DF4601", secondary: "#000000" },
    ballparkPhoto: { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Oriole_Park_at_Camden_Yards_with_Baltimore_skyline_in_the_background_in_2023.jpg/1920px-Oriole_Park_at_Camden_Yards_with_Baltimore_skyline_in_the_background_in_2023.jpg", page: "https://commons.wikimedia.org/wiki/File:Oriole_Park_at_Camden_Yards_with_Baltimore_skyline_in_the_background_in_2023.jpg", credit: "Quintin Soloviev", license: "CC BY 4.0" } },
  BOS: { id: 111, abbr: "BOS", fgAbbr: "BOS", name: "Boston Red Sox", league: "American League", division: "American League East", venueId: 3,
    colors: { primary: "#BD3039", secondary: "#0C2340" },
    ballparkPhoto: { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Fenway_Park01.jpg/1920px-Fenway_Park01.jpg", page: "https://commons.wikimedia.org/wiki/File:Fenway_Park01.jpg", credit: "Bernard Gagnon", license: "CC BY-SA 3.0" } },
  CHC: { id: 112, abbr: "CHC", fgAbbr: "CHC", name: "Chicago Cubs", league: "National League", division: "National League Central", venueId: 17,
    colors: { primary: "#0E3386", secondary: "#CC3433" },
    ballparkPhoto: { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Wrigley_Field_NE.jpg/1920px-Wrigley_Field_NE.jpg", page: "https://commons.wikimedia.org/wiki/File:Wrigley_Field_NE.jpg", credit: "Sea Cow", license: "CC BY-SA 4.0" } },
  CIN: { id: 113, abbr: "CIN", fgAbbr: "CIN", name: "Cincinnati Reds", league: "National League", division: "National League Central", venueId: 2602,
    colors: { primary: "#C6011F", secondary: "#000000" },
    ballparkPhoto: { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/Great_American_Ball_Park_%2815561187833%29.jpg/1920px-Great_American_Ball_Park_%2815561187833%29.jpg", page: "https://commons.wikimedia.org/wiki/File:Great_American_Ball_Park_(15561187833).jpg", credit: "redlegsfan21", license: "CC BY-SA 2.0" } },
  CLE: { id: 114, abbr: "CLE", fgAbbr: "CLE", name: "Cleveland Guardians", league: "American League", division: "American League Central", venueId: 5,
    colors: { primary: "#00385D", secondary: "#E50022" },
    ballparkPhoto: { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Progressive_Field.jpg/1920px-Progressive_Field.jpg", page: "https://commons.wikimedia.org/wiki/File:Progressive_Field.jpg", credit: "Jsawczuk", license: "Public domain" } },
  COL: { id: 115, abbr: "COL", fgAbbr: "COL", name: "Colorado Rockies", league: "National League", division: "National League West", venueId: 19,
    colors: { primary: "#33006F", secondary: "#C4CED4" },
    ballparkPhoto: { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Coors_Field_July_2015.jpg/1920px-Coors_Field_July_2015.jpg", page: "https://commons.wikimedia.org/wiki/File:Coors_Field_July_2015.jpg", credit: "Thelastcanadian", license: "CC BY-SA 4.0" } },
  CWS: { id: 145, abbr: "CWS", fgAbbr: "CHW", name: "Chicago White Sox", league: "American League", division: "American League Central", venueId: 4,
    colors: { primary: "#27251F", secondary: "#C4CED4" },
    ballparkPhoto: { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Cleveland_Indians_v._Chicago_White_Sox%2C_U.S._Cellular_Field%2C_Chicago%2C_Illinois_%289179591733%29.jpg/1920px-Cleveland_Indians_v._Chicago_White_Sox%2C_U.S._Cellular_Field%2C_Chicago%2C_Illinois_%289179591733%29.jpg", page: "https://commons.wikimedia.org/wiki/File:Cleveland_Indians_v._Chicago_White_Sox,_U.S._Cellular_Field,_Chicago,_Illinois_(9179591733).jpg", credit: "Ken Lund from Reno, Nevada, USA", license: "CC BY-SA 2.0" } },
  DET: { id: 116, abbr: "DET", fgAbbr: "DET", name: "Detroit Tigers", league: "American League", division: "American League Central", venueId: 2394,
    colors: { primary: "#0C2340", secondary: "#FA4616" },
    ballparkPhoto: { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/Comerica_Park%2C_Detroit_Skyline.jpg/1920px-Comerica_Park%2C_Detroit_Skyline.jpg", page: "https://commons.wikimedia.org/wiki/File:Comerica_Park,_Detroit_Skyline.jpg", credit: "Dan Gaken from Mt. Pleasant, MI, United States", license: "CC BY 2.0" } },
  HOU: { id: 117, abbr: "HOU", fgAbbr: "HOU", name: "Houston Astros", league: "American League", division: "American League West", venueId: 2392,
    colors: { primary: "#002D62", secondary: "#EB6E1F" },
    ballparkPhoto: { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Minute_Maid_Park_2016-04-23.jpg/1920px-Minute_Maid_Park_2016-04-23.jpg", page: "https://commons.wikimedia.org/wiki/File:Minute_Maid_Park_2016-04-23.jpg", credit: "J Dimas", license: "CC BY 2.0" } },
  KC: { id: 118, abbr: "KC", fgAbbr: "KCR", name: "Kansas City Royals", league: "American League", division: "American League Central", venueId: 7,
    colors: { primary: "#004687", secondary: "#BD9B60" },
    ballparkPhoto: { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/Kauffman_Stadium.jpg/1920px-Kauffman_Stadium.jpg", page: "https://commons.wikimedia.org/wiki/File:Kauffman_Stadium.jpg", credit: "User jimcchou on Flickr", license: "CC BY 2.0" } },
  LAA: { id: 108, abbr: "LAA", fgAbbr: "LAA", name: "Los Angeles Angels", league: "American League", division: "American League West", venueId: 1,
    colors: { primary: "#BA0021", secondary: "#003263" },
    ballparkPhoto: { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Angel_stadium_2018.jpg/1920px-Angel_stadium_2018.jpg", page: "https://commons.wikimedia.org/wiki/File:Angel_stadium_2018.jpg", credit: "Sunsherry1101", license: "CC BY-SA 4.0" } },
  LAD: { id: 119, abbr: "LAD", fgAbbr: "LAD", name: "Los Angeles Dodgers", league: "National League", division: "National League West", venueId: 22,
    colors: { primary: "#005A9C", secondary: "#EF3E42" },
    ballparkPhoto: { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/St._Louis_Cardinals_0%2C_Los_Angeles_Dodgers_0%2C_Dodger_Stadium%2C_Los_Angeles%2C_California_%2814331296150%29.jpg/1920px-St._Louis_Cardinals_0%2C_Los_Angeles_Dodgers_0%2C_Dodger_Stadium%2C_Los_Angeles%2C_California_%2814331296150%29.jpg", page: "https://commons.wikimedia.org/wiki/File:St._Louis_Cardinals_0,_Los_Angeles_Dodgers_0,_Dodger_Stadium,_Los_Angeles,_California_(14331296150).jpg", credit: "Ken Lund from Reno, Nevada, USA", license: "CC BY-SA 2.0" } },
  MIA: { id: 146, abbr: "MIA", fgAbbr: "MIA", name: "Miami Marlins", league: "National League", division: "National League East", venueId: 4169,
    colors: { primary: "#00A3E0", secondary: "#EF3340" },
    ballparkPhoto: { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Marlins_First_Pitch_at_Marlins_Park%2C_April_4%2C_2012.jpg/1920px-Marlins_First_Pitch_at_Marlins_Park%2C_April_4%2C_2012.jpg", page: "https://commons.wikimedia.org/wiki/File:Marlins_First_Pitch_at_Marlins_Park,_April_4,_2012.jpg", credit: "Roberto Coquis", license: "CC BY 2.0" } },
  MIL: { id: 158, abbr: "MIL", fgAbbr: "MIL", name: "Milwaukee Brewers", league: "National League", division: "National League Central", venueId: 32,
    colors: { primary: "#12284B", secondary: "#FFC52F" },
    ballparkPhoto: { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Brewers_vs_Twins_%28510479804%29.jpg/1920px-Brewers_vs_Twins_%28510479804%29.jpg", page: "https://commons.wikimedia.org/wiki/File:Brewers_vs_Twins_(510479804).jpg", credit: "Jeramey Jannene from Milwaukee, WI, United States of America", license: "CC BY 2.0" } },
  MIN: { id: 142, abbr: "MIN", fgAbbr: "MIN", name: "Minnesota Twins", league: "American League", division: "American League Central", venueId: 3312,
    colors: { primary: "#002B5C", secondary: "#D31145" },
    ballparkPhoto: { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Target_Field.jpg/1920px-Target_Field.jpg", page: "https://commons.wikimedia.org/wiki/File:Target_Field.jpg", credit: "JL1Row", license: "CC BY-SA 3.0" } },
  NYM: { id: 121, abbr: "NYM", fgAbbr: "NYM", name: "New York Mets", league: "National League", division: "National League East", venueId: 3289,
    colors: { primary: "#002D72", secondary: "#FF5910" },
    ballparkPhoto: { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Citi_Field_Night_Game.jpg/1920px-Citi_Field_Night_Game.jpg", page: "https://commons.wikimedia.org/wiki/File:Citi_Field_Night_Game.jpg", credit: "Chris6d", license: "CC BY-SA 4.0" } },
  NYY: { id: 147, abbr: "NYY", fgAbbr: "NYY", name: "New York Yankees", league: "American League", division: "American League East", venueId: 3313,
    colors: { primary: "#0C2340", secondary: "#C4CED3" },
    ballparkPhoto: { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/A_Great_Night_at_Yankee_Stadium.jpg/1920px-A_Great_Night_at_Yankee_Stadium.jpg", page: "https://commons.wikimedia.org/wiki/File:A_Great_Night_at_Yankee_Stadium.jpg", credit: "Jason Moy", license: "CC BY-SA 4.0" } },
  PHI: { id: 143, abbr: "PHI", fgAbbr: "PHI", name: "Philadelphia Phillies", league: "National League", division: "National League East", venueId: 2681,
    colors: { primary: "#E81828", secondary: "#002D72" },
    ballparkPhoto: { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Citizens_Bank_Park_2021.jpg/1920px-Citizens_Bank_Park_2021.jpg", page: "https://commons.wikimedia.org/wiki/File:Citizens_Bank_Park_2021.jpg", credit: "Chris6d", license: "CC BY-SA 4.0" } },
  PIT: { id: 134, abbr: "PIT", fgAbbr: "PIT", name: "Pittsburgh Pirates", league: "National League", division: "National League Central", venueId: 31,
    colors: { primary: "#27251F", secondary: "#FDB827" },
    ballparkPhoto: { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/PNC_Park%2C_Home_of_Pittsburgh_Pirates.jpg/1920px-PNC_Park%2C_Home_of_Pittsburgh_Pirates.jpg", page: "https://commons.wikimedia.org/wiki/File:PNC_Park,_Home_of_Pittsburgh_Pirates.jpg", credit: "daveynin on Flickr", license: "CC BY 2.0" } },
  SD: { id: 135, abbr: "SD", fgAbbr: "SDP", name: "San Diego Padres", league: "National League", division: "National League West", venueId: 2680,
    colors: { primary: "#2F241D", secondary: "#FFC425" },
    ballparkPhoto: { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Petco_Park%2C_San_Diego.jpg/1920px-Petco_Park%2C_San_Diego.jpg", page: "https://commons.wikimedia.org/wiki/File:Petco_Park,_San_Diego.jpg", credit: "Bernard Gagnon", license: "CC BY-SA 3.0" } },
  SEA: { id: 136, abbr: "SEA", fgAbbr: "SEA", name: "Seattle Mariners", league: "American League", division: "American League West", venueId: 680,
    colors: { primary: "#0C2C56", secondary: "#005C5C" },
    ballparkPhoto: { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/T-Mobile_Park_0017.jpg/1920px-T-Mobile_Park_0017.jpg", page: "https://commons.wikimedia.org/wiki/File:T-Mobile_Park_0017.jpg", credit: "SecretName101", license: "CC BY-SA 4.0" } },
  SF: { id: 137, abbr: "SF", fgAbbr: "SFG", name: "San Francisco Giants", league: "National League", division: "National League West", venueId: 2395,
    colors: { primary: "#FD5A1E", secondary: "#27251F" },
    ballparkPhoto: { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Oracle_Park_-_August_2025_-_Sarah_Stierch_-_17.jpg/1920px-Oracle_Park_-_August_2025_-_Sarah_Stierch_-_17.jpg", page: "https://commons.wikimedia.org/wiki/File:Oracle_Park_-_August_2025_-_Sarah_Stierch_-_17.jpg", credit: "Missvain", license: "CC0" } },
  STL: { id: 138, abbr: "STL", fgAbbr: "STL", name: "St. Louis Cardinals", league: "National League", division: "National League Central", venueId: 2889,
    colors: { primary: "#C41E3A", secondary: "#0C2340" },
    ballparkPhoto: { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/Busch_Stadium_-_Saint_Louis%2C_Missouri_-_March_31%2C_2014.jpg/1920px-Busch_Stadium_-_Saint_Louis%2C_Missouri_-_March_31%2C_2014.jpg", page: "https://commons.wikimedia.org/wiki/File:Busch_Stadium_-_Saint_Louis,_Missouri_-_March_31,_2014.jpg", credit: "Lee Ann Ratledge", license: "CC BY 4.0" } },
  TB: { id: 139, abbr: "TB", fgAbbr: "TBR", name: "Tampa Bay Rays", league: "American League", division: "American League East", venueId: 12,
    colors: { primary: "#092C5C", secondary: "#8FBCE6" },
    ballparkPhoto: { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Tropicana_Field_in_Tampa%2C_Florida_2024.jpg/1920px-Tropicana_Field_in_Tampa%2C_Florida_2024.jpg", page: "https://commons.wikimedia.org/wiki/File:Tropicana_Field_in_Tampa,_Florida_2024.jpg", credit: "Quintin Soloviev", license: "CC BY 4.0" } },
  TEX: { id: 140, abbr: "TEX", fgAbbr: "TEX", name: "Texas Rangers", league: "American League", division: "American League West", venueId: 5325,
    colors: { primary: "#003278", secondary: "#C0111F" },
    ballparkPhoto: { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/GlobeLifeField2021.jpg/1920px-GlobeLifeField2021.jpg", page: "https://commons.wikimedia.org/wiki/File:GlobeLifeField2021.jpg", credit: "slgckgc", license: "CC BY 2.0" } },
  TOR: { id: 141, abbr: "TOR", fgAbbr: "TOR", name: "Toronto Blue Jays", league: "American League", division: "American League East", venueId: 14,
    colors: { primary: "#134A8E", secondary: "#E8291C" },
    ballparkPhoto: { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Rogers_Centre.jpg/1920px-Rogers_Centre.jpg", page: "https://commons.wikimedia.org/wiki/File:Rogers_Centre.jpg", credit: "Fabian Roudra Baroi", license: "CC BY-SA 4.0" } },
  WSH: { id: 120, abbr: "WSH", fgAbbr: "WSN", name: "Washington Nationals", league: "National League", division: "National League East", venueId: 3309,
    colors: { primary: "#AB0003", secondary: "#14225A" },
    ballparkPhoto: { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Nationals_Park_Baseball_Stadium_in_Washington_D.C..jpg/1920px-Nationals_Park_Baseball_Stadium_in_Washington_D.C..jpg", page: "https://commons.wikimedia.org/wiki/File:Nationals_Park_Baseball_Stadium_in_Washington_D.C..jpg", credit: "Tony Webster", license: "CC BY 2.0" } },
};

export const TEAM_LIST = Object.values(TEAMS);

export const TTL_SEASON_HOURS = 12;
export const TTL_OFFSEASON_HOURS = 24 * 7;

/** Refresh age for a cached page (pipeline/fetch_rr.py ttl_hours is the same rule; used by pipeline/build/teams.mjs,
 * server/routes/teams.js and the static site through public/js/api.js): 12 hours in season, 7 days in the
 * off-season, by RosterResource's own flag (pointer.offseason); without it, March 15 to November 5 is in season. */
export function ttlHours(offseason, now = new Date()) {
  let off = offseason;
  if (typeof off !== "boolean") {
    const md = (now.getUTCMonth() + 1) * 100 + now.getUTCDate();
    off = !(md >= 315 && md <= 1105);
  }
  return off ? TTL_OFFSEASON_HOURS : TTL_SEASON_HOURS;
}

/** True when a pointer's page is older than its refresh age (or has no usable fetch time). */
export function isStale(ptr, now = new Date()) {
  const t = Date.parse(ptr?.fetchedAt ?? "");
  if (!Number.isFinite(t)) return true;
  return now.getTime() - t >= ttlHours(ptr.offseason, now) * 3600 * 1000;
}

/** Whether a saved team-depth answer ({checkedAt, asOf, offseason}) is past its refresh age; the static site uses this
 * (public/js/api.js) because it cannot refresh. checkedAt (the latest fetch) wins over asOf (when the data was built). */
export function copyIsStale(res, now = new Date()) {
  return isStale({ fetchedAt: res?.checkedAt ?? res?.asOf ?? null, offseason: res?.offseason }, now);
}
