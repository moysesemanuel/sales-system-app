import { prisma } from "@/lib/prisma";

const SALES_MOVEMENT_IN = "IN";
const SALES_MOVEMENT_OUT = "OUT";
const SALES_ORDER_STATUS_PAID = "PAID";

export function formatCurrencyFromCents(valueInCents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valueInCents / 100);
}

export async function getNextSalesOrderNumber() {
  const result = await prisma.salesOrder.aggregate({
    _max: {
      orderNumber: true,
    },
  });

  return (result._max.orderNumber ?? 1000) + 1;
}

export async function ensureSalesSystemSeedData() {
  await Promise.all([
    prisma.salesCustomer.upsert({
      where: { email: "compras@atlasengenharia.com.br" },
      update: {
        name: "Atlas Engenharia",
        phone: "41999990001",
        document: "12.345.678/0001-10",
        city: "Curitiba",
        state: "PR",
        notes: "Cliente corporativo recorrente.",
      },
      create: {
        name: "Atlas Engenharia",
        email: "compras@atlasengenharia.com.br",
        phone: "41999990001",
        document: "12.345.678/0001-10",
        city: "Curitiba",
        state: "PR",
        notes: "Cliente corporativo recorrente.",
      },
    }),
    prisma.salesCustomer.upsert({
      where: { email: "financeiro@gruponexo.com.br" },
      update: {
        name: "Grupo Nexo",
        phone: "41999990002",
        document: "23.456.789/0001-20",
        city: "Sao Jose dos Pinhais",
        state: "PR",
      },
      create: {
        name: "Grupo Nexo",
        email: "financeiro@gruponexo.com.br",
        phone: "41999990002",
        document: "23.456.789/0001-20",
        city: "Sao Jose dos Pinhais",
        state: "PR",
      },
    }),
    prisma.salesCustomer.upsert({
      where: { email: "operacao@merakifoods.com.br" },
      update: {
        name: "Meraki Foods",
        phone: "41999990003",
        document: "34.567.890/0001-30",
        city: "Pinhais",
        state: "PR",
      },
      create: {
        name: "Meraki Foods",
        email: "operacao@merakifoods.com.br",
        phone: "41999990003",
        document: "34.567.890/0001-30",
        city: "Pinhais",
        state: "PR",
      },
    }),
    prisma.salesProduct.upsert({
      where: { sku: "KIT-AUTO-001" },
      update: {
        name: "Kit automação comercial",
        category: "Automação",
        description: "Kit com terminal, leitor e impressora para PDV.",
        priceInCents: 2490000,
        costInCents: 1680000,
        minimumStock: 3,
        active: true,
      },
      create: {
        name: "Kit automação comercial",
        sku: "KIT-AUTO-001",
        category: "Automação",
        description: "Kit com terminal, leitor e impressora para PDV.",
        priceInCents: 2490000,
        costInCents: 1680000,
        stockQuantity: 8,
        minimumStock: 3,
      },
    }),
    prisma.salesProduct.upsert({
      where: { sku: "BIO-PRO-002" },
      update: {
        name: "Leitor biométrico pro",
        category: "Periféricos",
        description: "Leitor biométrico de alta precisão para autenticação.",
        priceInCents: 1840000,
        costInCents: 1090000,
        minimumStock: 4,
        active: true,
      },
      create: {
        name: "Leitor biométrico pro",
        sku: "BIO-PRO-002",
        category: "Periféricos",
        description: "Leitor biométrico de alta precisão para autenticação.",
        priceInCents: 1840000,
        costInCents: 1090000,
        stockQuantity: 5,
        minimumStock: 4,
      },
    }),
    prisma.salesProduct.upsert({
      where: { sku: "SRV-IMPL-003" },
      update: {
        name: "Serviço de implantação",
        category: "Serviços",
        description: "Implantação assistida da operação comercial.",
        priceInCents: 1370000,
        costInCents: 550000,
        minimumStock: 0,
        active: true,
      },
      create: {
        name: "Serviço de implantação",
        sku: "SRV-IMPL-003",
        category: "Serviços",
        description: "Implantação assistida da operação comercial.",
        priceInCents: 1370000,
        costInCents: 550000,
        stockQuantity: 999,
        minimumStock: 0,
      },
    }),
    prisma.salesProduct.upsert({
      where: { sku: "CAB-CAT6-004" },
      update: {
        name: "Cabo de rede CAT6",
        category: "Infraestrutura",
        description: "Cabo de rede para infraestrutura interna.",
        priceInCents: 4900,
        costInCents: 1900,
        minimumStock: 8,
        active: true,
      },
      create: {
        name: "Cabo de rede CAT6",
        sku: "CAB-CAT6-004",
        category: "Infraestrutura",
        description: "Cabo de rede para infraestrutura interna.",
        priceInCents: 4900,
        costInCents: 1900,
        stockQuantity: 3,
        minimumStock: 8,
      },
    }),
  ]);

  const [atlas, nexo] = await Promise.all([
    prisma.salesCustomer.findUniqueOrThrow({
      where: { email: "compras@atlasengenharia.com.br" },
    }),
    prisma.salesCustomer.findUniqueOrThrow({
      where: { email: "financeiro@gruponexo.com.br" },
    }),
  ]);

  const [automationKit, biometricReader, deploymentService] = await Promise.all([
    prisma.salesProduct.findUniqueOrThrow({ where: { sku: "KIT-AUTO-001" } }),
    prisma.salesProduct.findUniqueOrThrow({ where: { sku: "BIO-PRO-002" } }),
    prisma.salesProduct.findUniqueOrThrow({ where: { sku: "SRV-IMPL-003" } }),
  ]);

  const existingOrdersCount = await prisma.salesOrder.count();

  if (existingOrdersCount > 0) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.salesOrder.create({
      data: {
        orderNumber: 1001,
        customerId: atlas.id,
        customerName: atlas.name,
        subtotalInCents: 3860000,
        totalInCents: 3860000,
        status: SALES_ORDER_STATUS_PAID,
        notes: "Venda inicial do ambiente de demonstração.",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
        items: {
          create: [
            {
              productId: automationKit.id,
              productName: automationKit.name,
              quantity: 1,
              unitPriceInCents: automationKit.priceInCents,
              totalPriceInCents: automationKit.priceInCents,
            },
            {
              productId: deploymentService.id,
              productName: deploymentService.name,
              quantity: 1,
              unitPriceInCents: deploymentService.priceInCents,
              totalPriceInCents: deploymentService.priceInCents,
            },
          ],
        },
      },
    });

    await tx.salesOrder.create({
      data: {
        orderNumber: 1002,
        customerId: nexo.id,
        customerName: nexo.name,
        subtotalInCents: 1840000,
        totalInCents: 1840000,
        status: SALES_ORDER_STATUS_PAID,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 18),
        items: {
          create: [
            {
              productId: biometricReader.id,
              productName: biometricReader.name,
              quantity: 1,
              unitPriceInCents: biometricReader.priceInCents,
              totalPriceInCents: biometricReader.priceInCents,
            },
          ],
        },
      },
    });

    await tx.salesStockMovement.createMany({
      data: [
        {
          productId: automationKit.id,
          type: SALES_MOVEMENT_IN,
          quantity: 10,
          reason: "Carga inicial de estoque",
        },
        {
          productId: automationKit.id,
          type: SALES_MOVEMENT_OUT,
          quantity: 2,
          reason: "Vendas iniciais do demonstrativo",
        },
        {
          productId: biometricReader.id,
          type: SALES_MOVEMENT_IN,
          quantity: 6,
          reason: "Carga inicial de estoque",
        },
        {
          productId: biometricReader.id,
          type: SALES_MOVEMENT_OUT,
          quantity: 1,
          reason: "Venda inicial do demonstrativo",
        },
        {
          productId: deploymentService.id,
          type: SALES_MOVEMENT_IN,
          quantity: 999,
          reason: "Serviço habilitado no catálogo",
        },
      ],
    });
  });
}

