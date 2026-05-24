// Prompts for the two-pass scan: (1) classify the page, (2) read empty slots
// scoped to that page. Pass 1 makes the album's confusable foil pages reliable;
// pass 2 only reads codes for a page we already identified.

import { PAGE_TO_SECTION, SECTION_MEMBERS, sectionLabel, type PageType } from "./sections";

// ---- Pass 1: classify ----

export const CLASSIFY_SYSTEM =
  "You identify which single page of the Panini FIFA World Cup 2026 album a photo " +
  "shows, from its dominant content. Reply with JSON only.";

export function buildClassifyPrompt(): string {
  return (
    `Identify this album page as exactly one type:\n\n` +
    `- "team": one country's page — that country's name, flag and crest above a numbered slot grid (e.g. MEX 1–20), whether filled or mostly empty.\n` +
    `- "opening": the album's front page — the Panini logo ("WE ARE PANINI") with the official Emblem, Mascots and Slogan foils and a "Quadro de Honra" honour board. Holds "00" and FWC 1–4.\n` +
    `- "cities": the host-cities page — North-American host cities and stadiums (Toronto, Guadalajara, Atlanta, Miami…).\n` +
    `- "history-early": a World Cup History page led by the large gold trophy photo, champions 1930–1974.\n` +
    `- "history-recent": a World Cup History page of recent champions 1978–2022 in large colour team photos.\n` +
    `- "cc-lam": a Coca-Cola promotional page.\n\n` +
    `Reply with JSON only: {"page":"<label>","trophy_photo":true|false,"note":"<=6 words"}`
  );
}

// ---- Pass 2: scoped read ----

export const READ_SYSTEM =
  "You list the still-empty slots on a Panini FIFA World Cup 2026 album page. An " +
  "empty slot shows its printed code on a blank placeholder; a sticker covers a " +
  "filled slot. You are told which page it is. Reply with JSON only.";

export function buildReadPrompt(pageType: PageType): string {
  if (pageType === "team") {
    return (
      `This is one country's team page: each slot is printed with a 3-letter code and a number, e.g. "MEX 7" (1–20).\n` +
      `Report the team's 3-letter code, then check each slot and list every code still showing its printed number on a blank placeholder.\n` +
      `Return JSON only: {"team_code":"mex","missing":["mex4","mex7"]} — lowercase, no spaces. A complete page returns an empty missing list with the team_code.`
    );
  }

  const section = PAGE_TO_SECTION[pageType];
  const codes = (SECTION_MEMBERS.get(section) ?? []).map(printedCode).join(", ");
  return (
    `This album page is the ${sectionLabel(section)}. Its slots: ${codes}.\n` +
    `Check each slot in turn and list every code still showing its printed number on a blank placeholder.\n` +
    `Return JSON only: {"team_code":"","missing":["fwc10"]} — lowercase, no spaces; keep the hyphen in "cc-lam". A complete page returns an empty missing list.`
  );
}

/** "fwc9" -> "FWC 9", "cc-lam3" -> "CC-LAM 3", "00" -> "00", "hs" -> "HS". */
function printedCode(num: string): string {
  return num.toUpperCase().replace(/(\d+)$/, " $1").trim();
}
