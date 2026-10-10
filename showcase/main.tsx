// Entry of the showcase bundle: the simulated walkthrough. It is built
// separately (vite.showcase.config.ts), like the sign-in portal, so that it
// can be served to visitors without a session while nothing of the console,
// the docs or the account page is reachable.
import { mount } from '@/app/mount';
import { ShowcaseApp } from '@/app/showcase-app';

mount(<ShowcaseApp />);