export async function getSalesDashboardData() {
  await ensureSalesSystemSeedData();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [
    customersCount,
    activeProductsCount,
    allActiveProducts,
    monthPaidOrders,
    todayPaidOrders,
    recentOrders,
    topProducts,
  ] = await Promise.all([
    prisma.salesCustomer.count(),
    prisma.salesProduct.count({ where: { active: true } }),
    prisma.salesProduct.findMany({
      where: { active: true },
      orderBy: { stockQuantity: "asc" },
    }),
    prisma.salesOrder.findMany({
      where: {
        status: SALES_ORDER_STATUS_PAID,
        createdAt: { gte: monthStart },
      },
      include: { items: true },
    }),
    prisma.salesOrder.findMany({
      where: {
        status: SALES_ORDER_STATUS_PAID,
        createdAt: { gte: todayStart },
      },
      include: { items: true },
    }),
    prisma.salesOrder.findMany({
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.salesOrderItem.groupBy({
      by: ["productId", "productName"],
      _sum: {
        quantity: true,
        totalPriceInCents: true,
      },
      orderBy: {
        _sum: {
          totalPriceInCents: "desc",
        },
      },
      take: 5,
    }),
  ]);

  const monthRevenue = monthPaidOrders.reduce((sum, order) => sum + order.totalInCents, 0);
  const todayRevenue = todayPaidOrders.reduce((sum, order) => sum + order.totalInCents, 0);
  const lowStockProducts = allActiveProducts
    .filter((product) => product.stockQuantity <= product.minimumStock)
    .slice(0, 5);

  return {
    summary: {
      customersCount,
      activeProductsCount,
      lowStockCount: lowStockProducts.length,
      monthRevenueInCents: monthRevenue,
      todayRevenueInCents: todayRevenue,
      ordersToday: todayPaidOrders.length,
    },
    lowStockProducts: lowStockProducts.map((product) => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      stockQuantity: product.stockQuantity,
      minimumStock: product.minimumStock,
    })),
    recentOrders: recentOrders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      status: order.status,
      totalInCents: order.totalInCents,
      itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
      createdAt: order.createdAt,
    })),
    topProducts: topProducts.map((item) => ({
      productId: item.productId,
      name: item.productName,
      quantitySold: item._sum.quantity ?? 0,
      revenueInCents: item._sum.totalPriceInCents ?? 0,
    })),
  };
}
