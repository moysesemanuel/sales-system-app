import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureSalesSystemSeedData } from "@/lib/sales-system";

const SALES_MOVEMENT_IN = "IN";

type CreateSalesProductBody = {
  name?: string;
  sku?: string;
  category?: string;
  description?: string;
  priceInCents?: number;
  costInCents?: number;
  stockQuantity?: number;
  minimumStock?: number;
};

export async function GET(request: NextRequest) {
  try {
    await ensureSalesSystemSeedData();

    const search = request.nextUrl.searchParams.get("search")?.trim();
    const products = await prisma.salesProduct.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search } },
              { sku: { contains: search } },
              { category: { contains: search } },
            ],
          }
        : undefined,
      orderBy: [{ active: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ products });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Não foi possível carregar os produtos.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateSalesProductBody;
    const name = body.name?.trim();
    const sku = body.sku?.trim().toUpperCase();
    const category = body.category?.trim();
    const priceInCents = Number(body.priceInCents);
    const costInCents = Number(body.costInCents);
    const stockQuantity = Math.max(0, Number(body.stockQuantity ?? 0));
    const minimumStock = Math.max(0, Number(body.minimumStock ?? 0));

    if (!name || !sku || !category || !Number.isFinite(priceInCents) || !Number.isFinite(costInCents)) {
      return NextResponse.json(
        { error: "Nome, SKU, categoria, preco e custo sao obrigatorios." },
        { status: 400 },
      );
    }

    const product = await prisma.salesProduct.create({
      data: {
        name,
        sku,
        category,
        description: body.description?.trim() || null,
        priceInCents,
        costInCents,
        stockQuantity,
        minimumStock,
      },
    });

    if (stockQuantity > 0) {
      await prisma.salesStockMovement.create({
        data: {
          productId: product.id,
          type: SALES_MOVEMENT_IN,
          quantity: stockQuantity,
          reason: "Cadastro inicial do produto",
        },
      });
    }

    return NextResponse.json({ product });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Não foi possível criar o produto.",
      },
      { status: 400 },
    );
  }
}
