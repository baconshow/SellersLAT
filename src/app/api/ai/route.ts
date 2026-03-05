import { NextResponse } from 'next/server';

/**
 * Placeholder para a API de IA.
 * Garante que a rota seja válida durante o build.
 */
export async function POST() {
  return NextResponse.json({ 
    message: "IA Ativa. Envie uma requisição válida para processar dados do projeto." 
  });
}

export async function GET() {
  return NextResponse.json({ message: "Sellers Pulse AI API Endpoint" });
}
