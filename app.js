// Wait for DOM to load
document.addEventListener("DOMContentLoaded", () => {

    // --- Dark Mode Toggle ---
    const themeToggle = document.getElementById('theme-toggle');
    const htmlEl = document.documentElement;
    const themeIcon = themeToggle.querySelector('.theme-icon');

    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        htmlEl.classList.add('dark');
        themeIcon.textContent = 'light_mode';
    }

    themeToggle.addEventListener('click', () => {
        htmlEl.classList.toggle('dark');
        if (htmlEl.classList.contains('dark')) {
            themeIcon.textContent = 'light_mode';
        } else {
            themeIcon.textContent = 'dark_mode';
        }
    });

    // --- Lenis Smooth Scrolling ---
    const lenis = new Lenis({
        duration: 1.2, // smoothing duration
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // ease-out
        direction: 'vertical',
        gestureDirection: 'vertical',
        smooth: true,
        mouseMultiplier: 1,
        smoothTouch: false,
        touchMultiplier: 2,
        infinite: false,
    });

    // lenis.on('scroll', (e) => {
    //     console.log(e)
    // })

    // Connect Lenis to GSAP ScrollTrigger
    lenis.on('scroll', ScrollTrigger.update);

    gsap.ticker.add((time) => {
        lenis.raf(time * 1000);
    });

    gsap.ticker.lagSmoothing(0);


    // --- GSAP Animations ---
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });

    // 1. Initial Hero Load Animation
    const heroTl = gsap.timeline();

    // Set initial states
    gsap.set(".hero-item", { y: 40, opacity: 0 });
    gsap.set(".gsap-nav", { y: -20, opacity: 0 });

    heroTl.to(".gsap-nav", {
        y: 0,
        opacity: 1,
        duration: 1,
        ease: "power3.out"
    })
        .to(".hero-item", {
            y: 0,
            opacity: 1,
            duration: 1.2,
            stagger: 0.15,
            ease: "power4.out"
        }, "-=0.5");

    // 2. Parallax background in hero
    gsap.to(".bg-animation", {
        yPercent: 30,
        ease: "none",
        scrollTrigger: {
            trigger: "header",
            start: "top top",
            end: "bottom top",
            scrub: true
        }
    });

    // 3. Reveal Text on Scroll (Philosophy section)
    const revealTexts = gsap.utils.toArray('.reveal-text');
    revealTexts.forEach(text => {
        gsap.fromTo(text,
            { y: 50, opacity: 0 },
            {
                y: 0,
                opacity: 1,
                duration: 1.5,
                ease: "power4.out",
                scrollTrigger: {
                    trigger: text,
                    start: "top 85%", // Trigger when element is 85% down viewport
                    toggleActions: "play none none reverse"
                }
            }
        );
    });

    // Icon spin trigger
    gsap.to(".icon-spin", {
        rotation: 180,
        scrollTrigger: {
            trigger: ".icon-spin",
            start: "top bottom",
            end: "bottom top",
            scrub: 1
        }
    });

    // 4. Side Reveals (Toolbox section)
    gsap.fromTo(".reveal-side-left",
        { x: -50, opacity: 0 },
        {
            x: 0,
            opacity: 1,
            duration: 1.2,
            ease: "power3.out",
            scrollTrigger: {
                trigger: "#about",
                start: "top 75%",
            }
        }
    );

    gsap.fromTo(".reveal-side-right",
        { x: 50, opacity: 0 },
        {
            x: 0,
            opacity: 1,
            duration: 1.2,
            ease: "power3.out",
            scrollTrigger: {
                trigger: "#about",
                start: "top 70%",
            }
        }
    );

    // Tag stagger animation (using each container separately)
    const tagContainers = gsap.utils.toArray('.tag-stagger');
    tagContainers.forEach(container => {
        gsap.fromTo(container.querySelectorAll("span"),
            { y: 20, opacity: 0 },
            {
                y: 0,
                opacity: 1,
                duration: 0.6,
                stagger: 0.05,
                ease: "back.out(1.7)",
                scrollTrigger: {
                    trigger: container,
                    start: "top 95%"
                }
            }
        );
    });

    // 5. Work Section Header & Projects
    gsap.fromTo(".header-reveal",
        { y: 40, opacity: 0 },
        {
            y: 0,
            opacity: 1,
            duration: 1,
            ease: "power3.out",
            scrollTrigger: {
                trigger: "#work",
                start: "top 80%"
            }
        }
    );
    // 5b. Project Carousel Swiper Logic
    if (document.querySelector('.project-swiper')) {
        const projectSwiper = new Swiper('.project-swiper', {
            loop: true,
            loopedSlides: 5,
            slidesPerView: 'auto',
            centeredSlides: true,
            spaceBetween: 32, // gap-8 equivalent
            navigation: {
                nextEl: '.next-project',
                prevEl: '.prev-project',
            },
            keyboard: {
                enabled: true,
            },
            grabCursor: true,
            speed: 600,
            on: {
                init: function () {
                    // recalc on load so the first slide gets the active class
                    setTimeout(() => {
                        this.update();
                    }, 50);
                }
            }
        });

        // Entrance animation
        gsap.fromTo('.project-swiper',
            { y: 60, opacity: 0 },
            {
                y: 0,
                opacity: 1,
                duration: 1.2,
                ease: "power3.out",
                scrollTrigger: {
                    trigger: '.project-carousel-viewport',
                    start: "top 85%",
                }
            }
        );
    }

    // 6. Experience Cards Stagger
    const staggerContainers = gsap.utils.toArray('.stagger-cards');
    staggerContainers.forEach(container => {
        gsap.fromTo(container.querySelectorAll("> div"),
            { y: 60, opacity: 0 },
            {
                y: 0,
                opacity: 1,
                duration: 1,
                stagger: 0.2,
                ease: "power3.out",
                scrollTrigger: {
                    trigger: container,
                    start: "top 95%"
                }
            }
        );
    });

    // refresh ScrollTrigger once everything has painted
    window.addEventListener('load', () => {
        ScrollTrigger.refresh();
    });
    setTimeout(() => ScrollTrigger.refresh(), 500);

    // 7. Footer Reveal
    gsap.fromTo(".footer-content",
        { y: -50, opacity: 0 },
        {
            y: 0,
            opacity: 1,
            duration: 1.5,
            ease: "power3.out",
            scrollTrigger: {
                trigger: "footer",
                start: "top 90%"
            }
        }
    );
});
