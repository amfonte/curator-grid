import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"

// Local logo assets from /public
const LOGO_LOCKUP_SRC = "/logo/curator-logo-lockup.svg"

export default function SignUpSuccessPage() {
  return (
    <div
      id="auth-card"
      className="relative z-10 w-full max-w-[454px] flex flex-col gap-10 items-center bg-card rounded-3xl px-8 py-12 max-sm:px-5 max-sm:py-8 shadow-[0px_16px_16px_0px_rgba(0,0,0,0.05),0px_8px_8px_0px_rgba(0,0,0,0.05),0px_4px_4px_0px_rgba(0,0,0,0.05),0px_2px_2px_0px_rgba(0,0,0,0.05),0px_1px_1px_0px_rgba(0,0,0,0.05),0px_0px_0px_1px_rgba(0,0,0,0.05)]"
    >
      <div className="relative w-[100px] h-[107px] shrink-0">
        <Image
          src={LOGO_LOCKUP_SRC}
          alt="Curator"
          fill
          className="object-contain object-center"
          unoptimized
        />
      </div>
      <div className="flex flex-col gap-10 items-center w-full">
        <div className="flex flex-col gap-2 items-center w-full text-center">
          <h1 className="text-2xl leading-7 font-medium text-foreground">Check your email</h1>
          <p className="text-base leading-6 text-muted-foreground">
            We sent you a confirmation link. Click it to activate your account and start curating.
          </p>
        </div>
        <Button asChild className="w-full">
          <Link href="/auth/login">Back to sign in</Link>
        </Button>
      </div>
    </div>
  )
}
