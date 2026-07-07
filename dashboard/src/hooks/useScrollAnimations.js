/**
 * useScrollAnimations — Central hook for all scroll-driven GSAP animations.
 *
 * Batches related animations into shared timelines per section
 * (one ScrollTrigger per section, not per element) for performance.
 *
 * Does NOT touch chart data, props, or re-render logic.
 */

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { EASE, EASE_SOFT, DURATION } from '../lib/motion';

export function useScrollAnimations() {
  const contextRef = useRef(null);

  useEffect(() => {
    // Small delay so React has finished painting all sections
    const initTimer = setTimeout(() => {
      // Create a GSAP context for easy cleanup
      contextRef.current = gsap.context(() => {

        /* ====================================================
           1. SCROLL PROGRESS BAR (global)
           ==================================================== */
        const progressBar = document.querySelector('.scroll-progress-bar');
        if (progressBar) {
          ScrollTrigger.create({
            trigger: document.documentElement,
            start: 'top top',
            end: 'bottom bottom',
            onUpdate: (self) => {
              gsap.set(progressBar, { scaleX: self.progress });
            },
          });
        }

        /* ====================================================
           2. SECTION ENTRANCE ANIMATIONS
           ==================================================== */
        const sections = document.querySelectorAll('.page-section');

        sections.forEach((section) => {
          const sectionId = section.id;
          const titleBar = section.querySelector('.section-title-bar');
          const sectionContent = section.querySelector('.section-content');

          // Skip if the overview section — it gets special treatment below
          if (sectionId === 'overview') return;

          // Gather staggerable children inside section-content
          const contentChildren = sectionContent
            ? Array.from(sectionContent.children).flatMap((child) => {
                // If the child is merely a wrapper with one child, target its children
                // to get individual cards / chart containers
                const inner = child.querySelectorAll('[data-chart-card]');
                if (inner.length > 0) return Array.from(inner);
                return [child];
              })
            : [];

          // Separate chart cards (need scale-in) from regular children
          const chartChildren = contentChildren.filter(
            (el) => el.hasAttribute && el.hasAttribute('data-chart-card')
          );
          const regularChildren = contentChildren.filter(
            (el) => !el.hasAttribute || !el.hasAttribute('data-chart-card')
          );
          // Set initial states (GSAP autoAlpha handles visibility)
          if (titleBar) gsap.set(titleBar, { autoAlpha: 0, y: 40 });
          if (regularChildren.length)
            gsap.set(regularChildren, { autoAlpha: 0, y: 30 });
          if (chartChildren.length) {
            gsap.set(chartChildren, { autoAlpha: 0, y: 30, scale: 0.95 });
          }

          // Shared timeline for this section
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: section,
              start: 'top 80%',
              end: 'bottom 20%',
              toggleActions: 'play none none none',
            },
          });

          // Title leads
          if (titleBar) {
            tl.to(titleBar, {
              autoAlpha: 1,
              y: 0,
              duration: DURATION.base,
              ease: EASE,
            });
          }

          // Regular content follows ~0.15s after title start
          if (regularChildren.length) {
            tl.to(
              regularChildren,
              {
                autoAlpha: 1,
                y: 0,
                duration: DURATION.base,
                ease: EASE_SOFT,
                stagger: 0.12,
              },
              titleBar ? 0.15 : 0
            );
          }

          // Chart cards get scale-in + fade
          if (chartChildren.length) {
            tl.to(
              chartChildren,
              {
                autoAlpha: 1,
                y: 0,
                scale: 1,
                duration: DURATION.base,
                ease: EASE_SOFT,
                stagger: 0.12,
              },
              titleBar ? 0.15 : 0
            );
          }
        });

        /* ====================================================
           3. OVERVIEW SECTION — Entrance + Pin + Count-up
           ==================================================== */
        const overview = document.getElementById('overview');
        if (overview) {
          const titleBar = overview.querySelector('.section-title-bar');
          const sectionContent = overview.querySelector('.section-content');

          // Make section-content direct children visible (the DashboardPage wrapper).
          // GSAP controls the inner elements (stat cards, chart cards, blocks) individually.
          if (sectionContent) {
            Array.from(sectionContent.children).forEach((child) => {
              gsap.set(child, { visibility: 'visible' });
            });
          }

          // Gather all animatable children
          const statCards = overview.querySelectorAll('.stat-card');
          const chartCards = overview.querySelectorAll('[data-chart-card]');
          const otherSections = sectionContent
            ? Array.from(sectionContent.querySelectorAll('[data-overview-block]'))
            : [];

          // All content children for stagger entrance
          const allContentEls = [
            ...Array.from(statCards),
            ...Array.from(chartCards),
            ...Array.from(otherSections),
          ];

          // Set initial hidden states
          if (titleBar) gsap.set(titleBar, { autoAlpha: 0, y: 40 });
          if (allContentEls.length)
            gsap.set(allContentEls, { autoAlpha: 0, y: 30 });

          // Chart cards also get scale treatment
          if (chartCards.length) {
            gsap.set(chartCards, { scale: 0.95 });
          }

          // --- Entrance timeline (plays once on scroll-in) ---
          const entranceTl = gsap.timeline({
            scrollTrigger: {
              trigger: overview,
              start: 'top 80%',
              end: 'bottom 20%',
              toggleActions: 'play none none none',
            },
          });

          if (titleBar) {
            entranceTl.to(titleBar, {
              autoAlpha: 1,
              y: 0,
              duration: DURATION.base,
              ease: EASE,
            });
          }

          // Stat cards stagger in
          if (statCards.length) {
            entranceTl.to(
              statCards,
              {
                autoAlpha: 1,
                y: 0,
                duration: DURATION.base,
                ease: EASE_SOFT,
                stagger: 0.12,
              },
              titleBar ? 0.15 : 0
            );
          }

          // Chart cards scale-in
          if (chartCards.length) {
            entranceTl.to(
              chartCards,
              {
                autoAlpha: 1,
                y: 0,
                scale: 1,
                duration: DURATION.base,
                ease: EASE_SOFT,
                stagger: 0.12,
              },
              titleBar ? 0.3 : 0.15
            );
          }

          // Other blocks (threats summary, system status, flows table)
          if (otherSections.length) {
            entranceTl.to(
              otherSections,
              {
                autoAlpha: 1,
                y: 0,
                duration: DURATION.base,
                ease: EASE_SOFT,
                stagger: 0.12,
              },
              '-=0.3'
            );
          }

          // --- Pin + Count-up (scrub-driven) ---
          const statValueEls = overview.querySelectorAll('.stat-value');
          if (statValueEls.length > 0) {
            // Read the target values from the DOM after a short delay
            // so React has rendered them
            const valueTargets = [];

            statValueEls.forEach((el) => {
              const text = el.textContent || '0';
              // Extract numeric value (handles "12.3K", "1.5M", "45 MB", etc.)
              const numMatch = text.match(/([\d,.]+)/);
              const num = numMatch ? parseFloat(numMatch[1].replace(/,/g, '')) : 0;
              valueTargets.push({ el, target: num, originalText: text });
            });

            // Create the pinned scrub timeline
            const pinTl = gsap.timeline({
              scrollTrigger: {
                trigger: overview,
                start: 'top top',
                end: '+=1000',
                pin: true,
                scrub: 1,
                pinSpacing: true,
              },
            });

            // Animate each stat value from 0 → target
            valueTargets.forEach(({ el, target, originalText }) => {
              if (target <= 0) return;

              // Determine suffix (K, M, MB, GB, KB, B, etc.)
              const suffixMatch = originalText.match(/[\d,.]+\s*(.*)/);
              const suffix = suffixMatch ? suffixMatch[1].trim() : '';

              const proxy = { val: 0 };
              pinTl.to(
                proxy,
                {
                  val: target,
                  duration: 1, // relative within scrub timeline
                  ease: 'none',
                  snap: { val: target >= 100 ? 1 : 0.1 },
                  onUpdate: () => {
                    const formatted =
                      target >= 100
                        ? Math.round(proxy.val).toLocaleString()
                        : proxy.val.toFixed(1);
                    el.textContent = suffix ? `${formatted} ${suffix}`.trim() : formatted;
                  },
                },
                0 // all count-ups happen simultaneously
              );
            });
          }
        }

        // Refresh ScrollTrigger after everything is set up
        ScrollTrigger.refresh();
      });
    }, 300);

    return () => {
      clearTimeout(initTimer);
      if (contextRef.current) {
        contextRef.current.revert();
        contextRef.current = null;
      }
    };
  }, []);
}
