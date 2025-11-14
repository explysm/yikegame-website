// Common fade transition utility used across multiple pages
export function initFadeTransitions() {
    document.body.classList.add('fade-enter');
    setTimeout(() => {
        document.body.classList.add('fade-enter-active');
    }, 10);

    document.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href && !href.startsWith('http')) {
                e.preventDefault();
                document.body.classList.remove('fade-enter-active');
                document.body.classList.add('fade-exit-active');
                setTimeout(() => { window.location.href = href; }, 500);
            }
        });
    });
}

