import { inspect } from "node:util";
import { create, diff, formatters } from "jsondiffpatch";

const di = create({
  objectHash: (obj) => {
    return Object.entries(obj)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .join(",");
  },
});

const d = di.diff(
  {
    name: "joe",
    things: {
      hello: 1,
    },
    yep: [
      [1, 2],
      {
        date: "1990-10-10",
        joe: true,
      },
      {
        date: "1990-10-11",
        joe: true,
      },
      {
        date: "1990-10-12",
        joe: true,
      },
      {
        date: "1990-10-10",
        joe: true,
      },
    ],
  },
  {
    name: "joe",
    things: {
      hello: 1,
    },
    yep: [
      [1, {}],
      {
        date: "1990-10-10",
        joe: true,
      },
      {
        date: "1990-10-11",
        joe: true,
      },
      {
        date: "1990-10-12",
        joe: true,
      },
      {
        joe: true,
        date: "1990-10-10",
      },
    ],
  },
);

if (!d) {
  console.log("the same.");
  process.exit(0);
}

console.log(inspect(d, false, Infinity, true));
// rfc6902
console.log(inspect(formatters.jsonpatch.format(d), false, Infinity, true));
console.log(inspect(formatters.jsonpatch.format({}), false, Infinity, true));
