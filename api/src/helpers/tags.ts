export interface TagParsingResult {
  tags: Record<string, string[]>;
  malformedTags: string[];
}

export const validateTag = (tag: string): boolean => {
  return /^([a-z0-9]+:[a-z0-9-]+)$/i.test(tag);
};

export const parseTags = (input: string[]): TagParsingResult => {
  const malformedTags: string[] = [];
  const tags = input
    .filter((entry) => {
      // Validate tags
      if (!validateTag(entry)) {
        malformedTags.push(entry);
        return false;
      }
      return true;
    })
    .reduce((entries, entry) => {
      const [key, value] = entry.toLowerCase().split(":");
      return {
        ...entries,
        [key]: [...(entries[key] ?? []), value],
      };
    }, {} as Record<string, string[]>);

  return {
    tags,
    malformedTags,
  };
};
