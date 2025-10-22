import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";
import { readLines } from "https://deno.land/std/io/mod.ts";

interface WordData {
  word: string;
  definitions: string[];
  pronunciation: string;
  synonyms: string[];
  origin: string;
  examples: string[];
}

async function main() {
  console.log("Welcome to the Hybrid Thesaurus (Merriam-Webster + Wiktionary)!");
  console.log("Enter words (one per line). Press Enter on empty line or Ctrl+D to exit.\n");

  for await (const line of readLines(Deno.stdin)) {
    const word = line.trim();
    if (!word) {
      console.log("Goodbye!");
      break;
    }
    try {
      const data = await fetchWordData(word);
      displayWordData(data);
    } catch (error) {
      console.error(`Error fetching data for "${word}": ${error.message}`);
    }
    console.log("\n" + "=".repeat(50) + "\n");
  }
}

async function fetchWordData(word: string): Promise<WordData> {
  // Put your Merriam-Webster API key here
  const key = "YOUR_API_KEY_HERE";
  const thesUrl = `https://dictionaryapi.com/api/v3/references/thesaurus/json/${encodeURIComponent(word)}?key=${key}`;

  const thesRes = await fetch(thesUrl);

  if (!thesRes.ok) {
    const text = await thesRes.text();
    console.log("Thes response:", text);
    throw new Error("Failed to fetch thesaurus data");
  }

  let thesJson: any;
  try {
    thesJson = await thesRes.json();
  } catch (e) {
    console.log("Failed to parse thesaurus JSON:", e);
    throw new Error("Invalid response from thesaurus API");
  }

  // Check if suggestions
  if (Array.isArray(thesJson) && thesJson.length > 0 && typeof thesJson[0] === 'string') {
    throw new Error(`Word not found. Suggestions: ${thesJson.slice(0, 5).join(', ')}`);
  }

  let pronunciation = "Not available";
  let origin = "Not available";

  // Try to get pronunciation and origin from Merriam-Webster dictionary API
  try {
    const dictUrl = `https://dictionaryapi.com/api/v3/references/collegiate/json/${encodeURIComponent(word)}?key=${key}`;
    const dictRes = await fetch(dictUrl);
    if (dictRes.ok) {
      const text = await dictRes.text();
      try {
        const dictJson = JSON.parse(text);
        if (!Array.isArray(dictJson) || (dictJson.length > 0 && typeof dictJson[0] !== 'string')) {
          pronunciation = parsePronunciation(dictJson);
          origin = parseOrigin(dictJson);
        }
      } catch {}
    }
  } catch {}

  // If pronunciation is not available from Merriam-Webster, try Wiktionary
  let wiktHtml = "";
  if (pronunciation === "Not available") {
    try {
      const wiktUrl = `https://en.wiktionary.org/api/rest_v1/page/html/${encodeURIComponent(word)}`;
      const wiktRes = await fetch(wiktUrl);
      if (wiktRes.ok) {
        wiktHtml = await wiktRes.text();
        pronunciation = parsePronunciationWikt(wiktHtml);
      }
    } catch {}
  }

  // Get examples from Wiktionary since Merriam-Webster doesn't provide them
  let examples: string[] = [];
  try {
    const defUrl = `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word)}`;
    const defRes = await fetch(defUrl);
    if (defRes.ok) {
      const defJson = await defRes.json();
      examples = parseExamplesWikt(defJson);
    }
  } catch {}

  return {
    word,
    definitions: parseDefinitions(thesJson),
    pronunciation,
    synonyms: parseSynonyms(thesJson),
    origin,
    examples
  };
}

function parseDefinitions(json: any): string[] {
  if (!Array.isArray(json) || json.length === 0) return [];
  const entry = json[0];
  return entry.shortdef || [];
}

function parsePronunciation(json: any): string {
  if (!Array.isArray(json) || json.length === 0) return "Not available";
  const entry = json[0];
  if (entry.hwi && entry.hwi.prs && entry.hwi.prs.length > 0) {
    return "/" + entry.hwi.prs[0].mw + "/";
  }
  return "Not available";
}

function parseSynonyms(json: any): string[] {
  if (!Array.isArray(json) || json.length === 0) return [];
  const entry = json[0];
  if (entry.meta && entry.meta.syns) {
    const allSyns = entry.meta.syns.flat();
    return allSyns.slice(0, 10);
  }
  return [];
}

function parseOrigin(json: any): string {
  if (!Array.isArray(json) || json.length === 0) return "Not available";
  const entry = json[0];
  if (entry.et && entry.et.length > 0) {
    return entry.et.map((e: any) => Array.isArray(e) ? e[1] : e).join(' ').replace(/{[^}]*}/g, '');
  }
  return "Not available";
}

function parsePronunciationWikt(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const pronSection = findSectionByHeading(doc, "Pronunciation");
  if (!pronSection) return "Not available";

  const ipaElements = pronSection.querySelectorAll("span.IPA");
  const ipas = Array.from(ipaElements).map(el => el.textContent?.trim()).filter(Boolean);
  return ipas.length > 0 ? ipas[0]! : "Not available";
}

function parseExamplesWikt(json: any): string[] {
  const english = json.en;
  if (!english) return [];
  const examples: string[] = [];
  for (const entry of english) {
    if (entry.language === "English" && entry.definitions) {
      for (const def of entry.definitions) {
        if (def.examples) {
          examples.push(...def.examples.map(cleanHtml));
        }
        if (def.parsedExamples) {
          examples.push(...def.parsedExamples.map((ex: any) => cleanHtml(ex.example)));
        }
      }
    }
  }
  return examples.slice(0, 2); // Limit to 2
}

function cleanHtml(html: string): string {
  // Simple HTML cleaning
  return html.replace(/<[^>]*>/g, '').trim();
}

function findSectionByHeading(doc: any, headingText: string): Element | null {
  const headings = doc.querySelectorAll("h2, h3, h4");
  for (const heading of headings) {
    if (heading.textContent?.trim().toLowerCase().includes(headingText.toLowerCase())) {
      return heading.parentElement; // Assuming section is parent
    }
  }
  return null;
}

function displayWordData(data: WordData) {
  console.log(`Word: ${data.word}`);
  console.log(`Pronunciation: ${data.pronunciation}`);
  console.log(`Synonyms: ${data.synonyms.join(", ") || "None available"}`);
  console.log(`Origin: ${data.origin}`);
  console.log("Examples:");
  if (data.examples.length > 0) {
    data.examples.forEach(ex => console.log(`  - ${ex}`));
  } else {
    console.log("  None available");
  }
  console.log("Definitions:");
  if (data.definitions.length > 0) {
    data.definitions.forEach((def, i) => console.log(`  ${i + 1}. ${def}`));
  } else {
    console.log("  None available");
  }
}

if (import.meta.main) {
  main();
}
