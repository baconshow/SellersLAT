import { ThemeHandler } from "@/components/ThemeHandler";

export default async function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="min-h-screen" style={{ background: '#050508' }}>
      <ThemeHandler primaryColor="#00D4AA" secondaryColor="#8B5CF6" />
      {children}
    </div>
  );
}
