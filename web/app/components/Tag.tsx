import { XMarkIcon } from '@heroicons/react/24/outline';

// Copied from https://stackoverflow.com/a/16348977
const stringToColor = (str: string) => {
  let hash = 0;
  str.split('').forEach((char) => {
    hash = char.charCodeAt(0) + ((hash << 5) - hash);
  });
  let colour = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff;
    colour += value.toString(16).padStart(2, '0');
  }
  return colour;
};

export const Tag = ({
  tag,
  onRemove,
}: {
  tag: string;
  onRemove?: (tag: string) => void;
}) => (
  <div
    key={tag}
    className="ml-2 badge inline-block"
    style={{
      borderColor: stringToColor(tag),
      backgroundColor: stringToColor(tag),
      mixBlendMode: 'difference',
      color: 'white',
    }}
  >
    {tag}
    {onRemove && (
      <XMarkIcon className="h-4 inline" onClick={() => onRemove(tag)} />
    )}
  </div>
);
