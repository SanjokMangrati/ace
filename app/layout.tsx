import { Geist_Mono, Onest, Parkinsans } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

const onest = Onest({ subsets: ["latin"], variable: "--font-onest" })

const parkinsans = Parkinsans({
  subsets: ["latin"],
  variable: "--font-parkinsans",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
  adjustFontFallback: false,
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
})

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(onest.variable, parkinsans.variable, geistMono.variable)}
    >
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
