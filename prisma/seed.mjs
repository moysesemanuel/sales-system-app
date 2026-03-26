import { PrismaClient } from "../generated/prisma/index.js";

const prisma = new PrismaClient();

const SALES_MOVEMENT_IN = "IN";
const SALES_MOVEMENT_OUT = "OUT";
const SALES_ORDER_STATUS_PAID = "PAID";

async function resetDatabase() {
  await prisma.salesStockMovement.deleteMany();
  await prisma.salesOrderItem.deleteMany();
  await prisma.salesOrder.deleteMany();
  await prisma.salesProduct.deleteMany();
  await prisma.salesCustomer.deleteMany();
}

async function seedCustomers() {
  return Promise.all([
    prisma.salesCustomer.create({
      data: {
        name: "Atlas Engenharia",
        email: "compras@atlasengenharia.com.br",
        phone: "41999990001",
        document: "12.345.678/0001-10",
        city: "Curitiba",
        state: "PR",
        notes: "Cliente corporativo recorrente.",
      },
    }),
    prisma.salesCustomer.create({
      data: {
        name: "Grupo Nexo",
        email: "financeiro@gruponexo.com.br",
        phone: "41999990002",
        document: "23.456.789/0001-20",
        city: "Sao Jose dos Pinhais",
        state: "PR",
      },
    }),
    prisma.salesCustomer.create({
      data: {
        name: "Meraki Foods",
        email: "operacao@merakifoods.com.br",
        phone: "41999990003",
        document: "34.567.890/0001-30",
        city: "Pinhais",
        state: "PR",
      },
    }),
    prisma.salesCustomer.create({
      data: {
        name: "Costa Telecom",
        email: "vendas@costatelecom.com.br",
        phone: "41999990004",
        document: "45.678.901/0001-40",
        city: "Colombo",
        state: "PR",
      },
    }),
  ]);
}

async function seedProducts() {
  return Promise.all([
    prisma.salesProduct.create({
      data: {
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
    prisma.salesProduct.create({
      data: {
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
    prisma.salesProduct.create({
      data: {
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
    prisma.salesProduct.create({
      data: {
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
    prisma.salesProduct.create({
      data: {
        name: "Terminal smart PDV",
        sku: "PDV-SMART-005",
        category: "Automação",
        description: "Terminal touchscreen para operação de caixa.",
        priceInCents: 3190000,
        costInCents: 2280000,
        stockQuantity: 4,
        minimumStock: 2,
      },
    }),
  ]);
}

async function seedOrders(customers, products) {
  const customerByEmail = new Map(customers.map((customer) => [customer.email, customer]));
  const productBySku = new Map(products.map((product) => [product.sku, product]));

  const atlas = customerByEmail.get("compras@atlasengenharia.com.br");
  const nexo = customerByEmail.get("financeiro@gruponexo.com.br");
  const costa = customerByEmail.get("vendas@costatelecom.com.br");
  const automationKit = productBySku.get("KIT-AUTO-001");
  const biometricReader = productBySku.get("BIO-PRO-002");
  const deploymentService = productBySku.get("SRV-IMPL-003");
  const terminal = productBySku.get("PDV-SMART-005");

  if (!atlas || !nexo || !costa || !automationKit || !biometricReader || !deploymentService || !terminal) {
    throw new Error("Dados base do seed não foram encontrados.");
  }

  await prisma.salesOrder.create({
    data: {
      orderNumber: 1001,
      customerId: atlas.id,
      customerName: atlas.name,
      subtotalInCents: 3860000,
      totalInCents: 3860000,
      status: SALES_ORDER_STATUS_PAID,
      notes: "Venda inicial do ambiente de demonstração.",
      createdAt: new Date("2026-03-20T10:00:00.000Z"),
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

  await prisma.salesOrder.create({
    data: {
      orderNumber: 1002,
      customerId: nexo.id,
      customerName: nexo.name,
      subtotalInCents: 1840000,
      totalInCents: 1840000,
      status: SALES_ORDER_STATUS_PAID,
      createdAt: new Date("2026-03-24T15:30:00.000Z"),
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

  await prisma.salesOrder.create({
    data: {
      orderNumber: 1003,
      customerId: costa.id,
      customerName: costa.name,
      subtotalInCents: 4560000,
      totalInCents: 4560000,
      status: SALES_ORDER_STATUS_PAID,
      createdAt: new Date("2026-03-25T11:45:00.000Z"),
      items: {
        create: [
          {
            productId: terminal.id,
            productName: terminal.name,
            quantity: 1,
            unitPriceInCents: terminal.priceInCents,
            totalPriceInCents: terminal.priceInCents,
          },
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
}

async function seedStockMovements(products) {
  const productBySku = new Map(products.map((product) => [product.sku, product]));
  const movements = [
    ["KIT-AUTO-001", SALES_MOVEMENT_IN, 10, "Carga inicial de estoque"],
    ["KIT-AUTO-001", SALES_MOVEMENT_OUT, 2, "Vendas iniciais do demonstrativo"],
    ["BIO-PRO-002", SALES_MOVEMENT_IN, 6, "Carga inicial de estoque"],
    ["BIO-PRO-002", SALES_MOVEMENT_OUT, 2, "Vendas iniciais do demonstrativo"],
    ["SRV-IMPL-003", SALES_MOVEMENT_IN, 999, "Serviço habilitado no catálogo"],
    ["PDV-SMART-005", SALES_MOVEMENT_IN, 5, "Carga inicial de estoque"],
    ["PDV-SMART-005", SALES_MOVEMENT_OUT, 1, "Venda inicial do demonstrativo"],
  ];

  await prisma.salesStockMovement.createMany({
    data: movements.map(([sku, type, quantity, reason]) => {
      const product = productBySku.get(sku);

      if (!product) {
        throw new Error(`Produto ${sku} não encontrado para movimento.`);
      }

      return {
        productId: product.id,
        type,
        quantity,
        reason,
      };
    }),
  });
}

async function main() {
  await resetDatabase();
  const customers = await seedCustomers();
  const products = await seedProducts();
  await seedOrders(customers, products);
  await seedStockMovements(products);

  console.log("Seed do sistema de vendas concluido com sucesso.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
