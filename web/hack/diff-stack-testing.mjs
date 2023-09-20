// @ts-check
// Testing Prism highlighting ideas

import assert from 'node:assert';

const { rows } = {
  rows: [
    {
      type: 'element',
      tagName: 'span',
      properties: {
        className: [],
      },
      children: [
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'punctuation'],
          },
          children: [
            {
              type: 'text',
              value: '{',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '\n',
            },
          ],
        },
      ],
    },
    {
      type: 'element',
      tagName: 'span',
      properties: {
        className: [],
      },
      children: [
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '  ',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'property'],
          },
          children: [
            {
              type: 'text',
              value: '"name"',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'operator'],
          },
          children: [
            {
              type: 'text',
              value: ':',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: ' ',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'string'],
          },
          children: [
            {
              type: 'text',
              value: '"Joe"',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'punctuation'],
          },
          children: [
            {
              type: 'text',
              value: ',',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '\n',
            },
          ],
        },
      ],
    },
    {
      type: 'element',
      tagName: 'span',
      properties: {
        className: [],
      },
      children: [
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '  ',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'property'],
          },
          children: [
            {
              type: 'text',
              value: '"age"',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'operator'],
          },
          children: [
            {
              type: 'text',
              value: ':',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: ' ',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'number'],
          },
          children: [
            {
              type: 'text',
              value: '103',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'punctuation'],
          },
          children: [
            {
              type: 'text',
              value: ',',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '\n',
            },
          ],
        },
      ],
    },
    {
      type: 'element',
      tagName: 'span',
      properties: {
        className: [],
      },
      children: [
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '  ',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'property'],
          },
          children: [
            {
              type: 'text',
              value: '"things"',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'operator'],
          },
          children: [
            {
              type: 'text',
              value: ':',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: ' ',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'punctuation'],
          },
          children: [
            {
              type: 'text',
              value: '[',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '\n',
            },
          ],
        },
      ],
    },
    {
      type: 'element',
      tagName: 'span',
      properties: {
        className: [],
      },
      children: [
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '    ',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'punctuation'],
          },
          children: [
            {
              type: 'text',
              value: '{',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '\n',
            },
          ],
        },
      ],
    },
    {
      type: 'element',
      tagName: 'span',
      properties: {
        className: [],
      },
      children: [
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '      ',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'property'],
          },
          children: [
            {
              type: 'text',
              value: '"date"',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'operator'],
          },
          children: [
            {
              type: 'text',
              value: ':',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: ' ',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'string'],
          },
          children: [
            {
              type: 'text',
              value: '"2023-07-30T05:36:48.215Z"',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'punctuation'],
          },
          children: [
            {
              type: 'text',
              value: ',',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '\n',
            },
          ],
        },
      ],
    },
    {
      type: 'element',
      tagName: 'span',
      properties: {
        className: [],
      },
      children: [
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '      ',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'property'],
          },
          children: [
            {
              type: 'text',
              value: '"got"',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'operator'],
          },
          children: [
            {
              type: 'text',
              value: ':',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: ' ',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'number'],
          },
          children: [
            {
              type: 'text',
              value: '23',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '\n',
            },
          ],
        },
      ],
    },
    {
      type: 'element',
      tagName: 'span',
      properties: {
        className: [],
      },
      children: [
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '    ',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'punctuation'],
          },
          children: [
            {
              type: 'text',
              value: '}',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'punctuation'],
          },
          children: [
            {
              type: 'text',
              value: ',',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '\n',
            },
          ],
        },
      ],
    },
    {
      type: 'element',
      tagName: 'span',
      properties: {
        className: [],
      },
      children: [
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '    ',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'punctuation'],
          },
          children: [
            {
              type: 'text',
              value: '{',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '\n',
            },
          ],
        },
      ],
    },
    {
      type: 'element',
      tagName: 'span',
      properties: {
        className: [],
      },
      children: [
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '      ',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'property'],
          },
          children: [
            {
              type: 'text',
              value: '"date"',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'operator'],
          },
          children: [
            {
              type: 'text',
              value: ':',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: ' ',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'string'],
          },
          children: [
            {
              type: 'text',
              value: '"2023-07-30T05:36:48.215Z"',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'punctuation'],
          },
          children: [
            {
              type: 'text',
              value: ',',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '\n',
            },
          ],
        },
      ],
    },
    {
      type: 'element',
      tagName: 'span',
      properties: {
        className: [],
      },
      children: [
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '      ',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'property'],
          },
          children: [
            {
              type: 'text',
              value: '"got"',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'operator'],
          },
          children: [
            {
              type: 'text',
              value: ':',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: ' ',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'number'],
          },
          children: [
            {
              type: 'text',
              value: '123182389123',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '\n',
            },
          ],
        },
      ],
    },
    {
      type: 'element',
      tagName: 'span',
      properties: {
        className: [],
      },
      children: [
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '    ',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'punctuation'],
          },
          children: [
            {
              type: 'text',
              value: '}',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'punctuation'],
          },
          children: [
            {
              type: 'text',
              value: ',',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '\n',
            },
          ],
        },
      ],
    },
    {
      type: 'element',
      tagName: 'span',
      properties: {
        className: [],
      },
      children: [
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '    ',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'punctuation'],
          },
          children: [
            {
              type: 'text',
              value: '{',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '\n',
            },
          ],
        },
      ],
    },
    {
      type: 'element',
      tagName: 'span',
      properties: {
        className: [],
      },
      children: [
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '      ',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'property'],
          },
          children: [
            {
              type: 'text',
              value: '"date"',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'operator'],
          },
          children: [
            {
              type: 'text',
              value: ':',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: ' ',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'string'],
          },
          children: [
            {
              type: 'text',
              value: '"2023-07-30T05:36:48.215Z"',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'punctuation'],
          },
          children: [
            {
              type: 'text',
              value: ',',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '\n',
            },
          ],
        },
      ],
    },
    {
      type: 'element',
      tagName: 'span',
      properties: {
        className: [],
      },
      children: [
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '      ',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'property'],
          },
          children: [
            {
              type: 'text',
              value: '"got"',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'operator'],
          },
          children: [
            {
              type: 'text',
              value: ':',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: ' ',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'number'],
          },
          children: [
            {
              type: 'text',
              value: '13874786099856',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '\n',
            },
          ],
        },
      ],
    },
    {
      type: 'element',
      tagName: 'span',
      properties: {
        className: [],
      },
      children: [
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '    ',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'punctuation'],
          },
          children: [
            {
              type: 'text',
              value: '}',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '\n',
            },
          ],
        },
      ],
    },
    {
      type: 'element',
      tagName: 'span',
      properties: {
        className: [],
      },
      children: [
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '  ',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'punctuation'],
          },
          children: [
            {
              type: 'text',
              value: ']',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'punctuation'],
          },
          children: [
            {
              type: 'text',
              value: ',',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '\n',
            },
          ],
        },
      ],
    },
    {
      type: 'element',
      tagName: 'span',
      properties: {
        className: [],
      },
      children: [
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '  ',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'property'],
          },
          children: [
            {
              type: 'text',
              value: '"yep"',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'operator'],
          },
          children: [
            {
              type: 'text',
              value: ':',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: ' ',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'punctuation'],
          },
          children: [
            {
              type: 'text',
              value: '{',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '\n',
            },
          ],
        },
      ],
    },
    {
      type: 'element',
      tagName: 'span',
      properties: {
        className: [],
      },
      children: [
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '    ',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'property'],
          },
          children: [
            {
              type: 'text',
              value: '"oh"',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'operator'],
          },
          children: [
            {
              type: 'text',
              value: ':',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: ' ',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'string'],
          },
          children: [
            {
              type: 'text',
              value: '"yeah"',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'punctuation'],
          },
          children: [
            {
              type: 'text',
              value: ',',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '\n',
            },
          ],
        },
      ],
    },
    {
      type: 'element',
      tagName: 'span',
      properties: {
        className: [],
      },
      children: [
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '    ',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'property'],
          },
          children: [
            {
              type: 'text',
              value: '"things"',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'operator'],
          },
          children: [
            {
              type: 'text',
              value: ':',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: ' ',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'punctuation'],
          },
          children: [
            {
              type: 'text',
              value: '{',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '\n',
            },
          ],
        },
      ],
    },
    {
      type: 'element',
      tagName: 'span',
      properties: {
        className: [],
      },
      children: [
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '      ',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'property'],
          },
          children: [
            {
              type: 'text',
              value: '"that"',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'operator'],
          },
          children: [
            {
              type: 'text',
              value: ':',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: ' ',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'punctuation'],
          },
          children: [
            {
              type: 'text',
              value: '{',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '\n',
            },
          ],
        },
      ],
    },
    {
      type: 'element',
      tagName: 'span',
      properties: {
        className: [],
      },
      children: [
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '        ',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'property'],
          },
          children: [
            {
              type: 'text',
              value: '"go"',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'operator'],
          },
          children: [
            {
              type: 'text',
              value: ':',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: ' ',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'punctuation'],
          },
          children: [
            {
              type: 'text',
              value: '{',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '\n',
            },
          ],
        },
      ],
    },
    {
      type: 'element',
      tagName: 'span',
      properties: {
        className: [],
      },
      children: [
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '          ',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'property'],
          },
          children: [
            {
              type: 'text',
              value: '"a"',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'operator'],
          },
          children: [
            {
              type: 'text',
              value: ':',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: ' ',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'punctuation'],
          },
          children: [
            {
              type: 'text',
              value: '{',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '\n',
            },
          ],
        },
      ],
    },
    {
      type: 'element',
      tagName: 'span',
      properties: {
        className: [],
      },
      children: [
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '            ',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'property'],
          },
          children: [
            {
              type: 'text',
              value: '"bit"',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'operator'],
          },
          children: [
            {
              type: 'text',
              value: ':',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: ' ',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'punctuation'],
          },
          children: [
            {
              type: 'text',
              value: '{',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '\n',
            },
          ],
        },
      ],
    },
    {
      type: 'element',
      tagName: 'span',
      properties: {
        className: [],
      },
      children: [
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '              ',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'property'],
          },
          children: [
            {
              type: 'text',
              value: '"laterally"',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'operator'],
          },
          children: [
            {
              type: 'text',
              value: ':',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: ' ',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'punctuation'],
          },
          children: [
            {
              type: 'text',
              value: '{',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '\n',
            },
          ],
        },
      ],
    },
    {
      type: 'element',
      tagName: 'span',
      properties: {
        className: [],
      },
      children: [
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '                ',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'property'],
          },
          children: [
            {
              type: 'text',
              value: '"mhm"',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'operator'],
          },
          children: [
            {
              type: 'text',
              value: ':',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: ' ',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'boolean'],
          },
          children: [
            {
              type: 'text',
              value: 'true',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '\n',
            },
          ],
        },
      ],
    },
    {
      type: 'element',
      tagName: 'span',
      properties: {
        className: [],
      },
      children: [
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '              ',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'punctuation'],
          },
          children: [
            {
              type: 'text',
              value: '}',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '\n',
            },
          ],
        },
      ],
    },
    {
      type: 'element',
      tagName: 'span',
      properties: {
        className: [],
      },
      children: [
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '            ',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'punctuation'],
          },
          children: [
            {
              type: 'text',
              value: '}',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '\n',
            },
          ],
        },
      ],
    },
    {
      type: 'element',
      tagName: 'span',
      properties: {
        className: [],
      },
      children: [
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '          ',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'punctuation'],
          },
          children: [
            {
              type: 'text',
              value: '}',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '\n',
            },
          ],
        },
      ],
    },
    {
      type: 'element',
      tagName: 'span',
      properties: {
        className: [],
      },
      children: [
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '        ',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'punctuation'],
          },
          children: [
            {
              type: 'text',
              value: '}',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '\n',
            },
          ],
        },
      ],
    },
    {
      type: 'element',
      tagName: 'span',
      properties: {
        className: [],
      },
      children: [
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '      ',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'punctuation'],
          },
          children: [
            {
              type: 'text',
              value: '}',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '\n',
            },
          ],
        },
      ],
    },
    {
      type: 'element',
      tagName: 'span',
      properties: {
        className: [],
      },
      children: [
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '    ',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'punctuation'],
          },
          children: [
            {
              type: 'text',
              value: '}',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '\n',
            },
          ],
        },
      ],
    },
    {
      type: 'element',
      tagName: 'span',
      properties: {
        className: [],
      },
      children: [
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '  ',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'punctuation'],
          },
          children: [
            {
              type: 'text',
              value: '}',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '\n',
            },
          ],
        },
      ],
    },
    {
      type: 'element',
      tagName: 'span',
      properties: {
        className: [],
      },
      children: [
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: [],
          },
          children: [
            {
              type: 'text',
              value: '',
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['token', 'punctuation'],
          },
          children: [
            {
              type: 'text',
              value: '}',
            },
          ],
        },
      ],
    },
  ],
};

