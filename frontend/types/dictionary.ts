export interface WordDefinition {
  word: string;
  phonetic: string;
  audio: string;
  meanings: {
    partOfSpeech: string;
    definitions: {
      definition: string;
      example: string | null;
    }[];
  }[];
}

