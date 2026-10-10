import type { Metadata } from "next";


export const metadata: Metadata = {
  title: "Short Links",
  description: "Link shortener with click analytics",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}