document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.getElementById('contactForm');
    const submitBtn = document.getElementById('submitBtn');
    const formFeedback = document.getElementById('formFeedback');
    const webhookUrl = 'https://discord.com/api/webhooks/1437660356200763503/GtN4Igk1Ud5WVognxV1rnYmoJ3LS0fFm5ZJdYNWbetN2rzwfWM34Q6RA7n07wWPiQApO';

    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        submitBtn.disabled = true;
        formFeedback.textContent = 'Sending message...';
        formFeedback.style.color = '#01edf0';

        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const subject = document.getElementById('subject').value;
        const message = document.getElementById('message').value;

        const discordMessageContent = `**Subject:** ${subject}\n**Message:** ${message}\n**From:** ${name} <${email}>`;

        const payload = {
            username: email,
            content: discordMessageContent
        };

        try {
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                formFeedback.textContent = 'Message sent successfully! We will get back to you soon.';
                formFeedback.style.color = '#4CAF50';
                contactForm.reset();
            } else {
                const errorData = await response.json();
                formFeedback.textContent = `Failed to send message. Error: ${errorData.message || response.statusText}`;
                formFeedback.style.color = '#ff007f';
            }
        } catch (error) {
            formFeedback.textContent = `An unexpected error occurred: ${error.message}`;
            formFeedback.style.color = '#ff007f';
            console.error('Error sending webhook:', error);
        } finally {
            submitBtn.disabled = false;
        }
    });
});

