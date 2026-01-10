import styles from "./ProductShowcase.module.css";

const products = [
  { id: 1, name: "Classic Western Tee", price: "$45.00", color: "#8B4513" },
  { id: 2, name: "Range Rider Hoodie", price: "$89.00", color: "#D2691E" },
  { id: 3, name: "Trail Blazer Cap", price: "$35.00", color: "#B8860B" },
  { id: 4, name: "Desert Storm Jacket", price: "$120.00", color: "#36454F" },
  { id: 5, name: "Frontier Jeans", price: "$75.00", color: "#8B4513" },
  { id: 6, name: "Rancher Flannel", price: "$65.00", color: "#D2691E" },
];

export default function ProductShowcase() {
  return (
    <section className={styles.showcase}>
      <div className={styles.container}>
        <h2 className={styles.heading}>Our Collection</h2>
        <div className={styles.grid}>
          {products.map((product) => (
            <a
              key={product.id}
              href="#tiktok-shop"
              className={styles.card}
            >
              <div
                className={styles.imagePlaceholder}
                style={{ backgroundColor: product.color }}
              />
              <div className={styles.cardContent}>
                <h3 className={styles.productName}>{product.name}</h3>
                <p className={styles.productPrice}>{product.price}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
