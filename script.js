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

// Plot the current visitor's location on the footer world map.
// Uses a free, key-less IP geolocation API. No signup required.
document.addEventListener('DOMContentLoaded', () => {
    const map = document.getElementById('worldMap');
    if (map) {
        const dot = document.getElementById('worldMapDot');
        const hint = document.getElementById('worldMapHint');
        const details = document.getElementById('visitorDetails');
        let visitorData = null;

        const escapeHtml = (value) => String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        const renderDetails = () => {
            if (!details) return;
            if (!visitorData) {
                details.innerHTML = '<p class="visitor-details-empty">Visit details are unavailable.</p>';
                return;
            }
            const d = visitorData;
            const rows = [
                ['Location', [d.city, d.region, d.country].filter(Boolean).join(', ')],
                ['Coordinates', (typeof d.latitude === 'number' && typeof d.longitude === 'number')
                    ? `${d.latitude.toFixed(2)}, ${d.longitude.toFixed(2)}` : ''],
                ['IP address', d.ip],
                ['Connection', d.connection && d.connection.isp ? d.connection.isp : ''],
                ['Timezone', d.timezone && d.timezone.id ? d.timezone.id : '']
            ].filter(([, value]) => value);

            details.innerHTML = rows.map(([label, value]) =>
                `<div class="visitor-details-row"><span class="visitor-details-label">${label}</span>` +
                `<span class="visitor-details-value">${escapeHtml(value)}</span></div>`
            ).join('');
        };

        const toggleDetails = () => {
            if (!details) return;
            details.hidden = !details.hidden;
            if (!details.hidden) renderDetails();
        };

        map.addEventListener('click', toggleDetails);
        map.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleDetails();
            }
        });

        fetch('https://ipwho.is/')
            .then(response => response.json())
            .then(data => {
                if (!data || typeof data.latitude !== 'number' || typeof data.longitude !== 'number') {
                    return;
                }
                visitorData = data;
                // Equirectangular projection -> percentage offsets within the map.
                const x = (data.longitude + 180) / 360 * 100;
                const y = (90 - data.latitude) / 180 * 100;
                dot.style.left = x + '%';
                dot.style.top = y + '%';
                dot.hidden = false;
                if (hint) hint.hidden = false;
            })
            .catch(() => { /* leave the dot hidden if lookup fails */ });
    }

    // Count how many people visit the site (shared, accumulating total; no signup).
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

// Image preview popover: clicking an award certificate link or a publication
// picture opens a floating window showing the image. Certificate previews can
// be clicked again to zoom in for fine details.
document.addEventListener('DOMContentLoaded', () => {
    const certLinks = document.querySelectorAll('a[href*="certificates/"]');
    const pubImages = document.querySelectorAll('.pub-image img');
    if (!certLinks.length && !pubImages.length) return;

    // One reusable popover for the whole page.
    const popover = document.createElement('div');
    popover.className = 'award-popover';
    popover.hidden = true;
    popover.innerHTML =
        '<button type="button" class="award-popover-close" aria-label="Close">&times;</button>' +
        '<div class="award-popover-body"><img class="award-popover-img" alt="Preview"></div>';
    document.body.appendChild(popover);

    const body = popover.querySelector('.award-popover-body');
    const popImg = popover.querySelector('.award-popover-img');
    const closeBtn = popover.querySelector('.award-popover-close');
    let anchorEl = null;

    const closePopover = () => {
        popover.hidden = true;
        popover.classList.remove('zoomed');
        popImg.removeAttribute('src');
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

    const openPopover = (src, trigger, allowZoom) => {
        anchorEl = trigger;
        popover.classList.remove('zoomed');
        popImg.classList.toggle('zoomable', !!allowZoom);
        popImg.onload = positionPopover;
        popImg.src = src;
        popover.hidden = false;
        body.scrollTop = 0;
        body.scrollLeft = 0;
        positionPopover();
    };

    // Award/certificate links -> zoomable preview.
    certLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!popover.hidden && anchorEl === link) {
                closePopover();
            } else {
                openPopover(link.getAttribute('href'), link, true);
            }
        });
    });

    // Publication pictures -> simple preview (no zoom).
    pubImages.forEach(img => {
        img.style.cursor = 'pointer';
        img.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!popover.hidden && anchorEl === img) {
                closePopover();
            } else {
                openPopover(img.getAttribute('src'), img, false);
            }
        });
    });

    // Click a zoomable image to toggle full-detail zoom.
    popImg.addEventListener('click', (e) => {
        if (!popImg.classList.contains('zoomable')) return;
        e.stopPropagation();
        popover.classList.toggle('zoomed');
        body.scrollTop = 0;
        body.scrollLeft = 0;
        positionPopover();
    });

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
