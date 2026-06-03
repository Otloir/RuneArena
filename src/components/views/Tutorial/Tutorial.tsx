import { useEffect, useRef, useState, type ReactNode, useId } from "react";
import type { ReactElement } from "react";
import styles from "./Tutorial.module.css";
import IconButton from "../../atoms/buttons/IconButton";

import healthIcon from "./../../../assets/icons/health_icon.svg";
import evadeIcon from "./../../../assets/icons/evade_icon.svg";
import defenceIcon from "./../../../assets/icons/defence_icon.svg";
import speedIcon from "./../../../assets/icons/speed_icon.svg";
import arrowUpIcon from "./../../../assets/icons/arrow_up_icon.svg";
import closeIcon from "./../../../assets/icons/close_icon.svg";
import typeChartImage from "./../../../assets/images/type_chart.svg";

interface TextCarouselProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TextEntry {
  tag: "h3" | "p";
  text: string;
}

interface PropertyEntry {
  tag: "property";
  name: string;
  description: string;
  icon: string;
  colorVar: string;
}

interface ImageEntry {
  tag: "image";
  src: string;
  alt: string;
}

type SlideEntry = TextEntry | PropertyEntry | ImageEntry;

interface Slide {
  accName: string;
  title: string;
  content: SlideEntry[];
}

const infoSlides: Slide[] = [
  {
    accName: "How to play",
    title: "How to Play",
    content: [
      { tag: "h3", text: "What is RuneArena?" },
      {
        tag: "p",
        text: "RuneArena is a turn-based creature-fighting game: 1v1 battles where you match your creature against a single opponent. Win fights to earn RC (RuneCoins), XP, and Stamps*.",
      },
      { tag: "h3", text: "Battle" },
      {
        tag: "p",
        text: "Battles are played in turns. On your turn you choose one of your creature's available moves or use an item from your Bag. Moves may deal damage, while items may apply effects, or alter stats. The first side to reduce their opponent's HP to 0 wins.",
      },
      {
        tag: "p",
        text: "Status boosts from items last for the duration of the current match only. Use items strategically — they are consumed on use.",
      },
      {
        tag: "p",
        text: "* Stamps are only available if you're logged into your account on loopland.se.",
      },
    ],
  },
  {
    accName: "Levels",
    title: "Levels",
    content: [
      { tag: "h3", text: "How do you level up?" },
      {
        tag: "p",
        text: "You earn XP by winning battles and completing matches. When a creature reaches the XP threshold for the next level it levels up, which unlocks new moves to use during battles!",
      },
      { tag: "h3", text: "Max Level" },
      {
        tag: "p",
        text: "Each creature can currently only reach level 4.",
      },
    ],
  },
  {
    accName: "Properties",
    title: "Properties",
    content: [
      { tag: "h3", text: "What are Properties?" },
      {
        tag: "p",
        text: "Properties are your creature's core stats. Every creature has different base values, and you can boost them temporarily during battle with items from the Store.",
      },
      {
        tag: "property",
        name: "Health",
        description:
          "How much damage your creature can take before it faints. ",
        icon: healthIcon,
        colorVar: "--health",
      },
      {
        tag: "property",
        name: "Evade",
        description:
          "The chance to avoid an incoming attack. Higher evade makes it more likely an enemy attack will miss.",
        icon: evadeIcon,
        colorVar: "--evade",
      },
      {
        tag: "property",
        name: "Defence",
        description: "Reduces the damage taken from enemy attacks.",
        icon: defenceIcon,
        colorVar: "--defense",
      },
      {
        tag: "property",
        name: "Speed",
        description: "Determines which creature acts first each turn.",
        icon: speedIcon,
        colorVar: "--speed",
      },
    ],
  },
  {
    accName: "Types",
    title: "Types",
    content: [
      { tag: "h3", text: "Type Effectiveness" },
      {
        tag: "p",
        text: "Each creature belongs to a type that affects how much damage it deals and receives. For example, Grass is strong against Water, but weak to Fire. Normal type is neutral against all other types.",
      },
      { tag: "h3", text: "Type Chart" },
      {
        tag: "p",
        text: "Picking the right type matchup can turn the tide of any fight. Here is a Type Chart to help with that:",
      },
      {
        tag: "image",
        src: typeChartImage,
        alt: "Type chart showing the effectiveness between creature types: Fire beats grass, Grass beats water, Water beats fire, normal is not strong or effective againsed anything",
      },
    ],
  },
  {
    accName: "Store",
    title: "Store",
    content: [
      { tag: "h3", text: "Items" },
      {
        tag: "p",
        text: "The store sells items that can give your creature an edge in battle. Some boost your creatures stats, others restore HP when you're in critical condition. Each item costs a different amount of RC.",
      },
      { tag: "h3", text: "Bag" },
      {
        tag: "p",
        text: "Items you purchase are stored in your Bag. You can only use them during battle, and each item is consumed on use — so spend wisely!",
      },
    ],
  },
];

