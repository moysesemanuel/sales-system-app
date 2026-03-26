"use client";

import { useEffect, useState, useTransition } from "react";
import { useToast } from "@/components/shared/toast-provider";
import styles from "./landing-page.module.css";

const menuItems = [
  "Painel",
  "Emitente",
  "Pessoas",
  "Produtos",
  "Vendas",
  "Estoque",
  "Financeiro",
  "Serviços",
  "Utilitários",
] as const;

type MenuItem = (typeof menuItems)[number];
type ModalMode = "customer" | "product" | "sale" | null;
type ProfileAction = "Minha conta" | "Preferências" | "Segurança" | "Encerrar turno";

type DashboardData = {
  summary: {
    customersCount: number;
    activeProductsCount: number;
    lowStockCount: number;
    monthRevenueInCents: number;
    todayRevenueInCents: number;
    ordersToday: number;
  };
  lowStockProducts: Array<{
    id: string;
    name: string;
    sku: string;
    stockQuantity: number;
    minimumStock: number;
  }>;
  recentOrders: Array<{
    id: string;
    orderNumber: number;
    customerName: string;
    status: string;
    totalInCents: number;
    itemCount: number;
    createdAt: string;
  }>;
  topProducts: Array<{
    productId: string;
    name: string;
    quantitySold: number;
    revenueInCents: number;
  }>;
};

type SalesCustomer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  document: string | null;
  city: string | null;
  state: string | null;
  notes: string | null;
  ordersCount: number;
  totalRevenueInCents: number;
  createdAt: string;
};

type SalesProduct = {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  category: string;
  priceInCents: number;
  costInCents: number;
  stockQuantity: number;
  minimumStock: number;
  active: boolean;
  createdAt: string;
};

type SalesOrder = {
  id: string;
  orderNumber: number;
  customerId: string;
  customerName: string;
  subtotalInCents: number;
  totalInCents: number;
  status: string;
  notes: string | null;
  createdAt: string;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    unitPriceInCents: number;
    totalPriceInCents: number;
  }>;
};

const menuIcons: Record<MenuItem, string> = {
  Painel: "PA",
  Emitente: "EM",
  Pessoas: "PS",
  Produtos: "PR",
  Vendas: "VD",
  Estoque: "ET",
  Financeiro: "FN",
  Serviços: "SV",
  Utilitários: "UT",
};

function formatCurrency(valueInCents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valueInCents / 100);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function toCents(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".").trim();
  const number = Number(normalized);
  return Number.isFinite(number) ? Math.round(number * 100) : NaN;
}

function matchesSearch(value: string, search: string) {
  return value.toLowerCase().includes(search.toLowerCase());
}

