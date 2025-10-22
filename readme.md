# Arch Thesaurus

A lightning-fast command-line thesaurus and dictionary that combines Merriam-Webster and Wiktionary APIs for comprehensive word data.

## Features

- **Definitions**: High-quality definitions from Merriam-Webster
- **Pronunciation**: IPA pronunciation from Wiktionary
- **Synonyms**: Related words from Merriam-Webster thesaurus
- **Origin/Etymology**: Word origins from Merriam-Webster (when available)
- **Examples**: Sample sentences from Wiktionary

## Installation & Setup

1. **Install Deno**: [https://deno.land/#installation](https://deno.land/#installation)
2. **Get API Key**: Register for a free Merriam-Webster API key at [https://dictionaryapi.com/register/index](https://dictionaryapi.com/register/index)
3. **Clone/Download**: Get the `main.ts` file
4. **Add API Key**: Edit `main.ts` and replace `"YOUR_API_KEY_HERE"` with your key

## Usage

```bash
deno run --allow-net main.ts
```

Enter words one per line. Press Enter on an empty line or Ctrl+D to exit.

Example:
```
Welcome to the Hybrid Thesaurus (Merriam-Webster + Wiktionary)!
Enter words (one per line). Press Enter on empty line or Ctrl+D to exit.

hello
Word: hello
Pronunciation: /həˈləʊ/
Synonyms: greeting, salutation, salute, welcome
Origin: Not available
Examples:
  - Hello, everyone.
Definitions:
  1. an expression of goodwill upon meeting

apple
[results for apple...]
```

## How It Works

- **Primary Data**: Definitions, synonyms, and etymology from Merriam-Webster's APIs
- **Fallback Data**: Pronunciation and examples from Wiktionary when Merriam-Webster doesn't provide them
- **Async Processing**: Handles input asynchronously for smooth CLI experience

## Requirements

- Deno runtime
- Internet connection
- Free Merriam-Webster API key

## License

This project uses free APIs from Merriam-Webster and Wiktionary. Please respect their terms of service.
