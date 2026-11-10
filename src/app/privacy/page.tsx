import Link from 'next/link';
import { LEGAL_UPDATED, SUPPORT_EMAIL } from '@/lib/legal/site-info';

export const metadata = {
  title: 'Privacy Policy | Trip Planner',
  description: 'Learn how Trip Planner handles account, itinerary, and optional location information.',
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:py-16">
      <Link href="/" className="text-sm font-semibold text-blue-700 hover:underline">← Trip Planner</Link>
      <article className="mt-8 space-y-7 leading-7 text-slate-700">
        <header>
          <h1 className="text-3xl font-bold text-slate-900">Privacy Policy</h1>
          <p className="mt-2 text-sm text-slate-500">Last updated: {LEGAL_UPDATED}</p>
        </header>
        <section>
          <h2 className="text-xl font-semibold text-slate-900">Information used to provide Trip Planner</h2>
          <p className="mt-2">Trip Planner processes your account email and authentication information, trip names and dates, itinerary stops, schedules, addresses, saved map pins, trip memberships, and invitation details. Trip members can see the shared itinerary and information made available through their trip role.</p>
          <p className="mt-2">Supabase manages authentication and session information. Operational services may process IP addresses, device information, request metadata, and technical logs needed to run and protect the website.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-slate-900">Optional location information</h2>
          <p className="mt-2">If you enable location access, the navigation page reads your device position while the feature is active. It stops tracking when you stop it or the page becomes hidden. Trip Planner does not intentionally save your live GPS track to its trip database.</p>
          <p className="mt-2">When you explicitly request a route from your location, your current starting coordinates and selected stop coordinates are sent through Trip Planner&apos;s server to Geoapify for routing. The map requests tiles for the viewed area, which can reveal approximate map location and usage information to providers. Location permission can be withdrawn in your browser settings.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-slate-900">Why information is used</h2>
          <p className="mt-2">Information is used to authenticate accounts, store and share trip plans, show maps and routes, enforce collaboration permissions, prevent misuse, and maintain the service. The current application does not implement advertising or a dedicated behavioral advertising tracker.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-slate-900">Service providers and sharing</h2>
          <p className="mt-2">Trip Planner uses Supabase for authentication and database hosting, Vercel for website hosting, and Geoapify for place search, map tiles, and routing. Authentication emails are delivered through configured email infrastructure. These providers process information necessary to deliver their services, subject to their own terms and privacy practices.</p>
          <p className="mt-2">Trip information is shared with travelers who have access to the relevant trip. An invitation link should be treated as sensitive until used or revoked.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-slate-900">Cookies, security, and retention</h2>
          <p className="mt-2">Sign-in relies on session cookies. Database role permissions and access checks restrict private trip data. No online system can guarantee absolute security.</p>
          <p className="mt-2">Account and trip data remain while needed for the service and until deletion is processed, subject to shared-trip interests, legal requirements, and backup or provider retention practices. Exact operational-log and backup retention periods depend on provider configurations and should be confirmed before public launch.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-slate-900">Your choices and deletion requests</h2>
          <p className="mt-2">You can edit itinerary information according to your trip role, disable location permission, and request access, correction, or deletion of your information by contacting <a className="font-medium text-blue-700 underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p>
          <p className="mt-2">Signed-in travelers may also <Link className="font-medium text-blue-700 underline" href="/account">submit an account-deletion request</Link>. A request is recorded for manual review and does not instantly delete the account. Trips shared with other travelers may require additional handling before deletion can be completed. Legal retention exceptions may apply.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-slate-900">Updates and questions</h2>
          <p className="mt-2">This notice may be updated as features or providers change. Questions or privacy requests: <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-blue-700 underline">{SUPPORT_EMAIL}</a>.</p>
        </section>
      </article>
    </main>
  );
}
