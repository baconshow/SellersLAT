import { ThemeHandler } from "@/components/ThemeHandler";
import ProjectLayoutClient from "./ProjectLayoutClient";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <>
      <ThemeHandler primaryColor="#00D4AA" secondaryColor="#8B5CF6" />
      <ProjectLayoutClient projectId={id}>
        {children}
      </ProjectLayoutClient>
    </>
  );
}
