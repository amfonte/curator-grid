import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function RootPage() {
  const userAgent = (await headers()).get("user-agent") ?? ""
  const isSocialCrawler =
    /Twitterbot|facebookexternalhit|LinkedInBot|Slackbot|Discordbot|WhatsApp/i.test(userAgent)

  // Keep "/" crawlable for social preview bots; they often don't resolve redirects
  // the same way as validators/composer and can miss the final card metadata.
  if (isSocialCrawler) {
    return <main className="sr-only">Curator link preview page</main>
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect("/dashboard")
  } else {
    redirect("/auth/login")
  }
}
