/**
 * PARKX — Smart Parking System | Science Fair Project
 * Website Interactive Controller, Entry Gatekeeper & Launch App Config
 */

// =========================================================================
// 1. APPLICATION CONFIGURATION & CREDENTIALS
// =========================================================================
// Replace APP_URL with the actual application URL or APK download location later.
const APP_URL = "#";

// Fixed Website Access Credentials
const REQUIRED_USERNAME = "PARKX";
const REQUIRED_PASSWORD = "PARKX 2026";

document.addEventListener('DOMContentLoaded', () => {
    // =========================================================================
    // 2. WEBSITE ENTRY ACCESS SCREEN GATEKEEPER
    // =========================================================================
    const websiteAccessScreen = document.getElementById('websiteAccessScreen');
    const websiteContent = document.getElementById('websiteContent');
    const accessForm = document.getElementById('accessForm');
    const accessUsername = document.getElementById('accessUsername');
    const accessPassword = document.getElementById('accessPassword');
    const accessError = document.getElementById('accessError');

    // Check if session access is already granted
    const isAccessGranted = sessionStorage.getItem('parkx_access_granted') === 'true';

    function grantAccess() {
        sessionStorage.setItem('parkx_access_granted', 'true');
        websiteAccessScreen.classList.add('hidden');
        websiteContent.classList.remove('hidden');
    }

    function restrictAccess() {
        websiteAccessScreen.classList.remove('hidden');
        websiteContent.classList.add('hidden');
    }

    if (isAccessGranted) {
        grantAccess();
    } else {
        restrictAccess();
    }

    if (accessForm) {
        accessForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const inputUser = accessUsername.value.trim();
            const inputPass = accessPassword.value.trim();

            if (inputUser === REQUIRED_USERNAME && inputPass === REQUIRED_PASSWORD) {
                accessError.classList.add('hidden');
                grantAccess();
            } else {
                accessError.classList.remove('hidden');
                accessPassword.value = '';
                accessPassword.focus();
            }
        });
    }

    // =========================================================================
    // 3. LAUNCH APP BUTTON BINDINGS
    // =========================================================================
    const launchAppButtons = document.querySelectorAll('.launch-app-btn');
    
    launchAppButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            if (APP_URL && APP_URL !== "#") {
                window.open(APP_URL, '_blank');
            } else {
                // If APP_URL is not configured yet, scroll to the App Overview section
                const appSection = document.getElementById('app-overview');
                if (appSection) {
                    appSection.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    });

    // =========================================================================
    // 4. VISITOR FAQ ACCORDION INTERACTION
    // =========================================================================
    const faqQuestions = document.querySelectorAll('.faq-question');

    faqQuestions.forEach(button => {
        button.addEventListener('click', () => {
            const faqItem = button.parentElement;
            const isActive = faqItem.classList.contains('active');

            // Close all open accordion items
            document.querySelectorAll('.faq-item').forEach(item => {
                item.classList.remove('active');
            });

            // Toggle selected item
            if (!isActive) {
                faqItem.classList.add('active');
            }
        });
    });

    // =========================================================================
    // 5. MOBILE NAVIGATION TOGGLE
    // =========================================================================
    const mobileToggle = document.getElementById('mobileToggle');
    const navLinks = document.getElementById('navLinks');

    if (mobileToggle && navLinks) {
        mobileToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });

        // Close menu when a link is clicked
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
            });
        });
    }

    // =========================================================================
    // 6. SMOOTH SCROLLING FOR ALL NAV LINKS
    // =========================================================================
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId && targetId !== '#') {
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    e.preventDefault();
                    targetElement.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    });
});