function highlightKeywords(text: string): ReactNode {
  if (!text) return text;
  const parts: ReactNode[] = [];
  const regex =
    /\b(XP|RC|Stamps?|loopland.se?|Stamp|HP|Health|Evade|Speed|Defence|Defense|Fire|Grass|Normal|Water)\b/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const idx = match.index;
    if (idx > lastIndex) parts.push(text.slice(lastIndex, idx));
    const token = match[1];
    const key = token.toLowerCase();
    let cls = styles.keywordStamp;
    if (key === "xp") cls = styles.keywordXp;
    else if (key === "rc") cls = styles.keywordRc;
    else if (key === "hp" || key === "health") cls = styles.keywordHp;
    else if (key === "evade") cls = styles.keywordEvade;
    else if (key === "speed") cls = styles.keywordSpeed;
    else if (key === "defence" || key === "defense")
      cls = styles.keywordDefence;
    else if (key === "fire") cls = styles.keywordFire;
    else if (key === "grass") cls = styles.keywordGrass;
    else if (key === "water") cls = styles.keywordWater;
    else if (key === "normal") cls = styles.keywordNormal;

    parts.push(
      <span key={`${idx}-${token}`} className={cls}>
        {match[0]}
      </span>,
    );
    lastIndex = idx + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

export default function Tutorial({
  isOpen,
  onClose,
}: TextCarouselProps): ReactElement | null {
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const dialogRef = useRef<HTMLElement | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const uid = useId();
  const descId = `tutorial-desc-${uid}`;
  const slideLiveId = `tutorial-slide-live-${uid}`;

  useEffect(() => {
    if (!isOpen) return;

    const getFocusableElements = (root: HTMLElement): HTMLElement[] =>
      Array.from(
        root.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      );

    const focusFirstDialogElement = (): void => {
      const dialogElement = dialogRef.current;
      if (!dialogElement) return;
      const focusableElements = getFocusableElements(dialogElement);
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
        return;
      }
      dialogElement.focus();
    };

    focusFirstDialogElement();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const dialogElement = dialogRef.current;
      if (!dialogElement) return;

      const focusableElements = getFocusableElements(dialogElement);

      if (focusableElements.length === 0) {
        event.preventDefault();
        dialogElement.focus();
        return;
      }

      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstFocusable) {
        event.preventDefault();
        lastFocusable.focus();
        return;
      }

      if (!event.shiftKey && document.activeElement === lastFocusable) {
        event.preventDefault();
        firstFocusable.focus();
      }
    };

    const handleFocusIn = (event: FocusEvent): void => {
      const dialogElement = dialogRef.current;
      const focusedTarget = event.target;
      if (!(focusedTarget instanceof Node)) return;
      if (!dialogElement || dialogElement.contains(focusedTarget)) return;
      focusFirstDialogElement();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("focusin", handleFocusIn);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("focusin", handleFocusIn);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const previousSlide = () => setActiveSlideIndex((i) => Math.max(0, i - 1));

  const nextSlide = () =>
    setActiveSlideIndex((i) => Math.min(infoSlides.length - 1, i + 1));

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    // Only trigger if horizontal swipe is dominant and long enough
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      if (dx < 0) nextSlide();
      else previousSlide();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  return (
    <div className={styles.textCarouselOverlay} onClick={onClose}>
      <section
        ref={dialogRef}
        className={styles.textCarouselPanel}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="How to play"
        aria-describedby={descId}
        tabIndex={-1}
      >
        <div className={styles.textCarouselHeader}>
           <h1 className={styles.textCarouselTitle}>
            Tutorial
          </h1>

          <IconButton
            onClick={onClose}
            label="Close tutorial"
            aria-describedby={descId}
            iconSrc={closeIcon}
            variant="invisible"
            shape="circle"
            size="md"
            hoverEffect={false}
            iconSize="1.5rem"
            style={{ color: "#000000" }}
            className={styles.textCarouselClose}
          />
        </div>
       

        <div
          className={styles.textCarouselViewport}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className={styles.textCarouselTrack}
            style={{ transform: `translateX(-${activeSlideIndex * 100}%)` }}
          >
            {infoSlides.map((slide, index) => {
              const slideTitleId = `tutorial-slide-${index}-title`;

              return (
                <article
                  key={slide.accName}
                  className={styles.textCarouselSlide}
                  data-accname={slide.accName}
                  inert={index !== activeSlideIndex ? true : undefined}
                  aria-hidden={index !== activeSlideIndex}
                  aria-roledescription="slide"
                  aria-labelledby={slideTitleId}
                >
                  <h2 id={slideTitleId}>{slide.title}</h2>

                  {slide.content.map((entry, index) => {
                    if (entry.tag === "property") {
                      return (
                        <div
                          key={`${slide.accName}-${index}`}
                          className={styles.propertyRow}
                        >
                          <span
                            className={styles.propertyIconWrapper}
                            style={{
                              backgroundColor: `var(${entry.colorVar})`,
                              WebkitMaskImage: `url(${entry.icon})`,
                              maskImage: `url(${entry.icon})`,
                            }}
                            aria-hidden="true"
                          />
                          <div className={styles.propertyText}>
                            <span
                              className={styles.propertyName}
                              style={{ color: `var(${entry.colorVar})` }}
                            >
                              {entry.name}
                            </span>
                            <p className={styles.propertyDesc}>
                              <span aria-hidden="true">
                                {highlightKeywords(entry.description)}
                              </span>
                              <span className={styles.visuallyHidden}>
                                {entry.description}
                              </span>
                            </p>
                          </div>
                        </div>
                      );
                    }

                    if (entry.tag === "h3") {
                      return (
                        <h3 key={`${slide.accName}-${index}`}>{entry.text}</h3>
                      );
                    }

                    if (entry.tag === "image") {
                      return (
                        <img
                          key={`${slide.accName}-${index}`}
                          src={entry.src}
                          alt={entry.alt}
                          className={styles.typeChartImage}
                        />
                      );
                    }

                    if (entry.tag === "p") {
                      return (
                        <p key={`${slide.accName}-${index}`}>
                          <span aria-hidden="true">
                            {highlightKeywords(entry.text)}
                          </span>
                          <span className={styles.visuallyHidden}>
                            {entry.text}
                          </span>
                        </p>
                      );
                    }

                    return null;
                  })}
                </article>
              );
            })}
          </div>
        </div>

        <div className={styles.textCarouselControls}>
          <button
            className={styles.textCarouselNavButton}
            onClick={previousSlide}
            disabled={activeSlideIndex === 0}
            aria-label={
              activeSlideIndex === 0
                ? "Previous slide, already at the first slide"
                : "Previous slide"
            }
          >
            <img
              src={arrowUpIcon}
              alt=""
              aria-hidden="true"
              className={styles.navArrowLeft}
            />
          </button>

          <button
            className={styles.textCarouselNavButton}
            onClick={nextSlide}
            disabled={activeSlideIndex === infoSlides.length - 1}
            aria-label={
              activeSlideIndex === infoSlides.length - 1
                ? "Next slide, already at the last slide"
                : "Next slide"
            }
          >
            <img
              src={arrowUpIcon}
              alt=""
              aria-hidden="true"
              className={styles.navArrowRight}
            />
          </button>
        </div>
        <p id={descId} className={styles.visuallyHidden}>
          Use Tab and Shift+Tab to navigate controls. Press Escape to close.
        </p>

        <span
          id={slideLiveId}
          className={styles.visuallyHidden}
          aria-live="polite"
        >
          {`Slide ${activeSlideIndex + 1} of ${infoSlides.length}: ${infoSlides[activeSlideIndex].title}`}
        </span>
      </section>
    </div>
  );
}
