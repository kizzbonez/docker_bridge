# Third-party notices

DockerBridge MCP is released under the MIT License (see [LICENSE](LICENSE)). That licence covers the code in this
repository. It does not cover the third-party components below, which keep their own licences.

The MCP server (`bridge/`), the sign-in service (`auth/`) and the console service (`console/`) have no dependencies:
they use only what ships with Node.js.

## Shipped in the built site

These are bundled into the files the site serves (`dist/`, and the `dashboard` container image).

| Component | Licence | Copyright |
|---|---|---|
| [React](https://github.com/facebook/react) and React DOM | MIT | Copyright (c) Meta Platforms, Inc. and affiliates |
| [uqr](https://github.com/unjs/uqr) (QR code for authenticator enrolment) | MIT | Copyright (c) Project Nayuki; Copyright (c) 2023 Anthony Fu |
| [Tailwind CSS](https://github.com/tailwindlabs/tailwindcss) (generated styles) | MIT | Copyright (c) Tailwind Labs, Inc. |
| [Oxanium](https://github.com/sevmeyer/oxanium) (font) | SIL Open Font License 1.1 | Copyright 2019 The Oxanium Project Authors |
| [Instrument Sans](https://github.com/Instrument/instrument-sans) (font) | SIL Open Font License 1.1 | Copyright 2022 The Instrument Sans Project Authors |
| [JetBrains Mono](https://github.com/JetBrains/JetBrainsMono) (font) | SIL Open Font License 1.1 | Copyright 2020 The JetBrains Mono Project Authors |

The fonts are packaged by [Fontsource](https://fontsource.org). Under the Open Font License they may be bundled and
redistributed with software, but not sold by themselves, and they stay under that licence whatever licence the
software around them carries. The full text is at <https://openfontlicense.org> and in each
`node_modules/@fontsource-variable/*/LICENSE` after `npm install`.

## Used to build and test, not shipped

Vite, TypeScript, Vitest, Playwright, ESLint and their dependencies are development tools. They are installed by
`npm install` and are not part of the site or the services. At the time of writing every package in the lockfile
carries a permissive or weak-copyleft licence: MIT, Apache-2.0, ISC, BSD, MPL-2.0, BlueOak-1.0.0, 0BSD or a
Creative Commons public-domain or attribution licence. Each one's terms are in its folder under `node_modules/`.

## Base images

The container images are built on the official `node` (Alpine) and `nginxinc/nginx-unprivileged` images, which carry
the licences of Node.js, nginx, Alpine Linux and the packages they include.
