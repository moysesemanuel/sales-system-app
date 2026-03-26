import type { Metadata } from "next";
import { ToastProvider } from "@/components/shared/toast-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Atlas ERP",
  description: "Sistema de vendas com clientes, produtos, pedidos, estoque e financeiro.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body suppressHydrationWarning>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
