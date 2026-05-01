const fs = require('fs');

const content = fs.readFileSync('src/components/app-sidebar.tsx', 'utf8');

const replacement = `const defaultNavSections: SidebarNavSection[] = [
  {
    items: [
      { href: "/", label: "Home", icon: <HomeIcon className="h-5 w-5" /> },
    ],
  },
  {
    title: "Sales",
    items: [
      {
        href: "/inventory/sales",
        label: "All Sales",
        icon: <TransactionsIcon className="h-5 w-5" />,
      },
      {
        href: "/inventory/sales/create",
        label: "Create Sale",
        icon: <CreateIcon className="h-5 w-5" />,
      },
    ],
  },
  {
    title: "Maintenance",
    items: [
      {
        href: "/tickets",
        label: "Tickets",
        icon: <TicketsIcon className="h-5 w-5" />,
      },
    ],
  },
  {
    title: "Inventory",
    items: [
      {
        href: "/inventory/spare-parts",
        label: "Spare Parts",
        icon: <SparePartsIcon className="h-5 w-5" />,
      },
      {
        href: "/inventory/products",
        label: "Products",
        icon: <ProductsIcon className="h-5 w-5" />,
      },
      {
        href: "/inventory/bikes",
        label: "Bikes",
        icon: <BikesIcon className="h-5 w-5" />,
      },
      {
        href: "/inventory/maintenance-services",
        label: "Maintenance Services",
        icon: <MaintenanceIcon className="h-5 w-5" />,
      },
    ],
  },
  {
    title: "Master Data",
    items: [
      {
        href: "/inventory/brands",
        label: "Brands",
        icon: <BrandsIcon className="h-5 w-5" />,
      },
      {
        href: "/data/bike-blueprints",
        label: "Bike Blueprints",
        icon: <BikesIcon className="h-5 w-5" />,
      },
    ],
  },
  {
    title: "Data",
    items: [
      {
        href: "/data/import-export",
        label: "Import & Export",
        icon: <ArrowUpDownIcon className="h-5 w-5" />,
      },
    ],
  },
  {
    title: "Admin",
    items: [
      {
        href: "/users",
        label: "Users",
        icon: <UsersIcon className="h-5 w-5" />,
      },
      {
        href: "/sellers",
        label: "Sellers",
        icon: <SellerIcon className="h-5 w-5" />,
      },
      {
        href: "/data/payment-methods",
        label: "Payments",
        icon: <PaymentsIcon className="h-5 w-5" />,
      },
    ],
  },
];`;

const regex = /const defaultNavSections: SidebarNavSection\[\] = \[\s*\{[\s\S]*?\];\s*(?=function normalizePath)/;
const newContent = content.replace(regex, replacement + '\n\n');

fs.writeFileSync('src/components/app-sidebar.tsx', newContent);
console.log('done');
