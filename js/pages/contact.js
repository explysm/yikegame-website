document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.getElementById('contactForm');
    const submitBtn = document.getElementById('submitBtn');
    const formFeedback = document.getElementById('formFeedback');


        // Placeholder for sending message without Discord webhook
        formFeedback.textContent = 'Message sent successfully! (Discord integration removed)';
        formFeedback.style.color = '#4CAF50'; // Green for success
        contactForm.reset(); // Clear the form
    });
});

