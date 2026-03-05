
import { ProjectSidebar } from "@/components/ProjectSidebar";
import { ThemeHandler } from "@/components/ThemeHandler";

// In a real app, you would fetch project colors from Firestore here
// For now, we use Bombril's theme as a default mock for the project ID
const MOCK_PROJECT_THEME = {
  primary: "#FF0000",
  secondary: "#AA0000"
};

export default function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  return (
    <div className="flex min-h-screen bg-black text-white selection:bg-primary/20">
      <ThemeHandler 
        primaryColor={MOCK_PROJECT_THEME.primary} 
        secondaryColor={MOCK_PROJECT_THEME.secondary} 
      />
      <ProjectSidebar clientId={params.id} />
      <div className="flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
}
