import { SupabaseProvider } from "@/lib/supabase-provider";
import { ThemeProvider } from "@/lib/theme-provider";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SupabaseProvider>
      <ThemeProvider>{children}</ThemeProvider>
    </SupabaseProvider>
  );
}
