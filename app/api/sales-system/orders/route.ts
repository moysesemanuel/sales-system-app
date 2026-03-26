import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureSalesSystemSeedData } from "@/lib/sales-system";

const SALES_MOVEMENT_OUT = "OUT";
const SALES_ORDER_STATUS_PAID = "PAID";

type CreateSalesOrderBody = {
  customerId?: string;
  notes?: string;
  items?: Array<{
    productId?: string;
    quantity?: number;
  }>;
};

export async function GET() {
  try {
    await ensureSalesSystemSeedData();

    const orders = await prisma.salesOrder.findMany({
      include: {
        items: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      orders: orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        customerId: order.customerId,
        customerName: order.customerName,
        subtotalInCents: order.subtotalInCents,
        totalInCents: order.totalInCents,
        status: order.status,
        notes: order.notes,
        createdAt: order.createdAt,
        items: order.items,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Não foi possível carregar as vendas.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureSalesSystemSeedData();

    const body = (await request.json()) as CreateSalesOrderBody;
    const customerId = body.customerId?.trim();
    const items = body.items?.filter((item) => item.productId && Number(item.quantity) > 0) ?? [];

    if (!customerId || items.length === 0) {
      return NextResponse.json(
        { error: "Selecione um cliente e pelo menos um item para registrar a venda." },
        { status: 400 },
      );
    }

    const customer = await prisma.salesCustomer.findUnique({ where: { id: customerId } });

    if (!customer) {
      return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
    }

    const productIds = items.map((item) => item.productId!);
    const products = await prisma.salesProduct.findMany({
      where: {
        id: { in: productIds },
        active: true,
      },
    });

    if (products.length !== productIds.length) {
      return NextResponse.json(
        { error: "Um ou mais produtos não foram encontrados ou estão inativos." },
        { status: 400 },
      );
    }

    const productMap = new Map(products.map((product) => [product.id, product]));
    const normalizedItems = items.map((item) => {
      const product = productMap.get(item.productId!);

      if (!product) {
        throw new Error("Produto não encontrado.");
      }

      const quantity = Math.floor(Number(item.quantity));

      if (product.stockQuantity < quantity) {
        throw new Error(`Estoque insuficiente para ${product.name}.`);
      }

      return {
        product,
        quantity,
        totalPriceInCents: product.priceInCents * quantity,
      };
    });

    const subtotalInCents = normalizedItems.reduce((sum, item) => sum + item.totalPriceInCents, 0);

    const order = await prisma.$transaction(async (tx) => {
      const lastOrder = await tx.salesOrder.aggregate({
        _max: {
          orderNumber: true,
        },
      });
      const orderNumber = (lastOrder._max.orderNumber ?? 1000) + 1;
      const createdOrder = await tx.salesOrder.create({
        data: {
          orderNumber,
          customerId: customer.id,
          customerName: customer.name,
          subtotalInCents,
          totalInCents: subtotalInCents,
          status: SALES_ORDER_STATUS_PAID,
          notes: body.notes?.trim() || null,
          items: {
            create: normalizedItems.map((item) => ({
              productId: item.product.id,
              productName: item.product.name,
              quantity: item.quantity,
              unitPriceInCents: item.product.priceInCents,
              totalPriceInCents: item.totalPriceInCents,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      for (const item of normalizedItems) {
        await tx.salesProduct.update({
          where: { id: item.product.id },
          data: {
            stockQuantity: {
              decrement: item.quantity,
            },
          },
        });

        await tx.salesStockMovement.create({
          data: {
            productId: item.product.id,
            type: SALES_MOVEMENT_OUT,
            quantity: item.quantity,
            reason: `Venda #${createdOrder.orderNumber}`,
            referenceOrderId: createdOrder.id,
          },
        });
      }

      return createdOrder;
    });

    return NextResponse.json({ order });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Não foi possível registrar a venda.",
      },
      { status: 400 },
    );
  }
}
