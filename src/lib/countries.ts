// Team code (FIFA trigram) -> Portuguese + English names, plus search aliases.
// Used for display labels and the searchable team filter.

interface Country {
  pt: string;
  en: string;
  aliases?: string[];
}

export const COUNTRY: Record<string, Country> = {
  mex: { pt: "México", en: "Mexico" },
  rsa: { pt: "África do Sul", en: "South Africa", aliases: ["africa do sul", "south africa"] },
  kor: { pt: "Coreia do Sul", en: "South Korea", aliases: ["korea", "coreia", "korea republic"] },
  cze: { pt: "Tchéquia", en: "Czechia", aliases: ["republica tcheca", "czech republic", "czech"] },
  can: { pt: "Canadá", en: "Canada" },
  bih: { pt: "Bósnia e Herzegovina", en: "Bosnia and Herzegovina", aliases: ["bosnia"] },
  qat: { pt: "Catar", en: "Qatar" },
  sui: { pt: "Suíça", en: "Switzerland" },
  bra: { pt: "Brasil", en: "Brazil" },
  mar: { pt: "Marrocos", en: "Morocco" },
  hai: { pt: "Haiti", en: "Haiti" },
  sco: { pt: "Escócia", en: "Scotland" },
  usa: { pt: "Estados Unidos", en: "United States", aliases: ["usa", "eua", "us", "america", "united states of america"] },
  par: { pt: "Paraguai", en: "Paraguay" },
  aus: { pt: "Austrália", en: "Australia" },
  tur: { pt: "Turquia", en: "Turkey", aliases: ["turkiye"] },
  ger: { pt: "Alemanha", en: "Germany", aliases: ["deutschland"] },
  cuw: { pt: "Curaçao", en: "Curaçao", aliases: ["curacao"] },
  civ: { pt: "Costa do Marfim", en: "Ivory Coast", aliases: ["cote divoire", "cote d'ivoire"] },
  ecu: { pt: "Equador", en: "Ecuador" },
  ned: { pt: "Países Baixos", en: "Netherlands", aliases: ["holanda", "holland", "paises baixos"] },
  jpn: { pt: "Japão", en: "Japan" },
  swe: { pt: "Suécia", en: "Sweden" },
  tun: { pt: "Tunísia", en: "Tunisia" },
  bel: { pt: "Bélgica", en: "Belgium" },
  egy: { pt: "Egito", en: "Egypt" },
  irn: { pt: "Irã", en: "Iran", aliases: ["ira"] },
  nzl: { pt: "Nova Zelândia", en: "New Zealand" },
  esp: { pt: "Espanha", en: "Spain" },
  cpv: { pt: "Cabo Verde", en: "Cape Verde" },
  ksa: { pt: "Arábia Saudita", en: "Saudi Arabia", aliases: ["saudi", "arabia saudita"] },
  uru: { pt: "Uruguai", en: "Uruguay" },
  fra: { pt: "França", en: "France" },
  sen: { pt: "Senegal", en: "Senegal" },
  irq: { pt: "Iraque", en: "Iraq" },
  nor: { pt: "Noruega", en: "Norway" },
  arg: { pt: "Argentina", en: "Argentina" },
  alg: { pt: "Argélia", en: "Algeria" },
  aut: { pt: "Áustria", en: "Austria" },
  jor: { pt: "Jordânia", en: "Jordan" },
  por: { pt: "Portugal", en: "Portugal" },
  cod: { pt: "Rep. Dem. do Congo", en: "DR Congo", aliases: ["congo", "rd congo", "drc"] },
  uzb: { pt: "Uzbequistão", en: "Uzbekistan" },
  col: { pt: "Colômbia", en: "Colombia" },
  eng: { pt: "Inglaterra", en: "England", aliases: ["uk", "united kingdom", "reino unido", "gra bretanha", "great britain", "britain", "gb"] },
  cro: { pt: "Croácia", en: "Croatia" },
  gha: { pt: "Gana", en: "Ghana" },
  pan: { pt: "Panamá", en: "Panama" },
};

/** lowercase + strip accents, for accent-insensitive matching. */
export function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/** Display name for a team code (PT), falling back to the upper-cased code. */
export function countryName(code: string): string {
  return COUNTRY[code]?.pt ?? code.toUpperCase();
}

/** Normalized search tokens for a team code: code + pt + en + aliases. */
export function countrySearchTokens(code: string): string[] {
  const c = COUNTRY[code];
  const toks = [code];
  if (c) toks.push(c.pt, c.en, ...(c.aliases ?? []));
  return toks.map(norm);
}
