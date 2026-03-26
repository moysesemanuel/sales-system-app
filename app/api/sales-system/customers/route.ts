import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureSalesSystemSeedData } from "@/lib/sales-system";

type CreateSalesCustomerBody = {
  name?: string;
  email?: string;
  phone?: string;
  document?: string;
  city?: string;
  state?: string;
  notes?: string;
};

export async function GET(request: NextRequest) {
  try {
    await ensureSalesSystemSeedData();

    const search = request.nextUrl.searchParams.get("search")?.trim();
    const customers = await prisma.salesCustomer.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search } },
              { email: { contains: search } },
              { document: { contains: search } },
            ],
          }
        : undefined,
      include: {
        orders: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      customers: customers.map((customer) => ({
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        document: customer.document,
        city: customer.city,
        state: customer.state,
        notes: customer.notes,
        ordersCount: customer.orders.length,
        totalRevenueInCents: customer.orders.reduce((sum, order) => sum + order.totalInCents, 0),
        createdAt: customer.createdAt,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível carregar os clientes do sistema de vendas.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateSalesCustomerBody;
    const name = body.name?.trim();
    const email = body.email?.trim() || null;
    const phone = body.phone?.trim() || null;
    const document = body.document?.trim() || null;

    if (!name) {
      return NextResponse.json({ error: "Nome do cliente e obrigatorio." }, { status: 400 });
    }

    const customer = await prisma.salesCustomer.create({
      data: {
        name,
        email,
        phone,
        document,
        city: body.city?.trim() || null,
        state: body.state?.trim() || null,
        notes: body.notes?.trim() || null,
      },
    });

    return NextResponse.json({ customer });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Não foi possível criar o cliente.",
      },
      { status: 400 },
    );
  }
}
