import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

interface WordData {
  word: string;
  definitions: string[];
  pronunciation: string;
  synonyms: string[];
  origin: string;
  examples: string[];
}

async function main() {
  console.log("Welcome to the Wiktionary Thesaurus!");
  console.log("Enter words to get definitions, pronunciation, synonyms, origin, and examples.");
  console.log("Type 'exit' or press Enter to quit.\n");

  while (true) {
    const input = prompt("Enter a word: ");
    if (!input || input.toLowerCase() === 'exit') {
      console.log("Goodbye!");
      break;
    }

    try {
      const data = await fetchWordData(input.trim());
      displayWordData(data);
    } catch (error) {
      console.error(`Error fetching data for "${input}": ${error.message}`);
    }
    console.log("\n" + "=".repeat(50) + "\n");
  }
}

async function fetchWordData(word: string): Promise<WordData> {
  const [defRes, htmlRes, thesRes] = await Promise.all([
    fetch(`https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word)}`),
    fetch(`https://en.wiktionary.org/api/rest_v1/page/html/${encodeURIComponent(word)}`),
    fetch(`https://en.wiktionary.org/api/rest_v1/page/html/Thesaurus:${encodeURIComponent(word)}`)
  ]);

  if (!defRes.ok) throw new Error("Word not found or no definitions available");
  if (!htmlRes.ok) throw new Error("Failed to fetch page HTML");
  if (!thesRes.ok) throw new Error("Failed to fetch thesaurus HTML");

  const defJson = await defRes.json();
  const html = await htmlRes.text();
  const thesHtml = await thesRes.text();

  const synonyms = parseSynonyms(thesHtml);
  const synonymsMain = parseSynonymsFromMain(html);
  return {
    word,
    definitions: parseDefinitions(defJson),
    pronunciation: parsePronunciation(html),
    synonyms: synonyms.length > 0 ? synonyms : synonymsMain,
    origin: parseOrigin(html),
    examples: parseExamples(defJson)
  };
}

function parseDefinitions(json: any): string[] {
  const english = json.en;
  if (!english) return [];
  const defs: string[] = [];
  for (const entry of english) {
    if (entry.language === "English" && entry.definitions) {
      for (const def of entry.definitions) {
        defs.push(cleanHtml(def.definition));
      }
    }
  }
  return defs.slice(0, 3); // Limit to first 3
}

function parsePronunciation(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const pronSection = findSectionByHeading(doc, "Pronunciation");
  if (!pronSection) return "Not available";

  const ipaElements = pronSection.querySelectorAll("span.IPA");
  const ipas = Array.from(ipaElements).map(el => el.textContent?.trim()).filter(Boolean);
  return ipas.length > 0 ? ipas[0]! : "Not available";
}

function parseSynonyms(html: string): string[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const headings = doc.querySelectorAll("h2, h3, h4, h5");
  let synHeading: Element | null = null;
  for (const h of headings) {
    if (h.textContent?.trim().toLowerCase() === "synonyms") {
      synHeading = h;
      break;
    }
  }
  if (!synHeading) return [];

  // Find the next ul
  let element = synHeading.nextElementSibling;
  while (element && element.tagName !== 'UL') {
    element = element.nextElementSibling;
  }
  if (!element) return [];

  const links = element.querySelectorAll("a");
  const synonyms: string[] = [];
  for (const link of links) {
    const text = link.textContent?.trim();
    if (text && text.length > 1 && !text.includes(' ') && !text.includes('⇒') && !text.includes(':')) {
      synonyms.push(text);
    }
  }
  return synonyms.slice(0, 10);
}

function parseSynonymsFromMain(html: string): string[] {
  return parseSynonyms(html); // Same logic
}

function parseOrigin(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const etymSection = findSectionByHeading(doc, "Etymology");
  if (!etymSection) return "Not available";

  const paragraphs = etymSection.querySelectorAll("p");
  if (paragraphs.length > 0) {
    return cleanHtml(paragraphs[0].innerHTML).split('.')[0] + '.';
  }
  return "Not available";
}

function parseExamples(json: any): string[] {
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

function findSectionByHeading(doc: any, headingText: string): Element | null {
  const headings = doc.querySelectorAll("h2, h3, h4");
  for (const heading of headings) {
    if (heading.textContent?.trim().toLowerCase().includes(headingText.toLowerCase())) {
      return heading.parentElement; // Assuming section is parent
    }
  }
  return null;
}

function cleanHtml(html: string): string {
  // Simple HTML cleaning
  return html.replace(/<[^>]*>/g, '').trim();
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