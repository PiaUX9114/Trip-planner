import Link from 'next/link';
import { LEGAL_UPDATED, SUPPORT_EMAIL } from '@/lib/legal/site-info';

export const metadata = {
  title: 'Terms of Service | Trip Planner',
  description: 'Conditions for using Trip Planner and its shared travel-planning tools.',
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:py-16">
      <Link href="/" className="text-sm font-semibold text-blue-700 hover:underline">← Trip Planner</Link>
      <article className="mt-8 space-y-7 leading-7 text-slate-700">
        <header>
          <h1 className="text-3xl font-bold text-slate-900">Terms of Service</h1>
          <p className="mt-2 text-sm text-slate-500">Last updated: {LEGAL_UPDATED}</p>
        </header>
        <section>
          <h2 className="text-xl font-semibold text-slate-900">Using Trip Planner</h2>
          <p className="mt-2">Trip Planner helps you organize travel itineraries, invite collaborators, view maps, and request driving directions. Keep your account credentials secure and provide accurate information when creating your account and trip plans.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-slate-900">Shared trips and permissions</h2>
          <p className="mt-2">Trip Owners control invitations and member roles. Editors may modify shared itinerary information, and Viewers have read-only access. Do not invite others or upload information unless you have permission to share it. Other members may rely on or change shared plans according to their roles.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-slate-900">Maps and travel safety</h2>
          <p className="mt-2">Maps, addresses, travel times, and directions are estimates from third-party services and may be wrong, incomplete, delayed, or unavailable. Trip Planner is not an emergency service, autonomous-driving system, or substitute for official signs, road conditions, local regulations, or attentive driving. Do not interact with the app while operating a vehicle.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-slate-900">Fair use and availability</h2>
          <p className="mt-2">Do not attempt to access other travelers&apos; private information, circumvent permissions, overload mapping services, automate abusive requests, or interfere with the service. Features may be rate-limited, changed, or unavailable due to technical or provider limitations.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-slate-900">Your content and account</h2>
          <p className="mt-2">You are responsible for the accuracy and legality of the information you add. Sharing a trip makes its contents available to authorized collaborators. You may request account deletion from the <Link href="/account" className="font-medium text-blue-700 underline">Account page</Link> or through the support contact. Deleting a user account may require resolving owned trips and invitation records first to avoid unexpected loss of other travelers&apos; plans.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-slate-900">Disclaimers and changes</h2>
          <p className="mt-2">The service is provided on an as-available basis. To the extent permitted by applicable law, Trip Planner does not guarantee continuous access, route accuracy, or suitability for any particular trip. Nothing in these terms excludes rights or protections that cannot legally be waived. Service functionality and these terms may change; material changes should be communicated appropriately.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-slate-900">Contact</h2>
          <p className="mt-2">For support or questions about these terms, email <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-blue-700 underline">{SUPPORT_EMAIL}</a>. See the <Link href="/privacy" className="font-medium text-blue-700 underline">Privacy Policy</Link> for data-handling information.</p>
        </section>
      </article>
    </main>
  );
}
