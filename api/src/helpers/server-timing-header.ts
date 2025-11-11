export const serverTiming = (
  entries: Array<{ name: string; dur: number | string; desc?: string }>,
) => {
  return {
    "server-timing": entries
      .map(({ name, desc, dur }) => {
        let value = `${name};dur=${dur}`;
        if (desc) {
          value += `;desc=${desc}`;
        }
        return value;
      })
      .join(", "),
  };
};
