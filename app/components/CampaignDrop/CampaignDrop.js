"use client";

import Image from "next/image";
import styles from "./CampaignDrop.module.css";

const hats = [
  {
    src: "/campaign/01-sad-forever-x-dandy.jpg",
    label: "Sad Forever × Dandy",
    number: "01",
  },
  {
    src: "/campaign/02-dandy-x-sad-boyz.jpg",
    label: "Dandy × Sad Boyz",
    number: "02",
  },
  {
    src: "/campaign/03-rude-ny-cross.jpg",
    label: "Rude NY Cross",
    number: "03",
  },
  {
    src: "/campaign/04-rude-awakening-cross.jpg",
    label: "Rude Awakening Cross",
    number: "04",
  },
];

export default function CampaignDrop() {
  return (
    <section className={styles.section} aria-labelledby="campaign-title">
      <div className={styles.intro}>
        <p className={styles.eyebrow}>Campaign 01 / New headwear</p>
        <h2 id="campaign-title" className={styles.heading}>
          BUILT AFTER DARK.
        </h2>
        <p className={styles.copy}>
          Four silhouettes. Heavy embroidery. Every detail stays visible.
        </p>
      </div>

      <div className={styles.editorialGrid}>
        {hats.map((hat, index) => (
          <article
            key={hat.src}
            className={`${styles.card} ${index === 0 || index === 3 ? styles.tall : ""}`}
          >
            <Image
              src={hat.src}
              alt={`${hat.label} Friesian Ranchwear cap`}
              fill
              sizes="(max-width: 720px) 100vw, 50vw"
              className={styles.image}
            />
            <div className={styles.shade} />
            <span className={styles.number}>{hat.number}</span>
            <h3 className={styles.label}>{hat.label}</h3>
          </article>
        ))}
      </div>

      <div className={styles.filmPanel}>
        <div className={styles.filmCopy}>
          <p className={styles.eyebrow}>Friesian motion study / Local H3</p>
          <h3>THE DROP MOVES.</h3>
          <p>
            A generative liquid-motion plate built around the real product, then
            cut back into the campaign system.
          </p>
          <a href="/products" className={styles.link}>View the collection</a>
        </div>
        <div className={styles.videoFrame}>
          <video
            src="/campaign/friesian-liquid-morph-8s.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-label="Friesian Sad Forever cap liquid-motion campaign film"
          />
          <div className={styles.videoMark}>FRIESIAN / FILM 001</div>
        </div>
      </div>
    </section>
  );
}
