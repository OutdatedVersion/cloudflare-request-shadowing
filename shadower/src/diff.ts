import {
  Delta,
  create,
  formatters as diffFormattersIgnore,
} from "jsondiffpatch";

// https://datatracker.ietf.org/doc/html/rfc6902#section-3
// Omitted `test` since that's not in our use-case
type JsonPatch =
  | {
      op: "remove";
      path: string;
    }
  | {
      op: "add";
      path: string;
      value: /* Json*/ unknown;
    }
  | {
      op: "copy";
      from: string;
      path: string;
    }
  | {
      op: "move";
      from: string;
      path: string;
    }
  | {
      op: "replace";
      path: string;
      value: /* Json */ unknown;
    };

const diffFormatters = diffFormattersIgnore as typeof diffFormattersIgnore & {
  jsonpatch: {
    // `Delta` is an `any` typed record so i'm
    // essentially only getting a participating trophy here
    format: (delta: Delta) => JsonPatch[];
  };
};
const diff = create({
  // `jsondiffpatch` first tries a `===` so primitives shouldn't pass through here
  // `{}` of varying depths seem ok
  // `[]`/tuples of varying depths seem ok
  objectHash: (obj: Record<string, unknown>) => {
    // JSON.stringify: this isn't a great idea.
    // while we can detect simple moves with this
    // it won't differentiate semantic moves

    // ideas:
    // - recursively call `jsondiffpatch`?
    //   - not particularly difficult to do some denial of service
    //   - oh. smooth brain. we don't have the other object to diff with.
    // - create a hash of the keys + values?
    //   - let's roll with this

    // it's not a hash.
    // but it is deterministic! :)
    return Object.entries(obj)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .join(",");
  },
});

export const calculatePatches = (a: unknown, b: unknown): JsonPatch[] => {
  const delta = diff.diff(a, b) ?? {};
  return diffFormatters.jsonpatch.format(delta);
};

export const summarizePatches = (patches: JsonPatch[]) => {
  return patches.reduce(
    (summary, patch) => {
      if (patch.op === "add") {
        summary.added += 1;
      } else if (patch.op === "remove") {
        summary.removed += 1;
      } else if (patch.op === "replace") {
        summary.added += 1;
        summary.removed += 1;
      }
      return summary;
    },
    { added: 0, removed: 0 },
  );
};
