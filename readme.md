# Arch Thesaurus

Get a lightning-fast thesaurus and dictionary for words using Wiktionary or Merriam-Webster APIs.

## Features

- Definitions
- Pronunciation (IPA)
- Synonyms
- Origin/Etymology
- Example sentences (Wiktionary version only)

## API Versions

This project offers two versions with different data sources:

### Wiktionary Version (`main-wikt-pub.ts`)

- **Pros**: No setup required - works out of the box
- **Cons**: Limited vocabulary coverage (primarily common English words)
- **Data Source**: Free, public Wiktionary API
- **Usage**: `deno run --allow-net main-wikt-pub.ts`

### Merriam-Webster Version (`main-merriem-pub.ts`)

- **Pros**: Extensive vocabulary coverage with high-quality definitions
- **Cons**: Requires API key setup (free registration)
- **Data Source**: Merriam-Webster Collegiate Dictionary and Thesaurus APIs
- **Setup**: Get a free API key at [https://dictionaryapi.com/register/index](https://dictionaryapi.com/register/index)
- **Usage**: `deno run --allow-net main-merriem-pub.ts` (after adding your API key)

## Usage

Enter words interactively in either version. Type 'exit' or press Enter to quit.

## Requirements

- Deno installed
- Internet connection for fetching data from APIs
- API key for Merriam-Webster version (optional)
