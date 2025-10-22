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

async function fetchFromMerriamWebster(word: string, key: string): Promise<{ data: { definitions: string[], synonyms: string[], pronunciation: string, origin: string } | null, suggestions: string[] }> {
  try {
    const thesUrl = `https://dictionaryapi.com/api/v3/references/thesaurus/json/${encodeURIComponent(word)}?key=${key}`;
    const dictUrl = `https://dictionaryapi.com/api/v3/references/collegiate/json/${encodeURIComponent(word)}?key=${key}`;

    const [thesRes, dictRes] = await Promise.all([fetch(thesUrl), fetch(dictUrl)]);

    if (!thesRes.ok) return { data: null, suggestions: [] };

    const thesJson = await thesRes.json();

    // Check if suggestions
    if (Array.isArray(thesJson) && thesJson.length > 0 && typeof thesJson[0] === 'string') {
      return { data: null, suggestions: thesJson.slice(0, 5) };
    }

    let pronunciation = "Not available";
    let origin = "Not available";

    if (dictRes.ok) {
      try {
        const dictJson = await dictRes.json();
        if (!Array.isArray(dictJson) || (dictJson.length > 0 && typeof dictJson[0] !== 'string')) {
          pronunciation = parsePronunciation(dictJson);
          origin = parseOrigin(dictJson);
        }
      } catch {}
    }

    return {
      data: {
        definitions: parseDefinitions(thesJson),
        synonyms: parseSynonyms(thesJson),
        pronunciation,
        origin
      },
      suggestions: []
    };
  } catch (e) {
    console.warn("Merriam-Webster API failed:", e.message);
    return { data: null, suggestions: [] };
  }
}

async function fetchFromWiktionary(word: string): Promise<{ pronunciation: string, examples: string[] }> {
  let pronunciation = "Not available";
  let examples: string[] = [];

  try {
    const [htmlRes, defRes] = await Promise.all([
      fetch(`https://en.wiktionary.org/api/rest_v1/page/html/${encodeURIComponent(word)}`),
      fetch(`https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word)}`)
    ]);

    if (htmlRes.ok) {
      const html = await htmlRes.text();
      pronunciation = parsePronunciationWikt(html);
    }

    if (defRes.ok) {
      const defJson = await defRes.json();
      examples = parseExamplesWikt(defJson);
    }
  } catch (e) {
    console.warn("Wiktionary API failed:", e.message);
  }

  return { pronunciation, examples };
}

async function fetchWordData(word: string): Promise<WordData> {
  // Put your Merriam-Webster API key here
  const key = "YOUR_API_KEY";

  // Parallel fetch
  const [mwResult, wiktResult] = await Promise.allSettled([
    fetchFromMerriamWebster(word, key),
    fetchFromWiktionary(word)
  ]);

  const mw = mwResult.status === 'fulfilled' ? mwResult.value : { data: null, suggestions: [] };
  const wiktData = wiktResult.status === 'fulfilled' ? wiktResult.value : { pronunciation: "Not available", examples: [] };

  // If no data from either, show word doesn't exist with suggestions
  if (!mw.data && wiktData.pronunciation === "Not available" && wiktData.examples.length === 0) {
    if (mw.suggestions.length > 0) {
      console.log(`The word "${word}" doesn't exist. Did you mean: ${mw.suggestions.join(', ')}?`);
    } else {
      console.log(`The word "${word}" doesn't exist and no suggestions available.`);
    }
    return {
      word,
      definitions: [],
      pronunciation: "Not available",
      synonyms: [],
      origin: "Not available",
      examples: []
    };
  }

  // If Merriam-Webster has suggestions but no data, show suggestions
  if (!mw.data && mw.suggestions.length > 0) {
    console.log(`Word not found. Suggestions: ${mw.suggestions.join(', ')}`);
  } else if (!mw.data) {
    console.log("⚠️  Merriam-Webster failed. Using Wiktionary data only.");
  }

  return {
    word,
    definitions: mw.data?.definitions || [],
    pronunciation: mw.data?.pronunciation === "Not available" ? wiktData.pronunciation : (mw.data?.pronunciation || wiktData.pronunciation),
    synonyms: mw.data?.synonyms || [],
    origin: mw.data?.origin || "Not available",
    examples: wiktData.examples
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
