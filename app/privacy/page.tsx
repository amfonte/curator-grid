import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Privacy Policy — Curator",
  description:
    "How the Curator web app and browser extension collect, use, and store your data.",
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <article className="mx-auto w-full max-w-[640px]">
        <header className="mb-10 flex flex-col gap-4">
          <Link
            href="/auth/login"
            className="text-sm text-muted-foreground link-wavy-underline w-fit"
          >
            Back to Curator
          </Link>
          <h1 className="text-3xl font-medium tracking-tight text-foreground">
            Privacy Policy
          </h1>
          <p className="text-sm text-muted-foreground">Last updated: June 25, 2026</p>
        </header>

        <div className="flex flex-col gap-8 text-base leading-7 text-foreground">
          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-medium">Overview</h2>
            <p>
              Curator is a personal inspiration board. This policy describes how the Curator web
              app and Chrome browser extension handle your information. We do not sell your data or
              use it for advertising.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-medium">What we collect</h2>
            <p>
              <strong>Account information.</strong> When you sign up or sign in, we store your
              email and authentication credentials through Supabase Auth.
            </p>
            <p>
              <strong>Content you save.</strong> URLs, images, titles, notes, collection names,
              and related metadata you add to your boards are stored in your private account.
            </p>
            <p>
              <strong>Extension usage (browser extension only).</strong> When you use the Curator
              extension, it may read:
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>The active tab&apos;s URL and title when you open the save panel</li>
              <li>
                Image URLs you explicitly select on a page (not all images or page content)
              </li>
              <li>
                Your Curator sign-in session, stored locally in the extension to keep you signed in
              </li>
            </ul>
            <p>
              The extension does <strong>not</strong> collect your general browsing history or
              monitor pages in the background. It only accesses page data when you click the
              extension icon and interact with the save panel.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-medium">What we send to our servers</h2>
            <p>When you save from the extension, Curator sends only what is needed to complete the save:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>URL, viewport size, and chosen collection (URL saves)</li>
              <li>Downloaded image data for images you selected (image saves)</li>
              <li>Your authentication token to verify your identity</li>
            </ul>
            <p>
              URL metadata (title, description, favicon) may be fetched from the saved URL to
              enrich your item preview.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-medium">Where data is stored</h2>
            <p>
              Account data, saved items, and uploaded images are stored in Supabase (database and
              object storage), protected by row-level security so only you can access your content.
            </p>
            <p>
              The extension stores your auth session and cached collection list locally in Chrome
              extension storage on your device.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-medium">Permissions (browser extension)</h2>
            <p>The Curator extension requests broad site access so it can:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Inject the save panel on pages you visit when you click the extension icon</li>
              <li>Let you select images on any site you are saving from</li>
              <li>Download selected image URLs from third-party hosts (CDNs)</li>
            </ul>
            <p>
              We use this access only when you actively use the extension. It is not used for
              passive tracking.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-medium">Third-party services</h2>
            <p>
              Curator uses Supabase for authentication, database, and file storage. When you save a
              URL, we may fetch public metadata from that URL&apos;s server. No other third parties
              receive your saved content.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-medium">Your choices</h2>
            <ul className="list-disc space-y-2 pl-6">
              <li>Sign out in the Curator web app to invalidate your extension session</li>
              <li>Remove or uninstall the extension to clear local extension storage</li>
              <li>Delete items and collections in the web app at any time</li>
            </ul>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-medium">Changes</h2>
            <p>
              We may update this policy as the product evolves. The &quot;Last updated&quot; date
              at the top will reflect the latest version.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-medium">Contact</h2>
            <p>
              Questions about this policy or your data can be sent through the contact method listed
              on your Curator account or product website.
            </p>
          </section>
        </div>
      </article>
    </main>
  )
}
