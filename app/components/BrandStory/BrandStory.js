import styles from "./BrandStory.module.css";

export default function BrandStory() {
  return (
    <section className={styles.brandStory}>
      <div className={styles.container}>
        {/* Editorial Header */}
        <header className={styles.header}>
          <span className={styles.eyebrow}>The Story</span>
          <h2 className={styles.heading}>
            Where the Range
            <br />
            <span className={styles.headingAccent}>Meets the Streets</span>
          </h2>
          <div className={styles.rule} aria-hidden="true" />
        </header>

        {/* Lead Statement */}
        <p className={styles.lead}>
          Some of us grew up with boots in the dirt and dreams in the city.
          Friesian was made for that in-between—where tradition meets ambition.
        </p>

        {/* Editorial Content Grid */}
        <div className={styles.editorial}>
          <div className={styles.columnMain}>
            <p>
              Our families taught us to work hard and stay humble. We took that
              energy everywhere—from the ranch to the block, from small towns to
              big stages. Friesian carries that same spirit in every piece.
            </p>
            <p>
              This is quality you can feel. Designs that respect where you have
              been and look good wherever you are headed.
            </p>
          </div>

          {/* Pull Quote */}
          <aside className={styles.pullQuote}>
            <blockquote>
              <span className={styles.quoteOpen}>"</span>
              For those who never forgot where they came from.
              <span className={styles.quoteClose}>"</span>
            </blockquote>
          </aside>

          <div className={styles.columnSecondary}>
            <p>
              You do not have to choose between country and city. Friesian
              bridges both worlds so you can show up as your full self.
            </p>
            <p className={styles.signoff}>This is your style. Own it.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
