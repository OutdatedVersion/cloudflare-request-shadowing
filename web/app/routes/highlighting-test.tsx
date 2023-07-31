import { type ReactElement, cloneElement } from 'react';
import {
  PrismAsyncLight as SyntaxHighlighter,
  createElement,
} from 'react-syntax-highlighter';
import jsonPrismLang from 'react-syntax-highlighter/dist/esm/languages/prism/json';

import prismStyle from 'react-syntax-highlighter/dist/esm/styles/prism/prism';

SyntaxHighlighter.registerLanguage('json', jsonPrismLang);

export default function Idk() {
  return (
    <>
      <SyntaxHighlighter
        language="json"
        style={prismStyle}
        className="max-w-lg m-10"
        showLineNumbers={true}
        renderer={({ rows, stylesheet, useInlineStyles }) => {
          console.log(rows);
          return rows.flatMap((node, i) => {
            const elem = createElement({
              node,
              stylesheet,
              useInlineStyles,
              key: `code-segement${i}`,
            }) as ReactElement;

            if (i === 1) {
              return [
                cloneElement(elem, {
                  className: 'bg-red-200',
                }),
                cloneElement(elem, {
                  className: 'bg-green-200',
                }),
              ];
            }

            if (i === 2) {
              return [
                cloneElement(elem, {
                  className: 'bg-green-200',
                }),
              ];
            }

            return elem;
          });
        }}
        wrapLines={true}
      >
        {JSON.stringify(
          {
            name: 'Joe',
            age: 103,
            things: [
              {
                date: new Date().toISOString(),
                got: 23,
              },
              {
                date: new Date().toISOString(),
                got: 123182389123,
              },
              {
                date: new Date().toISOString(),
                got: 13874786099856,
              },
            ],
            yep: {
              oh: 'yeah',
              things: {
                that: {
                  go: {
                    a: {
                      bit: {
                        laterally: {
                          mhm: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          null,
          2,
        )}
      </SyntaxHighlighter>
    </>
  );
}
