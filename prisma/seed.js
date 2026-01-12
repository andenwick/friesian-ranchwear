const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Products from Google Sheets
const products = [
  {
    name: "Blue Bull FRW",
    description: "Premium Friesian Ranchwear cap featuring the iconic bull logo in blue.",
    basePrice: 55,
    category: "Hats",
    active: true,
    imageUrl: "https://drive.google.com/file/d/1Q3925z-lrRKdvY0F4jzd9hP536CDbvpl/view?usp=sharing",
    sizes: ["S/M", "L/XL"],
  },
  {
    name: "Black and Yellow Bull FRW",
    description: "Premium Friesian Ranchwear cap with black and yellow bull design.",
    basePrice: 50,
    category: "Hats",
    active: true,
    imageUrl: "https://drive.google.com/file/d/1zGrqebwxJrMStHegOAO21EHaiXO5Y7SF/view?usp=sharing",
    sizes: ["S/M", "L/XL"],
  },
];

async function main() {
  console.log('Seeding products...');

  // Clear existing products
  await prisma.productImage.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  console.log('Cleared existing products');

  // Insert products
  for (const product of products) {
    const created = await prisma.product.create({
      data: {
        name: product.name,
        description: product.description,
        basePrice: product.basePrice,
        category: product.category,
        active: product.active,
        images: {
          create: [{
            url: product.imageUrl,
            alt: product.name,
            position: 0,
          }],
        },
        variants: {
          create: product.sizes.map(size => ({
            size,
            stock: 10,
          })),
        },
      },
    });
    console.log(`Created: ${created.name}`);
  }

  console.log('Products seeded!');

  // Seed test orders
  console.log('Seeding test orders...');

  // Clear existing orders
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();

  // Get product variants for orders
  const variants = await prisma.productVariant.findMany({
    include: { product: true }
  });

  if (variants.length > 0) {
    const testOrders = [
      {
        status: 'DELIVERED',
        guestEmail: 'maria.gonzalez@email.com',
        guestName: 'Maria Gonzalez',
        guestPhone: '(512) 555-0123',
        subtotal: 105.00,
        shipping: 8.00,
        tax: 8.65,
        total: 121.65,
        shippingName: 'Maria Gonzalez',
        shippingStreet: '1234 Ranch Road',
        shippingCity: 'Austin',
        shippingState: 'TX',
        shippingZip: '78701',
        shippingCountry: 'US',
        createdAt: new Date('2026-01-05'),
      },
      {
        status: 'SHIPPED',
        guestEmail: 'carlos.ramirez@email.com',
        guestName: 'Carlos Ramirez',
        guestPhone: '(214) 555-0456',
        subtotal: 55.00,
        shipping: 8.00,
        tax: 5.20,
        total: 68.20,
        shippingName: 'Carlos Ramirez',
        shippingStreet: '5678 Longhorn Ave',
        shippingStreet2: 'Apt 2B',
        shippingCity: 'Dallas',
        shippingState: 'TX',
        shippingZip: '75201',
        shippingCountry: 'US',
        createdAt: new Date('2026-01-10'),
      },
      {
        status: 'PROCESSING',
        guestEmail: 'jose.martinez@email.com',
        guestName: 'Jose Martinez',
        subtotal: 50.00,
        shipping: 8.00,
        tax: 4.79,
        total: 62.79,
        shippingName: 'Jose Martinez',
        shippingStreet: '910 Western Blvd',
        shippingCity: 'Houston',
        shippingState: 'TX',
        shippingZip: '77001',
        shippingCountry: 'US',
        createdAt: new Date('2026-01-11'),
      },
      {
        status: 'PENDING',
        guestEmail: 'ana.flores@email.com',
        guestName: 'Ana Flores',
        subtotal: 110.00,
        shipping: 0.00,
        tax: 9.08,
        total: 119.08,
        shippingName: 'Ana Flores',
        shippingStreet: '222 Rodeo Drive',
        shippingCity: 'San Antonio',
        shippingState: 'TX',
        shippingZip: '78201',
        shippingCountry: 'US',
        createdAt: new Date('2026-01-12'),
      },
    ];

    for (let i = 0; i < testOrders.length; i++) {
      const orderData = testOrders[i];
      const variant = variants[i % variants.length];

      const order = await prisma.order.create({
        data: {
          ...orderData,
          items: {
            create: [{
              variantId: variant.id,
              quantity: orderData.subtotal > 100 ? 2 : 1,
              unitPrice: variant.product.basePrice,
              productName: variant.product.name,
              size: variant.size,
            }]
          }
        }
      });
      console.log(`Created order: #${order.id.slice(-8).toUpperCase()}`);
    }
  }

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
