
export default function ProjectPage({ params }: { params: { id: string } }) {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">Projeto: {params.id}</h1>
      <p>Conteúdo em breve: Tabs (Dashboard, Gantt, Apresentação, Chat AI).</p>
    </div>
  );
}
