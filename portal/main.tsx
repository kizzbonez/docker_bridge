// Entry of the public bundle: sign-in and first-time setup. It is built
// separately (vite.portal.config.ts) so that nothing from the protected
// dashboard has to be reachable before authentication.
import { mount } from '@/app/mount';
import { PortalApp } from '@/features/auth/ui/portal-app';

mount(<PortalApp />);
