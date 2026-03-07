import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Playfair_Display, Inter, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { Providers } from "./providers"
import Header from "@/components/shared/Header"
import NetworkGuard from "@/components/shared/NetworkGuard"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
})

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
})

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "basedgames.io | Onchain Games on Base",
  description: "Play chess against AI and classic snake — all onchain on Base. Record wins, mint NFTs, and compete on the leaderboard.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&display=swap" rel="stylesheet" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} ${inter.variable} ${jetbrainsMono.variable} antialiased`}>
        <Providers>
          <Header />
          <NetworkGuard />
          {children}
        </Providers>
      </body>
    </html>
  )
}
