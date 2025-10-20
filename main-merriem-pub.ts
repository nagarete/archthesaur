interface WordData {
  word: string;
  definitions: string[];
  pronunciation: string;
  synonyms: string[];
  origin: string;
  examples: string[];
}

async function main() {
  console.log("Welcome to the Merriam-Webster Thesaurus!");
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
  // Put your Merriam-Webster API key here
  const key = "YOUR_API_KEY_HERE";
  const dictUrl = `https://dictionaryapi.com/api/v3/references/collegiate/json/${encodeURIComponent(word)}?key=${key}`;
  const thesUrl = `https://dictionaryapi.com/api/v3/references/thesaurus/json/${encodeURIComponent(word)}?key=${key}`;

  const thesRes = await fetch(thesUrl);

  if (!thesRes.ok) {
    const text = await thesRes.text();
    console.log("Thes response:", text);
    throw new Error("Failed to fetch thesaurus data");
  }

  const thesJson = await thesRes.json();

  // Check if suggestions
  if (Array.isArray(thesJson) && thesJson.length > 0 && typeof thesJson[0] === 'string') {
    throw new Error(`Word not found. Suggestions: ${thesJson.slice(0, 5).join(', ')}`);
  }

  let dictJson: any = null;
  try {
    const dictRes = await fetch(dictUrl);
    if (dictRes.ok) {
      const text = await dictRes.text();
      try {
        dictJson = JSON.parse(text);
        if (Array.isArray(dictJson) && dictJson.length > 0 && typeof dictJson[0] === 'string') {
          dictJson = null;
        }
      } catch {}
    }
  } catch {}

  return {
    word,
    definitions: parseDefinitions(thesJson),
    pronunciation: dictJson ? parsePronunciation(dictJson) : "Not available",
    synonyms: parseSynonyms(thesJson),
    origin: dictJson ? parseOrigin(dictJson) : "Not available",
    examples: [] // Merriam-Webster free API doesn't provide examples
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