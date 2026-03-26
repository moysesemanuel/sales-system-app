import { NextResponse } from "next/server";
import { getSalesDashboardData } from "@/lib/sales-system";

export async function GET() {
  try {
    const data = await getSalesDashboardData();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível carregar o dashboard do sistema de vendas.",
      },
      { status: 500 },
    );
  }
}
