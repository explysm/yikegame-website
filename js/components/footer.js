// Footer loader - loads footer component into pages
export function loadFooter(relativePath) {
    const footerContainer = document.getElementById('footer-container');
    if (footerContainer) {
        fetch(relativePath)
            .then(response => response.text())
            .then(html => {
                footerContainer.innerHTML = html;
            })
            .catch(error => {
                console.error('Error loading footer:', error);
            });
    }
}

// Auto-load footer on DOMContentLoaded if container exists
document.addEventListener('DOMContentLoaded', () => {
    const footerContainer = document.getElementById('footer-container');
    if (footerContainer && !footerContainer.innerHTML) {
        // Try to determine relative path based on current page
        const path = window.location.pathname;
        let relativePath = 'components/footer.html';
        if (path.includes('/account/') || path.includes('/community/') || path.includes('/info/')) {
            relativePath = '../../components/footer.html';
        } else if (path.includes('/user/') || path.includes('/contact/') || path.includes('/discord/') || path.includes('/67/')) {
            relativePath = '../components/footer.html';
        }
        loadFooter(relativePath);
    }
});

