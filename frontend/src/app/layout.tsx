import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";
import { Sidebar } from "@/components/layout/sidebar";

export const metadata: Metadata = {
  title: "IntelliChain | Supply Chain Risk Intelligence",
  description: "Real-time supply chain disruption monitoring and mitigation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background antialiased">
        <QueryProvider>
          <div className="relative flex min-h-screen">
            {/* Sidebar */}
            <Sidebar />

            {/* Main content */}
            <main className="flex-1 pl-64">
              <div className="relative min-h-screen">
                {/* Background grid overlay */}
                <div className="pointer-events-none fixed inset-0 grid-overlay opacity-30" />

                {/* Content */}
                <div className="relative z-10">{children}</div>
              </div>
            </main>
          </div>
        </QueryProvider>
      </body>
    </html>
  );
}
