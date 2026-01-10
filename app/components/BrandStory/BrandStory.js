import styles from "./BrandStory.module.css";

export default function BrandStory() {
  return (
    <section className={styles.brandStory}>
      <div className={styles.container}>
        <h2 className={styles.heading}>Our Story</h2>
        <div className={styles.content}>
          <div className={styles.column}>
            <p>
              Friesian Ranchwear was born from the crossroads of two worlds: the
              rugged heritage of the American West and the bold pulse of urban
              street culture. We believe that style should not be confined by
              geography or tradition.
            </p>
            <p>
              Growing up between dusty ranch roads and city sidewalks, we saw
              something that others missed. The same spirit that drives a cowboy
              at dawn drives a hustler in the night. Both demand gear that can
              keep up with their grind.
            </p>
          </div>
          <div className={styles.column}>
            <p>
              Our pieces are designed for those who refuse to choose between
              their roots and their ambitions. Whether you are working the land,
              hitting the town, or building your empire, Friesian Ranchwear moves
              with you.
            </p>
            <p>
              This is not just clothing. This is a statement. Where the range
              meets the streets, legends are made. Welcome to the movement.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