export function SalesSystemLandingPage() {
  const { showToast } = useToast();
  const [selectedMenu, setSelectedMenu] = useState<MenuItem>("Vendas");
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [customers, setCustomers] = useState<SalesCustomer[]>([]);
  const [products, setProducts] = useState<SalesProduct[]>([]);
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [isLoading, startLoadingTransition] = useTransition();
  const [isSubmitting, startSubmitTransition] = useTransition();

  const [customerForm, setCustomerForm] = useState({
    name: "",
    email: "",
    phone: "",
    document: "",
    city: "",
    state: "",
    notes: "",
  });
  const [productForm, setProductForm] = useState({
    name: "",
    sku: "",
    category: "",
    description: "",
    price: "",
    cost: "",
    stockQuantity: "",
    minimumStock: "",
  });
  const [saleForm, setSaleForm] = useState({
    customerId: "",
    notes: "",
    items: [
      {
        productId: "",
        quantity: "1",
      },
    ],
  });
  const profileActions: ProfileAction[] = [
    "Minha conta",
    "Preferências",
    "Segurança",
    "Encerrar turno",
  ];

  async function loadData() {
    const [dashboardResponse, customersResponse, productsResponse, ordersResponse] =
      await Promise.all([
        fetch("/api/sales-system/dashboard", { cache: "no-store" }),
        fetch("/api/sales-system/customers", { cache: "no-store" }),
        fetch("/api/sales-system/products", { cache: "no-store" }),
        fetch("/api/sales-system/orders", { cache: "no-store" }),
      ]);

    const [dashboardPayload, customersPayload, productsPayload, ordersPayload] = await Promise.all([
      dashboardResponse.json(),
      customersResponse.json(),
      productsResponse.json(),
      ordersResponse.json(),
    ]);

    if (!dashboardResponse.ok) {
      throw new Error(dashboardPayload.error ?? "Falha ao carregar o dashboard.");
    }

    if (!customersResponse.ok) {
      throw new Error(customersPayload.error ?? "Falha ao carregar clientes.");
    }

    if (!productsResponse.ok) {
      throw new Error(productsPayload.error ?? "Falha ao carregar produtos.");
    }

    if (!ordersResponse.ok) {
      throw new Error(ordersPayload.error ?? "Falha ao carregar vendas.");
    }

    setDashboard(dashboardPayload as DashboardData);
    setCustomers((customersPayload.customers ?? []) as SalesCustomer[]);
    setProducts((productsPayload.products ?? []) as SalesProduct[]);
    setOrders((ordersPayload.orders ?? []) as SalesOrder[]);
  }

  useEffect(() => {
    startLoadingTransition(() => {
      void loadData().catch((error: unknown) => {
        showToast({
          variant: "error",
          message: error instanceof Error ? error.message : "Não foi possível carregar os dados.",
        });
      });
    });
  }, [showToast]);

  const normalizedSearch = search.trim().toLowerCase();
  const filteredCustomers = customers.filter((customer) =>
    normalizedSearch
      ? [customer.name, customer.email ?? "", customer.document ?? "", customer.city ?? ""].some(
          (value) => matchesSearch(value, normalizedSearch),
        )
      : true,
  );
  const filteredProducts = products.filter((product) =>
    normalizedSearch
      ? [product.name, product.sku, product.category].some((value) =>
          matchesSearch(value, normalizedSearch),
        )
      : true,
  );
  const filteredOrders = orders.filter((order) =>
    normalizedSearch
      ? [order.customerName, `${order.orderNumber}`, order.status].some((value) =>
          matchesSearch(value, normalizedSearch),
        )
      : true,
  );

  const actualShortcuts: Record<MenuItem, string[]> = {
    Painel: ["Atualizar dados", "Nova venda", "Novo cliente", "Novo produto"],
    Emitente: ["Atualizar dados", "Nova venda", "Ver financeiro", "Ver vendas"],
    Pessoas: ["Novo cliente", "Atualizar dados", "Ver vendas", "Ver financeiro"],
    Produtos: ["Novo produto", "Atualizar dados", "Ver estoque", "Nova venda"],
    Vendas: ["Nova venda", "Novo cliente", "Novo produto", "Atualizar dados"],
    Estoque: ["Novo produto", "Atualizar dados", "Ver produtos", "Nova venda"],
    Financeiro: ["Nova venda", "Atualizar dados", "Ver vendas", "Ver clientes"],
    Serviços: ["Nova venda", "Novo cliente", "Atualizar dados", "Ver painel"],
    Utilitários: ["Atualizar dados", "Novo cliente", "Novo produto", "Nova venda"],
  };

  const topProducts = dashboard?.topProducts ?? [];
  const lowStockProducts = dashboard?.lowStockProducts ?? [];
  const recentOrders = dashboard?.recentOrders ?? [];
  const monthRevenue = dashboard?.summary.monthRevenueInCents ?? 0;
  const todayRevenue = dashboard?.summary.todayRevenueInCents ?? 0;
  const lowStockCount = dashboard?.summary.lowStockCount ?? 0;

  async function refreshAllData(message?: string) {
    startLoadingTransition(() => {
      void loadData()
        .then(() => {
          if (message) {
            showToast({ variant: "success", message });
          }
        })
        .catch((error: unknown) => {
          showToast({
            variant: "error",
            message: error instanceof Error ? error.message : "Não foi possível atualizar os dados.",
          });
        });
    });
  }

  function resetForms() {
    setCustomerForm({
      name: "",
      email: "",
      phone: "",
      document: "",
      city: "",
      state: "",
      notes: "",
    });
    setProductForm({
      name: "",
      sku: "",
      category: "",
      description: "",
      price: "",
      cost: "",
      stockQuantity: "",
      minimumStock: "",
    });
    setSaleForm({
      customerId: customers[0]?.id ?? "",
      notes: "",
      items: [{ productId: "", quantity: "1" }],
    });
  }

  function openModal(mode: ModalMode) {
    resetForms();
    setModalMode(mode);
  }

  function handleShortcut(action: string) {
    if (action === "Novo cliente") {
      openModal("customer");
      return;
    }

    if (action === "Novo produto") {
      openModal("product");
      return;
    }

    if (action === "Nova venda") {
      openModal("sale");
      return;
    }

    if (action === "Atualizar dados") {
      void refreshAllData("Dados atualizados.");
      return;
    }

    if (action === "Ver vendas") {
      setSelectedMenu("Vendas");
      return;
    }

    if (action === "Ver financeiro") {
      setSelectedMenu("Financeiro");
      return;
    }

    if (action === "Ver estoque") {
      setSelectedMenu("Estoque");
      return;
    }

    if (action === "Ver clientes") {
      setSelectedMenu("Pessoas");
      return;
    }

    if (action === "Ver produtos") {
      setSelectedMenu("Produtos");
      return;
    }

    if (action === "Ver painel") {
      setSelectedMenu("Painel");
    }
  }

  function handleProfileAction(action: ProfileAction) {
    if (action === "Encerrar turno") {
      showToast({
        variant: "success",
        message: "Turno encerrado na demonstração. Nenhuma sessão real foi finalizada.",
      });
      setIsProfileOpen(false);
      return;
    }

    showToast({
      variant: "success",
      message: `${action} disponível como fluxo de perfil nesta versão.`,
    });
    setIsProfileOpen(false);
  }

  function updateSaleItem(index: number, field: "productId" | "quantity", value: string) {
    setSaleForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }));
  }

  async function submitCustomer() {
    startSubmitTransition(() => {
      void fetch("/api/sales-system/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customerForm),
      })
        .then(async (response) => {
          const payload = await response.json();

          if (!response.ok) {
            throw new Error(payload.error ?? "Não foi possível criar o cliente.");
          }

          setModalMode(null);
          await refreshAllData("Cliente criado com sucesso.");
        })
        .catch((error: unknown) => {
          showToast({
            variant: "error",
            message: error instanceof Error ? error.message : "Erro ao criar cliente.",
          });
        });
    });
  }

  async function submitProduct() {
    const priceInCents = toCents(productForm.price);
    const costInCents = toCents(productForm.cost);

    if (!Number.isFinite(priceInCents) || !Number.isFinite(costInCents)) {
      showToast({
        variant: "warning",
        message: "Informe preço e custo válidos para o produto.",
      });
      return;
    }

    startSubmitTransition(() => {
      void fetch("/api/sales-system/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...productForm,
          priceInCents,
          costInCents,
          stockQuantity: Number(productForm.stockQuantity || 0),
          minimumStock: Number(productForm.minimumStock || 0),
        }),
      })
        .then(async (response) => {
          const payload = await response.json();

          if (!response.ok) {
            throw new Error(payload.error ?? "Não foi possível criar o produto.");
          }

          setModalMode(null);
          await refreshAllData("Produto criado com sucesso.");
        })
        .catch((error: unknown) => {
          showToast({
            variant: "error",
            message: error instanceof Error ? error.message : "Erro ao criar produto.",
          });
        });
    });
  }

  async function submitSale() {
    startSubmitTransition(() => {
      void fetch("/api/sales-system/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: saleForm.customerId,
          notes: saleForm.notes,
          items: saleForm.items.map((item) => ({
            productId: item.productId,
            quantity: Number(item.quantity),
          })),
        }),
      })
        .then(async (response) => {
          const payload = await response.json();

          if (!response.ok) {
            throw new Error(payload.error ?? "Não foi possível registrar a venda.");
          }

          setModalMode(null);
          await refreshAllData("Venda registrada com sucesso.");
        })
        .catch((error: unknown) => {
          showToast({
            variant: "error",
            message: error instanceof Error ? error.message : "Erro ao registrar venda.",
          });
        });
    });
  }

  const menuMeta: Record<
    MenuItem,
    {
      eyebrow: string;
      title: string;
      description: string;
      summaryTitle: string;
      summaryDescription: string;
      indicators: Array<{ label: string; value: string; detail: string }>;
    }
  > = {
    Painel: {
      eyebrow: "Dashboard",
      title: "Painel",
      description: "Resumo executivo com dados vivos do sistema comercial.",
      summaryTitle: `${dashboard?.summary.ordersToday ?? 0} vendas registradas hoje`,
      summaryDescription: `${formatCurrency(todayRevenue)} faturados hoje e ${lowStockCount} alertas de estoque.`,
      indicators: [
        {
          label: "Receita do mes",
          value: formatCurrency(monthRevenue),
          detail: `${dashboard?.summary.customersCount ?? 0} clientes cadastrados`,
        },
        {
          label: "Produtos ativos",
          value: `${dashboard?.summary.activeProductsCount ?? 0}`,
          detail: `${lowStockCount} com estoque baixo`,
        },
        {
          label: "Receita do dia",
          value: formatCurrency(todayRevenue),
          detail: `${dashboard?.summary.ordersToday ?? 0} pedidos concluídos`,
        },
        {
          label: "Top produto",
          value: topProducts[0]?.name ?? "Sem dados",
          detail: topProducts[0] ? `${topProducts[0].quantitySold} itens vendidos` : "Aguardando vendas",
        },
      ],
    },
    Emitente: {
      eyebrow: "Fiscal",
      title: "Emitente",
      description: "Operação fiscal conectada ao volume real de pedidos e faturamento.",
      summaryTitle: `${filteredOrders.length} pedidos aptos para emissão`,
      summaryDescription: "Módulo conectado ao fluxo de vendas para posterior expansão fiscal.",
      indicators: [
        { label: "Pedidos pagos", value: `${orders.length}`, detail: "base para emissao fiscal" },
        { label: "Receita do dia", value: formatCurrency(todayRevenue), detail: "total faturado hoje" },
        { label: "Clientes ativos", value: `${customers.length}`, detail: "cadastros prontos para documento" },
        { label: "Último pedido", value: recentOrders[0] ? `#${recentOrders[0].orderNumber}` : "-", detail: "registro mais recente" },
      ],
    },
    Pessoas: {
      eyebrow: "Relacionamento",
      title: "Pessoas",
      description: "Clientes reais cadastrados no banco e disponíveis para novas vendas.",
      summaryTitle: `${customers.length} clientes cadastrados`,
      summaryDescription: `${filteredCustomers.length} exibidos na busca atual.`,
      indicators: [
        { label: "Clientes ativos", value: `${customers.length}`, detail: "base comercial total" },
        { label: "Com e-mail", value: `${customers.filter((item) => item.email).length}`, detail: "prontos para contato" },
        { label: "Com documento", value: `${customers.filter((item) => item.document).length}`, detail: "cadastros completos" },
        { label: "Maior receita", value: customers[0] ? formatCurrency(Math.max(...customers.map((item) => item.totalRevenueInCents))) : formatCurrency(0), detail: "cliente com maior acumulado" },
      ],
    },
    Produtos: {
      eyebrow: "Catálogo",
      title: "Produtos",
      description: "Catálogo persistido com preço, custo, SKU e estoque operacional.",
      summaryTitle: `${products.length} produtos cadastrados`,
      summaryDescription: `${lowStockCount} produtos com alerta de estoque baixo.`,
      indicators: [
        { label: "Produtos ativos", value: `${products.filter((item) => item.active).length}`, detail: "catálogo habilitado" },
        { label: "Estoque total", value: `${products.reduce((sum, item) => sum + item.stockQuantity, 0)}`, detail: "unidades disponíveis" },
        { label: "Margem média", value: `${products.length ? Math.round(products.reduce((sum, item) => sum + (item.priceInCents - item.costInCents) / Math.max(item.priceInCents, 1), 0) / products.length * 100) : 0}%`, detail: "margem aproximada do mix" },
        { label: "Top categoria", value: products[0]?.category ?? "-", detail: "categoria com maior destaque atual" },
      ],
    },
    Vendas: {
      eyebrow: "Comercial",
      title: "Vendas",
      description: "Pedidos reais com baixa de estoque automática e impacto no financeiro.",
      summaryTitle: `${orders.length} vendas registradas`,
      summaryDescription: `${formatCurrency(monthRevenue)} acumulados no mês.`,
      indicators: [
        { label: "Pedidos", value: `${orders.length}`, detail: "vendas persistidas no banco" },
        { label: "Faturamento do mês", value: formatCurrency(monthRevenue), detail: "receita consolidada" },
        { label: "Faturamento hoje", value: formatCurrency(todayRevenue), detail: "resultado do dia" },
        { label: "Ticket médio", value: orders.length ? formatCurrency(Math.round(monthRevenue / orders.length)) : formatCurrency(0), detail: "média por venda" },
      ],
    },
    Estoque: {
      eyebrow: "Operação",
      title: "Estoque",
      description: "Saldo de produtos atualizado automaticamente a cada venda registrada.",
      summaryTitle: `${lowStockCount} alertas de reposição`,
      summaryDescription: `${products.length} itens monitorados pelo sistema.`,
      indicators: [
        { label: "Baixo estoque", value: `${lowStockCount}`, detail: "itens abaixo do mínimo" },
        { label: "Sem risco", value: `${products.filter((item) => item.stockQuantity > item.minimumStock).length}`, detail: "estoque saudável" },
        { label: "Maior saldo", value: `${Math.max(...products.map((item) => item.stockQuantity), 0)}`, detail: "unidades do item mais alto" },
        { label: "Produtos", value: `${products.length}`, detail: "itens no controle de estoque" },
      ],
    },
    Financeiro: {
      eyebrow: "Financeiro",
      title: "Financeiro",
      description: "Receita derivada das vendas reais registradas dentro do sistema.",
      summaryTitle: formatCurrency(monthRevenue),
      summaryDescription: `${formatCurrency(todayRevenue)} de entrada hoje.`,
      indicators: [
        { label: "Mês atual", value: formatCurrency(monthRevenue), detail: "receita total do mês" },
        { label: "Hoje", value: formatCurrency(todayRevenue), detail: "entrada confirmada" },
        { label: "Pedidos pagos", value: `${orders.length}`, detail: "todos os pedidos atuais" },
        { label: "Receita por cliente", value: customers.length ? formatCurrency(Math.round(monthRevenue / customers.length)) : formatCurrency(0), detail: "média simples por cliente" },
      ],
    },
    Serviços: {
      eyebrow: "Serviços",
      title: "Serviços",
      description: "Módulo preparado para expansão, usando a receita e pedidos já ativos como base operacional.",
      summaryTitle: `${products.filter((item) => item.category === "Serviços").length} serviços catalogados`,
      summaryDescription: "Os serviços vendidos já participam das vendas e do faturamento.",
      indicators: [
        { label: "Serviços", value: `${products.filter((item) => item.category === "Serviços").length}`, detail: "itens do tipo serviço" },
        { label: "Receita vinculada", value: formatCurrency(topProducts.find((item) => matchesSearch(item.name, "serviço"))?.revenueInCents ?? 0), detail: "faturamento vindo de serviços" },
        { label: "Clientes ativos", value: `${customers.length}`, detail: "base pronta para atendimento" },
        { label: "Pedidos recentes", value: `${recentOrders.length}`, detail: "monitoramento operacional" },
      ],
    },
    Utilitários: {
      eyebrow: "Operação",
      title: "Utilitários",
      description: "Ações rápidas para operar o sistema sem depender de dados estáticos.",
      summaryTitle: "Atalhos executam ações reais",
      summaryDescription: "Cadastro de cliente, produto, venda e atualização de dados já funcionam.",
      indicators: [
        { label: "Atalhos ativos", value: "4", detail: "ações conectadas à aplicação" },
        { label: "Clientes", value: `${customers.length}`, detail: "cadastros disponíveis" },
        { label: "Produtos", value: `${products.length}`, detail: "itens disponíveis" },
        { label: "Vendas", value: `${orders.length}`, detail: "pedidos registrados" },
      ],
    },
  };

  const content = menuMeta[selectedMenu];

  const primaryRows =
    selectedMenu === "Pessoas"
      ? filteredCustomers.map((item) => ({
          title: item.name,
          amount: formatCurrency(item.totalRevenueInCents),
          note: `${item.ordersCount} vendas${item.city ? ` • ${item.city}` : ""}`,
        }))
      : selectedMenu === "Produtos"
        ? filteredProducts.map((item) => ({
            title: item.name,
            amount: `${item.stockQuantity} un.`,
            note: `${item.sku} • ${formatCurrency(item.priceInCents)}`,
          }))
        : selectedMenu === "Vendas"
          ? filteredOrders.map((item) => ({
              title: `Pedido #${item.orderNumber}`,
              amount: formatCurrency(item.totalInCents),
              note: `${item.customerName} • ${formatDate(item.createdAt)}`,
            }))
          : selectedMenu === "Estoque"
            ? filteredProducts.map((item) => ({
                title: item.name,
                amount: `${item.stockQuantity} un.`,
                note: `Minimo ${item.minimumStock} • ${item.sku}`,
              }))
            : selectedMenu === "Financeiro"
              ? filteredOrders.map((item) => ({
                  title: item.customerName,
                  amount: formatCurrency(item.totalInCents),
                  note: `Pedido #${item.orderNumber} • ${item.status}`,
                }))
              : recentOrders.map((item) => ({
                  title: `Pedido #${item.orderNumber}`,
                  amount: formatCurrency(item.totalInCents),
                  note: `${item.customerName} • ${item.itemCount} itens`,
                }));

  const sideActions = actualShortcuts[selectedMenu];
  const activityRows =
    selectedMenu === "Pessoas"
      ? filteredCustomers.map((item) => `${item.name} • ${item.email ?? "sem e-mail"} • ${item.phone ?? "sem telefone"}`)
      : selectedMenu === "Produtos"
        ? filteredProducts.map((item) => `${item.name} • ${item.category} • estoque ${item.stockQuantity}`)
        : selectedMenu === "Estoque"
          ? lowStockProducts.map((item) => `${item.name} • saldo ${item.stockQuantity} • mínimo ${item.minimumStock}`)
          : filteredOrders.map((item) => `Pedido #${item.orderNumber} • ${item.customerName} • ${formatCurrency(item.totalInCents)}`);

  const rankingRows =
    selectedMenu === "Pessoas"
      ? filteredCustomers.slice(0, 5).map((item) => ({
          name: item.name,
          value: formatCurrency(item.totalRevenueInCents),
        }))
      : selectedMenu === "Produtos" || selectedMenu === "Vendas" || selectedMenu === "Painel"
        ? topProducts.map((item) => ({
            name: item.name,
            value: `${item.quantitySold} itens`,
          }))
        : selectedMenu === "Estoque"
          ? lowStockProducts.map((item) => ({
              name: item.name,
              value: `${item.stockQuantity} un.`,
            }))
          : filteredOrders.slice(0, 5).map((item) => ({
              name: item.customerName,
              value: formatCurrency(item.totalInCents),
            }));

  const listConfig =
    selectedMenu === "Pessoas"
      ? {
          title: "Lista de pessoas",
          columns: ["Nome", "Contato", "Cidade", "Receita"],
          rows: filteredCustomers.map((item) => [
            item.name,
            item.email ?? item.phone ?? "Sem contato",
            item.city ?? "-",
            formatCurrency(item.totalRevenueInCents),
          ]),
        }
      : selectedMenu === "Produtos"
        ? {
            title: "Lista de produtos",
            columns: ["Produto", "SKU", "Categoria", "Preço"],
            rows: filteredProducts.map((item) => [
              item.name,
              item.sku,
              item.category,
              formatCurrency(item.priceInCents),
            ]),
          }
        : selectedMenu === "Estoque"
          ? {
              title: "Lista de estoque",
              columns: ["Produto", "SKU", "Saldo", "Minimo"],
              rows: filteredProducts.map((item) => [
                item.name,
                item.sku,
                `${item.stockQuantity} un.`,
                `${item.minimumStock} un.`,
              ]),
            }
          : null;

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <aside className={styles.sidebar}>
          <div className={styles.brandBlock}>
            <span className={styles.brandEyebrow}>Sistema de vendas</span>
            <strong>Atlas ERP</strong>
            <p>Operação comercial, estoque e financeiro com persistência real em banco.</p>
          </div>

          <nav className={styles.menu} aria-label="Módulos do sistema">
            {menuItems.map((item) => (
              <button
                key={item}
                className={item === selectedMenu ? styles.menuItemActive : styles.menuItem}
                onClick={() => setSelectedMenu(item)}
                type="button"
              >
                <span className={styles.menuIcon} aria-hidden="true">
                  {menuIcons[item]}
                </span>
                {item}
              </button>
            ))}
          </nav>

          <div className={styles.sidebarCard}>
            <span className={styles.sidebarLabel}>Atalhos reais</span>
            <div className={styles.shortcutList}>
              {sideActions.map((item) => (
                <button
                  className={styles.shortcutButton}
                  key={item}
                  onClick={() => handleShortcut(item)}
                  type="button"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className={styles.workspace}>
          <header className={styles.topbar}>
            <div className={styles.searchWrap}>
              <input
                className={styles.searchInput}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar pedidos, clientes, produtos ou documentos"
                type="search"
                value={search}
              />
            </div>

            <button
              aria-expanded={isProfileOpen}
              className={styles.profileArea}
              onClick={() => setIsProfileOpen((current) => !current)}
              type="button"
            >
              <div className={styles.profileMeta}>
                <span>Perfil</span>
                <strong>Mariana Costa</strong>
                <small>Gestora comercial</small>
              </div>
              <div className={styles.avatar}>MC</div>
            </button>
          </header>

          <div className={styles.content} key={selectedMenu}>
            <section className={styles.hero}>
              <div className={styles.heroCopy}>
                <span className={styles.eyebrow}>{content.eyebrow}</span>
                <h1>{content.title}</h1>
                <p className={styles.lead}>{content.description}</p>

                <div className={styles.heroActions}>
                  <button className={styles.primaryCta} onClick={() => handleShortcut(sideActions[0])} type="button">
                    {sideActions[0]}
                  </button>
                  <button
                    className={styles.secondaryCta}
                    onClick={() => setIsProfileOpen(true)}
                    type="button"
                  >
                    Abrir perfil
                  </button>
                </div>
              </div>

              <div className={styles.summaryCard}>
                <span className={styles.summaryLabel}>Resumo do módulo</span>
                <strong>{content.summaryTitle}</strong>
                <p>{content.summaryDescription}</p>
                <div className={styles.summaryGrid}>
                  <div>
                    <span>Busca atual</span>
                    <strong>{normalizedSearch || "Todas"}</strong>
                  </div>
                  <div>
                    <span>Status</span>
                    <strong className={styles.summaryValue}>
                      {isLoading ? "Atualizando" : "Em dia"}
                    </strong>
                  </div>
                </div>
              </div>
            </section>

            <section className={styles.indicatorGrid} id="indicadores">
              {content.indicators.map((item) => (
                <article key={item.label} className={styles.indicatorCard}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                  <p>{item.detail}</p>
                </article>
              ))}
            </section>

            <section className={styles.mainGrid}>
              <article className={styles.panelCard}>
                <div className={styles.cardHeader}>
                  <div>
                    <span className={styles.eyebrow}>Dados reais</span>
                    <h2>Visão principal</h2>
                  </div>
                  <button className={styles.ghostButton} onClick={() => void refreshAllData()} type="button">
                    Atualizar
                  </button>
                </div>

                <div className={styles.pipelineGrid}>
                  {primaryRows.slice(0, 6).map((item) => (
                    <div key={`${item.title}-${item.note}`} className={styles.pipelineCard}>
                      <span>{item.title}</span>
                      <strong>{item.amount}</strong>
                      <p>{item.note}</p>
                    </div>
                  ))}
                </div>
              </article>

              <article className={styles.sideCard}>
                <div className={styles.cardHeader}>
                  <div>
                    <span className={styles.eyebrow}>Atalhos</span>
                    <h2>Ações disponíveis</h2>
                  </div>
                </div>

                <div className={styles.quickActionGrid}>
                  {sideActions.map((item) => (
                    <button
                      key={item}
                      className={styles.quickAction}
                      onClick={() => handleShortcut(item)}
                      type="button"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </article>

              <article className={styles.panelCard}>
                <div className={styles.cardHeader}>
                  <div>
                    <span className={styles.eyebrow}>Lista operacional</span>
                    <h2>Itens monitorados</h2>
                  </div>
                </div>

                <ul className={styles.activityList}>
                  {activityRows.slice(0, 8).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>

              <article className={styles.sideCard}>
                <div className={styles.cardHeader}>
                  <div>
                    <span className={styles.eyebrow}>Destaques</span>
                    <h2>Ranking</h2>
                  </div>
                </div>

                <div className={styles.productList}>
                  {rankingRows.slice(0, 5).map((item) => (
                    <div key={`${item.name}-${item.value}`} className={styles.productRow}>
                      <div>
                        <strong>{item.name}</strong>
                      </div>
                      <span>{item.value}</span>
                    </div>
                  ))}
                </div>
              </article>
            </section>

            {listConfig ? (
              <section className={styles.listSection}>
                <div className={styles.cardHeader}>
                  <div>
                    <span className={styles.eyebrow}>Consulta detalhada</span>
                    <h2>{listConfig.title}</h2>
                  </div>
                </div>

                <div className={styles.tableWrap}>
                  <table className={styles.dataTable}>
                    <thead>
                      <tr>
                        {listConfig.columns.map((column) => (
                          <th key={column} scope="col">
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {listConfig.rows.map((row, index) => (
                        <tr key={`${row[0]}-${index}`}>
                          {row.map((cell) => (
                            <td key={`${row[0]}-${cell}`}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}
          </div>
        </section>
      </div>

      {modalMode ? (
        <div className={styles.modalOverlay} role="presentation">
          <div className={styles.modalCard} role="dialog" aria-modal="true">
            <div className={styles.modalHeader}>
              <div>
                <span className={styles.eyebrow}>
                  {modalMode === "customer"
                    ? "Cliente"
                    : modalMode === "product"
                      ? "Produto"
                      : "Venda"}
                </span>
                <h2>
                  {modalMode === "customer"
                    ? "Novo cliente"
                    : modalMode === "product"
                      ? "Novo produto"
                      : "Nova venda"}
                </h2>
              </div>
              <button className={styles.modalClose} onClick={() => setModalMode(null)} type="button">
                Fechar
              </button>
            </div>

            {modalMode === "customer" ? (
              <div className={styles.formGrid}>
                <input
                  className={styles.formInput}
                  onChange={(event) => setCustomerForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Nome"
                  value={customerForm.name}
                />
                <input
                  className={styles.formInput}
                  onChange={(event) => setCustomerForm((current) => ({ ...current, email: event.target.value }))}
                  placeholder="E-mail"
                  value={customerForm.email}
                />
                <input
                  className={styles.formInput}
                  onChange={(event) => setCustomerForm((current) => ({ ...current, phone: event.target.value }))}
                  placeholder="Telefone"
                  value={customerForm.phone}
                />
                <input
                  className={styles.formInput}
                  onChange={(event) => setCustomerForm((current) => ({ ...current, document: event.target.value }))}
                  placeholder="Documento"
                  value={customerForm.document}
                />
                <input
                  className={styles.formInput}
                  onChange={(event) => setCustomerForm((current) => ({ ...current, city: event.target.value }))}
                  placeholder="Cidade"
                  value={customerForm.city}
                />
                <input
                  className={styles.formInput}
                  onChange={(event) => setCustomerForm((current) => ({ ...current, state: event.target.value }))}
                  placeholder="Estado"
                  value={customerForm.state}
                />
                <textarea
                  className={styles.formTextarea}
                  onChange={(event) => setCustomerForm((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="Observações"
                  value={customerForm.notes}
                />
                <button className={styles.primaryCta} disabled={isSubmitting} onClick={() => void submitCustomer()} type="button">
                  Salvar cliente
                </button>
              </div>
            ) : null}

            {modalMode === "product" ? (
              <div className={styles.formGrid}>
                <input
                  className={styles.formInput}
                  onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Nome"
                  value={productForm.name}
                />
                <input
                  className={styles.formInput}
                  onChange={(event) => setProductForm((current) => ({ ...current, sku: event.target.value }))}
                  placeholder="SKU"
                  value={productForm.sku}
                />
                <input
                  className={styles.formInput}
                  onChange={(event) => setProductForm((current) => ({ ...current, category: event.target.value }))}
                  placeholder="Categoria"
                  value={productForm.category}
                />
                <input
                  className={styles.formInput}
                  onChange={(event) => setProductForm((current) => ({ ...current, price: event.target.value }))}
                  placeholder="Preço em R$"
                  value={productForm.price}
                />
                <input
                  className={styles.formInput}
                  onChange={(event) => setProductForm((current) => ({ ...current, cost: event.target.value }))}
                  placeholder="Custo em R$"
                  value={productForm.cost}
                />
                <input
                  className={styles.formInput}
                  onChange={(event) => setProductForm((current) => ({ ...current, stockQuantity: event.target.value }))}
                  placeholder="Estoque inicial"
                  value={productForm.stockQuantity}
                />
                <input
                  className={styles.formInput}
                  onChange={(event) => setProductForm((current) => ({ ...current, minimumStock: event.target.value }))}
                  placeholder="Estoque mínimo"
                  value={productForm.minimumStock}
                />
                <textarea
                  className={styles.formTextarea}
                  onChange={(event) => setProductForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Descrição"
                  value={productForm.description}
                />
                <button className={styles.primaryCta} disabled={isSubmitting} onClick={() => void submitProduct()} type="button">
                  Salvar produto
                </button>
              </div>
            ) : null}

            {modalMode === "sale" ? (
              <div className={styles.formGrid}>
                <select
                  className={styles.formInput}
                  onChange={(event) => setSaleForm((current) => ({ ...current, customerId: event.target.value }))}
                  value={saleForm.customerId}
                >
                  <option value="">Selecione um cliente</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>

                {saleForm.items.map((item, index) => (
                  <div className={styles.saleItemRow} key={`${index}-${item.productId}`}>
                    <select
                      className={styles.formInput}
                      onChange={(event) => updateSaleItem(index, "productId", event.target.value)}
                      value={item.productId}
                    >
                      <option value="">Selecione um produto</option>
                      {products
                        .filter((product) => product.active)
                        .map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name} • {product.stockQuantity} un.
                          </option>
                        ))}
                    </select>
                    <input
                      className={styles.formInput}
                      min="1"
                      onChange={(event) => updateSaleItem(index, "quantity", event.target.value)}
                      type="number"
                      value={item.quantity}
                    />
                  </div>
                ))}

                <button
                  className={styles.secondaryCta}
                  onClick={() =>
                    setSaleForm((current) => ({
                      ...current,
                      items: [...current.items, { productId: "", quantity: "1" }],
                    }))
                  }
                  type="button"
                >
                  Adicionar item
                </button>

                <textarea
                  className={styles.formTextarea}
                  onChange={(event) => setSaleForm((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="Observações da venda"
                  value={saleForm.notes}
                />

                <button className={styles.primaryCta} disabled={isSubmitting} onClick={() => void submitSale()} type="button">
                  Registrar venda
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {isProfileOpen ? (
        <div className={styles.profileOverlay} onClick={() => setIsProfileOpen(false)} role="presentation">
          <aside
            aria-label="Painel do perfil"
            className={styles.profilePanel}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.profilePanelHeader}>
              <div>
                <span className={styles.eyebrow}>Conta ativa</span>
                <h2>Mariana Costa</h2>
                <p>Gestora comercial com acesso operacional, financeiro e administrativo.</p>
              </div>
              <button className={styles.modalClose} onClick={() => setIsProfileOpen(false)} type="button">
                Fechar
              </button>
            </div>

            <div className={styles.profilePanelGrid}>
              <div className={styles.profilePanelCard}>
                <span>Status da sessão</span>
                <strong>{isLoading ? "Sincronizando dados" : "Sessão estável"}</strong>
                <p>Última atualização refletida em todos os módulos do painel.</p>
              </div>

              <div className={styles.profilePanelCard}>
                <span>Escopo atual</span>
                <strong>{selectedMenu}</strong>
                <p>Módulo em foco para navegação, consulta e ações rápidas.</p>
              </div>
            </div>

            <div className={styles.profileActionList}>
              {profileActions.map((action) => (
                <button
                  className={styles.profileActionButton}
                  key={action}
                  onClick={() => handleProfileAction(action)}
                  type="button"
                >
                  {action}
                </button>
              ))}
            </div>
          </aside>
        </div>
      ) : null}
    </main>
  );
}
