// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = this.getAttribute('href').substring(1);
        const targetElement = document.getElementById(targetId);
        
        if (targetElement) {
            const offsetTop = targetElement.offsetTop - 64;
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
    });
});

// Active navigation link on scroll
window.addEventListener('scroll', () => {
    const sections = document.querySelectorAll('.section[id]');
    const navLinks = document.querySelectorAll('.nav-link');
    
    let current = '';
    const scrollPosition = window.pageYOffset + 200;
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        const sectionId = section.getAttribute('id');
        
        if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
            current = sectionId;
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        const href = link.getAttribute('href').substring(1);
        if (href === current) {
            link.classList.add('active');
        }
    });
});

// External links open in new tab
document.addEventListener('DOMContentLoaded', () => {
    const links = document.querySelectorAll('a[href^="http"]');
    links.forEach(link => {
        if (!link.hasAttribute('target')) {
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener noreferrer');
        }
    });
});

// Count how many people visit the site (shared, accumulating total; no signup).
document.addEventListener('DOMContentLoaded', () => {
    const countEl = document.getElementById('visitorCount');
    if (countEl) {
        const text = countEl.querySelector('.visitor-count-text');
        fetch('https://abacus.jasoncameron.dev/hit/han-liu-github-io/visits')
            .then(response => response.json())
            .then(data => {
                const n = data && typeof data.value === 'number' ? data.value : null;
                text.textContent = n !== null
                    ? `${n.toLocaleString()} visitors`
                    : 'Visitor count unavailable';
            })
            .catch(() => {
                text.textContent = 'Visitor count unavailable';
            });
    }
});

// Award certificate preview popover: clicking a certificate link opens a
// floating window showing the award image. Scroll the mouse wheel over the
// image to zoom in and out for fine details.
document.addEventListener('DOMContentLoaded', () => {
    const certLinks = document.querySelectorAll('a[href*="certificates/"]');
    if (!certLinks.length) return;

    // One reusable popover for the whole page.
    const popover = document.createElement('div');
    popover.className = 'award-popover';
    popover.hidden = true;
    popover.innerHTML =
        '<button type="button" class="award-popover-close" aria-label="Close">&times;</button>' +
        '<div class="award-popover-body"><img class="award-popover-img" alt="Award certificate" title="Scroll to zoom in/out"></div>';
    document.body.appendChild(popover);

    const body = popover.querySelector('.award-popover-body');
    const popImg = popover.querySelector('.award-popover-img');
    const closeBtn = popover.querySelector('.award-popover-close');
    let anchorEl = null;
    let baseWidth = 0;
    let maxScale = 1;
    let scale = 1;

    const closePopover = () => {
        popover.hidden = true;
        popImg.removeAttribute('src');
        popImg.style.width = '';
        popImg.style.maxWidth = '';
        popImg.style.maxHeight = '';
        baseWidth = 0;
        maxScale = 1;
        scale = 1;
        anchorEl = null;
    };

    const positionPopover = () => {
        if (!anchorEl) return;
        const rect = anchorEl.getBoundingClientRect();
        const pw = popover.offsetWidth;
        const ph = popover.offsetHeight;
        const margin = 12;
        // Prefer placing to the right of the trigger; fall back to the left, then center.
        let left = rect.right + margin;
        if (left + pw > window.innerWidth - margin) {
            left = rect.left - margin - pw;
        }
        if (left < margin) {
            left = Math.max(margin, (window.innerWidth - pw) / 2);
        }
        // Vertically center on the trigger, then clamp to the viewport.
        let top = rect.top + rect.height / 2 - ph / 2;
        top = Math.min(Math.max(margin, top), window.innerHeight - ph - margin);
        if (top < margin) top = margin;
        popover.style.left = left + 'px';
        popover.style.top = top + 'px';
    };

    const applyZoom = () => {
        if (baseWidth <= 0) return;
        popImg.style.maxWidth = 'none';
        popImg.style.maxHeight = 'none';
        popImg.style.width = (baseWidth * scale) + 'px';
    };

    const openPopover = (link) => {
        anchorEl = link;
        scale = 1;
        baseWidth = 0;
        // Reset to the CSS-fitted size so the initial view matches the layout.
        popImg.style.width = '';
        popImg.style.maxWidth = '';
        popImg.style.maxHeight = '';
        popImg.onload = () => {
            // Compute the fitted base size from the natural size (robust to
            // layout timing), matching the CSS max box (620px wide / 84vh tall).
            const maxW = Math.min(620, window.innerWidth * 0.92);
            const maxH = window.innerHeight * 0.84;
            const nw = popImg.naturalWidth || 1;
            const nh = popImg.naturalHeight || 1;
            const fit = Math.min(maxW / nw, maxH / nh, 1);
            baseWidth = nw * fit;
            const baseHeight = nh * fit;
            // Allow zooming until the window nearly fills the screen, so the
            // whole award always stays visible (the window grows, not scrolls).
            const bigW = window.innerWidth * 0.96;
            const bigH = window.innerHeight * 0.92;
            maxScale = Math.max(1, Math.min(bigW / baseWidth, bigH / baseHeight));
            positionPopover();
        };
        popImg.src = link.getAttribute('href');
        popover.hidden = false;
        body.scrollTop = 0;
        body.scrollLeft = 0;
        positionPopover();
    };

    // Award/certificate links -> preview window.
    certLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!popover.hidden && anchorEl === link) {
                closePopover();
            } else {
                openPopover(link);
            }
        });
    });

    // Mouse wheel over the image controls the zoom level.
    popImg.addEventListener('wheel', (e) => {
        if (baseWidth <= 0) return;
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
        scale = Math.min(maxScale, Math.max(1, scale * factor));
        applyZoom();
        positionPopover();
    }, { passive: false });

    closeBtn.addEventListener('click', closePopover);

    // Close when clicking outside the popover.
    document.addEventListener('click', (e) => {
        if (popover.hidden) return;
        if (popover.contains(e.target)) return;
        closePopover();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closePopover();
    });

    window.addEventListener('resize', () => { if (!popover.hidden) positionPopover(); });
    window.addEventListener('scroll', () => { if (!popover.hidden) positionPopover(); }, true);
});
