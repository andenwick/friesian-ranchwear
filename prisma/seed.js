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