const stack = [];
const hell = [];
const arr = [];
let shouldPush = false;
for (const row of rows) {
  for (const child of row.children) {
    assert(child.children.length === 1);
    assert(
      child.children[0].children === null ||
        child.children[0].children === undefined,
    );

    // remember that punctuation and property names are usually out-of-sync by 1 since
    // stack pushes happen in the next cycle whereas pops happen instantly
    if (child.properties.className.includes('punctuation')) {
      const punc = child.children[0].value;

      if (punc === '{' || punc === '[') {
        shouldPush = true;
        hell.push(punc);
        // console.log('punc push', hell);
        // console.log('push request');
      } else if (punc === '}' || punc === ']') {
        hell.pop();
        stack.pop();
        if (punc === ']') {
          arr.pop();
        }
        console.log('stack pop', stack);
      } else if (punc === ',' && hell.length === 1) {
        stack.pop();
        shouldPush = true;
        console.log('stack pop', stack);
      }
    } else if (child.properties.className.includes('property')) {
      if (shouldPush) {
        // console.log('push do');
        let name = child.children[0].value;
        name = name.substring(1, name.length - 1);
        if (hell.at(-2) === '[') {
          // TODO: 2d arrays
          let idx = arr[0];
          if (idx === undefined) {
            arr.push(0);
            idx = 0;
          } else {
            arr[0] = idx++;
          }
          name = `${name}[${idx}]`;
        }
        stack.push(name);
        console.log('stack push', stack);
        shouldPush = false;
      }
    }

    // row[1]
    //   property
    //   operator
    //   []
    //   string
    //   punctuation ,

    // row[17]
    //  []
    //  property yep
    //  operator :
    //  []
    //  punctuation {
    //  []

    // last child of `row.children` is always a 0 properties 1 children new-line
    // formatting (new lines, whitespace) has no `properties`
  }
  // lineNum++;
}
