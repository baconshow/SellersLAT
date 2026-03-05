import Sidebar from "@/components/layout/Sidebar";
import { ThemeHandler } from "@/components/ThemeHandler";

const MOCK_PROJECT_THEME = {
  primary: "#00D4AA",
  secondary: "#8B5CF6"
};

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="flex min-h-screen bg-black text-white selection:bg-primary/20">
      <ThemeHandler 
        primaryColor={MOCK_PROJECT_THEME.primary} 
        secondaryColor={MOCK_PROJECT_THEME.secondary} 
      />
      <Sidebar projectId={id} />
      <div className="flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
}
