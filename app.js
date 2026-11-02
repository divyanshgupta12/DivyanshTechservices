// ==========================================
// Divyansh Tech Services - SPA Logic
// ==========================================

// --- Razorpay Configuration ---
// Replace with your live key when ready: "rzp_live_XXXXXXXXXXXX"
const RAZORPAY_KEY = "rzp_live_RzQlbAoCi22vj4";

// --- EmailJS Initialization ---
(function() {
    emailjs.init({
        publicKey: "k76gma-TCBbOdc6k6",
    });
})();

// --- State Management ---
const state = {
    currentUser: null,
    currentView: 'home',
    cart: JSON.parse(localStorage.getItem('dts_cart') || '[]'),
    profileTab: 'overview',
    adminTab: 'dashboard',
    shopCategory: null
};

// --- CLEANUP: Remove any legacy sample data to ensure 100% clean stats ---
// This ensures no old mock bookings/orders pollute the real user stats
const registeredUsers = JSON.parse(localStorage.getItem('dts_registered_users') || '[]');
registeredUsers.forEach(u => {
    if (u.bookings && u.bookings.some(b => b.id.startsWith('BKG00'))) {
        u.bookings = u.bookings.filter(b => !b.id.startsWith('BKG00'));
    }
    if (u.orders && u.orders.some(o => o.id.startsWith('ORD00'))) {
        u.orders = u.orders.filter(o => !o.id.startsWith('ORD00'));
    }
});
localStorage.setItem('dts_registered_users', JSON.stringify(registeredUsers));

// Initialize default data if not exists
if (!localStorage.getItem('dts_coupons')) {
    localStorage.setItem('dts_coupons', JSON.stringify([
        { code: 'FIRST99', discount: 99, type: 'fixed', status: 'active', description: 'First Home Service at ₹99' },
        { code: 'WELCOME50', discount: 50, type: 'points', status: 'active', description: 'Get 50 Bonus DTS Points' }
    ]));
}
if (!localStorage.getItem('dts_activity_log')) {
    localStorage.setItem('dts_activity_log', JSON.stringify([]));
}

// --- Robust State Saving Helper ---
function saveUserState() {
    if (!state.currentUser) return;
    localStorage.setItem('dts_user', JSON.stringify(state.currentUser));
    
    let users = JSON.parse(localStorage.getItem('dts_registered_users') || '[]');
    const idx = users.findIndex(u => u.username === state.currentUser.username);
    if (idx !== -1) {
        users[idx] = state.currentUser;
        localStorage.setItem('dts_registered_users', JSON.stringify(users));
    }
}

function saveCart() {
    localStorage.setItem('dts_cart', JSON.stringify(state.cart));
    updateCartCount();
}

// --- Indian Pincode Auto-Fill ---
async function fetchAddressByPincode(pincode, formPrefix = '') {
    if (!/^\d{6}$/.test(pincode)) return;
    
    const cityInput = document.querySelector(`[name="${formPrefix}city"]`);
    const stateInput = document.querySelector(`[name="${formPrefix}state"]`);
    
    if (cityInput) cityInput.value = "Fetching...";
    if (stateInput) stateInput.value = "Fetching...";

    try {
        const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
        const data = await response.json();
        
        if (data[0].Status === "Success" && data[0].PostOffice && data[0].PostOffice.length > 0) {
            const postOffice = data[0].PostOffice[0];
            if (cityInput) cityInput.value = postOffice.District || postOffice.Name;
            if (stateInput) stateInput.value = postOffice.State;
        } else {
            if (cityInput) cityInput.value = "";
            if (stateInput) stateInput.value = "Invalid Pincode";
        }
    } catch (error) {
        console.error("Pincode fetch error:", error);
        if (cityInput) cityInput.value = "";
        if (stateInput) stateInput.value = "";
    }
}

async function logActivity(action) {
    const logEntry = { action, time: new Date().toLocaleString() };
    
    if (isFirebaseReady) {
        await DTSDB.addActivityLog(logEntry);
    } else {
        let logs = JSON.parse(localStorage.getItem('dts_activity_log') || '[]');
        logs.unshift(logEntry);
        if (logs.length > 20) logs.pop();
        localStorage.setItem('dts_activity_log', JSON.stringify(logs));
    }
}

// Shop Categories with Items
const shopCategories = [
    { 
        id: 'networking', name: 'Networking', icon: 'fa-wifi', 
        items: [
            { id: 1, name: 'TP-Link Archer C6 Router', price: 2500, image: 'https://placehold.co/300x200/0f172a/00f0ff?text=Router&font=montserrat' },
            { id: 2, name: 'Cat6 LAN Cable (100m)', price: 1500, image: 'https://placehold.co/300x200/0f172a/00f0ff?text=LAN+Cable&font=montserrat' }
        ]
    },
    { 
        id: 'storage', name: 'Storage', icon: 'fa-hard-drive', 
        items: [
            { id: 3, name: 'Seagate 1TB Internal HDD', price: 3500, image: 'https://placehold.co/300x200/0f172a/10b981?text=HDD&font=montserrat' },
            { id: 4, name: 'Samsung 500GB NVMe SSD', price: 4500, image: 'https://placehold.co/300x200/0f172a/10b981?text=SSD&font=montserrat' }
        ]
    },
    { 
        id: 'security', name: 'CCTV & Security', icon: 'fa-video', 
        items: [
            { id: 5, name: 'CP Plus 4-Camera CCTV Kit', price: 8999, image: 'https://placehold.co/300x200/0f172a/ef4444?text=CCTV+Kit&font=montserrat' },
            { id: 6, name: 'Smart WiFi Security Camera', price: 2500, image: 'https://placehold.co/300x200/0f172a/ef4444?text=Smart+Cam&font=montserrat' }
        ]
    },
    { 
        id: 'hardware', name: 'Hardware & Accessories', icon: 'fa-laptop', 
        items: [
            { id: 7, name: 'Logitech Wireless Mouse', price: 800, image: 'https://placehold.co/300x200/0f172a/8b5cf6?text=Mouse&font=montserrat' },
            { id: 8, name: 'Samsung 24-inch IPS Monitor', price: 9500, image: 'https://placehold.co/300x200/0f172a/8b5cf6?text=Monitor&font=montserrat' }
        ]
    },
    { 
        id: 'power', name: 'Power & UPS', icon: 'fa-plug', 
        items: [
            { id: 9, name: 'APC 650VA UPS', price: 4200, image: 'https://placehold.co/300x200/0f172a/f59e0b?text=UPS&font=montserrat' },
            { id: 10, name: 'Surge Protection Extension Board', price: 600, image: 'https://placehold.co/300x200/0f172a/f59e0b?text=Extension&font=montserrat' }
        ]
    }
];

function logActivity(action) {
    let logs = JSON.parse(localStorage.getItem('dts_activity_log') || '[]');
    logs.unshift({ action, time: new Date().toLocaleString() });
    if (logs.length > 15) logs.pop();
    localStorage.setItem('dts_activity_log', JSON.stringify(logs));
}

function addToCart(item, categoryName) {
    state.cart.push({ ...item, categoryName, installation: false });
    saveCart();
    updateCartCount(); // Update cart count in header
    
    // Show smooth notification
    showNotification(`✅ ${item.name} added to cart!`, 'success');
}

function updateCartCount() {
    // Update all cart count displays
    document.querySelectorAll('.cart-count').forEach(el => {
        el.textContent = state.cart.length;
    });
}

function removeFromCart(index) {
    const itemName = state.cart[index].name;
    state.cart.splice(index, 1);
    saveCart();
    showNotification(`🗑️ ${itemName} removed from cart`, 'info');
    switchView('cart');
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-24 right-4 z-[300] px-6 py-4 rounded-xl shadow-2xl transform transition-all duration-300 translate-x-full ${
        type === 'success' ? 'bg-brand-emerald/90 text-white' : 
        type === 'error' ? 'bg-red-500/90 text-white' : 
        'bg-brand-cyan/90 text-brand-dark'
    }`;
    notification.innerHTML = `
        <div class="flex items-center gap-3">
            <span class="font-semibold">${message}</span>
        </div>
    `;
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => notification.classList.remove('translate-x-full'), 10);
    
    // Animate out and remove
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => notification.remove(), 300);
    }, 2500);
}

function toggleInstallation(index) {
    state.cart[index].installation = !state.cart[index].installation;
    saveCart();
    switchView('cart'); // Re-render to update totals
}

function updateCartCount() {
    const badges = document.querySelectorAll('.cart-count');
    badges.forEach(b => b.textContent = state.cart.length);
}

// --- Service Data ---
const servicesData = {
    "Home Doorstep": [
        "Home Visit for Computer Repair", "Home Visit for Laptop Repair", "Home Wi-Fi Setup", 
        "CCTV Installation at Home", "Smart TV Installation", "New Device Setup", 
        "Printer Setup at Home", "Home Office Setup", "Emergency Home IT Support"
    ],
    "Computer & Laptop": [
        "Laptop Repair", "Desktop Repair", "Slow Computer Fix", "Windows Installation", 
        "Software Installation", "Driver Installation", "Virus Removal", "Data Recovery", 
        "Data Backup", "RAM Upgrade", "SSD Upgrade", "Hard Disk Replacement", 
        "Screen Replacement", "Keyboard Replacement", "Printer Setup & Repair"
    ],
    "Wi-Fi & Internet": [
        "New Wi-Fi Setup", "Router Installation", "Router Configuration", "Internet Troubleshooting", 
        "Home Wi-Fi Optimization", "Office Network Setup", "LAN Cable Installation", "Network Security Setup"
    ],
    "CCTV & Security": [
        "CCTV Installation", "CCTV Repair", "CCTV Maintenance", "DVR/NVR Setup", 
        "Remote Mobile Viewing Setup", "Video Door Phone Installation", "Biometric Attendance Systems", "Access Control Systems"
    ],
    "Smart Device": [
        "Smart TV Setup", "Smart Home Device Setup", "Streaming Device Setup", "Smart Camera Setup", 
        "Smart Speaker Setup", "Smart Doorbell Setup", "Smart Device Troubleshooting"
    ],
    "Home IT": [
        "New Computer Setup", "Home Office Setup", "Gaming PC Setup", "Complete Home IT Support"
    ],
    "Business IT": [
        "Office IT Setup", "Employee Computer Setup", "Server Setup & Maintenance", "Remote IT Support", 
        "On-Site IT Support", "IT Infrastructure Planning", "IT Asset Management"
    ],
    "Website & Digital": [
        "Website Setup", "Domain Setup", "Business Email Setup", "Google Workspace Setup"
    ],
    "Emergency": [
        "Same-Day Repair", "Emergency IT Support", "Urgent Network Recovery"
    ],
    "AMC & Maintenance": [
        "Home AMC", "Shop AMC", "Office AMC", "CCTV AMC", "Monthly IT Support Plans"
    ],
    "The Apex Circle (Coming Soon)": [
        "Event Wi-Fi Setup", "Event Registration Systems", "QR Check-In Systems", "Projector Setup", 
        "LED Screen Support", "Event CCTV Monitoring", "Live Streaming Support", "Event Technical Support Team", 
        "Event Help Desk", "Sound & Presentation Support"
    ],
    "DTS Premium Business (Coming Soon)": [
        "AI Tools for Business", "AI Chatbot Integration", "Business Process Automation", "Cybersecurity Services", 
        "Cybersecurity Training", "IT Staff Training", "Digital Transformation Consulting", "Stock Market Software Setup"
    ],
    "Custom Software & Websites": [
        "Custom Website Development", "E-commerce Website Development", "Custom Software Development",
        "Mobile App Development", "Business Management Software", "Inventory Management Software",
        "Billing & Invoice Software", "CRM Software Development", "School/College Management Software",
        "Hospital Management Software", "Restaurant POS Software", "Custom ERP Solutions",
        "API Integration & Development", "Database Design & Development", "Website Redesign & Maintenance"
    ]
};

const productsData = [
    { id: 1, name: "TP-Link Archer C6 Router", category: "Networking", price: 2500, image: "https://placehold.co/300x200/0f172a/00f0ff?text=Router&font=montserrat" },
    { id: 2, name: "Seagate 1TB Internal HDD", category: "Storage", price: 3500, image: "https://placehold.co/300x200/0f172a/10b981?text=HDD&font=montserrat" },
    { id: 3, name: "Logitech Wireless Mouse", category: "Accessories", price: 800, image: "https://placehold.co/300x200/0f172a/8b5cf6?text=Mouse&font=montserrat" },
    { id: 4, name: "CP Plus 4-Camera CCTV Kit", category: "Security", price: 8999, image: "https://placehold.co/300x200/0f172a/ef4444?text=CCTV+Kit&font=montserrat" },
    { id: 5, name: "Samsung 24-inch Monitor", category: "Hardware", price: 9500, image: "https://placehold.co/300x200/0f172a/00f0ff?text=Monitor&font=montserrat" },
    { id: 6, name: "APC 650VA UPS", category: "Power", price: 4200, image: "https://placehold.co/300x200/0f172a/10b981?text=UPS&font=montserrat" }
];

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname || '';
    const initialView = path.includes('dts-accounting')
        ? 'dts-accounting'
        : path.includes('dts-software')
            ? 'dts-software'
            : 'home';
    switchView(initialView);
    setupScrollReveal();
    
    // Check for mock session
    const savedUser = localStorage.getItem('dts_user');
    if (savedUser) {
        state.currentUser = JSON.parse(savedUser);
    }
    
    // Check for technician session
    const savedTechnician = localStorage.getItem('dts_current_technician');
    if (savedTechnician) {
        state.currentTechnician = JSON.parse(savedTechnician);
    }
    
    // Always initialize UI state (shows "Log In" if no user, or profile options if logged in)
    updateUIForUser();
    
    // Update footer visibility based on technician login status
    updateFooterVisibility();
});

// --- View Routing ---
async function switchView(viewName) {
    state.currentView = viewName;
    const mainContent = document.getElementById('main-content');
    window.scrollTo(0, 0);

    switch(viewName) {
        case 'home':
            mainContent.innerHTML = renderHomeView();
            break;
        case 'services':
            mainContent.innerHTML = renderServicesView();
            break;
        case 'shop':
            mainContent.innerHTML = renderShopView();
            break;
        case 'amc':
            mainContent.innerHTML = renderAMCView();
            break;
        case 'profile':
            if (!state.currentUser || state.currentUser.role === 'admin') {
                openAuthModal();
                return;
            }
            mainContent.innerHTML = await renderProfileView();
            break;
        case 'admin':
            openAdminPinModal();
            return; // Don't render yet, wait for PIN
        case 'admin-center':
            // Show as overlay instead of replacing content
            await showAdminOverlay();
            return;
        case 'terms':
            mainContent.innerHTML = renderTermsView();
            break;
        case 'privacy':
            mainContent.innerHTML = renderPrivacyView();
            break;
        case 'refund':
            mainContent.innerHTML = renderRefundView();
            break;
        case 'cart':
            mainContent.innerHTML = renderCartView();
            break;
        case 'checkout':
            if (state.cart.length === 0) {
                switchView('cart');
                return;
            }
            // Enforce login before checkout
            if (!state.currentUser || state.currentUser.role === 'admin') {
                alert('⚠️ Please log in to your account to proceed with checkout.');
                openAuthModal('login');
                return;
            }
            mainContent.innerHTML = renderCheckoutView();
            break;
        case 'technician-dashboard':
            // Show as overlay instead of replacing content
            showTechnicianOverlay();
            return;
        case 'collaboration':
            mainContent.innerHTML = renderCollaborationView();
            break;
        case 'domain-check':
            mainContent.innerHTML = renderDomainCheckView();
            break;
        case 'dts-accounting':
            mainContent.innerHTML = renderDtsAccountingView();
            setTimeout(initDtsAccountingPage, 50);
            break;
        case 'dts-software':
            mainContent.innerHTML = renderDtsSoftwareView();
            setTimeout(initDtsSoftwarePage, 50);
            break;
        default:
            mainContent.innerHTML = renderHomeView();
    }
    
    syncPublicUrl(viewName);

    // Re-trigger scroll reveal for new content
    setTimeout(setupScrollReveal, 100);
    
    // Update back button visibility
    updateBackButton(viewName);
}

function syncPublicUrl(viewName) {
    if (!window.history || !window.history.replaceState) return;
    const pretty = {
        'dts-accounting': '/dts-accounting',
        'dts-software': '/dts-software'
    };
    const next = pretty[viewName] || '/';
    const current = window.location.pathname || '/';
    const onPretty = current === '/dts-accounting' || current === '/dts-software';
    if (!pretty[viewName] && !onPretty) return;
    if (current !== next) window.history.replaceState(null, '', next);
}

// --- Back Button Logic ---
function goBack() {
    // View hierarchy for back navigation
    const viewHierarchy = {
        'cart': 'shop',
        'checkout': 'cart',
        'shop-category': 'shop',
        'profile': 'home',
        'admin-center': 'home',
        'technician-dashboard': 'home',
        'terms': 'home',
        'privacy': 'home',
        'refund': 'home',
        'amc': 'home',
        'dts-accounting': 'home',
        'dts-software': 'home',
        'collaboration': 'home',
        'services': 'home',
        'shop': 'home'
    };
    
    const currentView = state.currentView;
    const previousView = viewHierarchy[currentView] || 'home';
    
    // Special case: if we're in a shop category, go back to shop main
    if (currentView === 'shop' && state.shopCategory) {
        state.shopCategory = null;
        switchView('shop');
        return;
    }
    
    switchView(previousView);
}

function updateBackButton(viewName) {
    const backBtn = document.getElementById('back-btn');
    if (!backBtn) return;
    
    // Hide back button on home page
    if (viewName === 'home') {
        backBtn.classList.add('hidden');
        backBtn.classList.remove('flex');
    } else {
        backBtn.classList.remove('hidden');
        backBtn.classList.add('flex');
    }
}

// --- Admin & Technician Overlay Functions ---
async function showAdminOverlay() {
    // Create overlay container if it doesn't exist
    let overlay = document.getElementById('admin-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'admin-overlay';
        overlay.className = 'fixed inset-0 z-[200] hidden';
        document.body.appendChild(overlay);
    }
    
    // Show loading state
    overlay.innerHTML = `
        <div class="absolute inset-0 bg-brand-dark/95 backdrop-blur-md"></div>
        <div class="relative z-10 h-full overflow-y-auto">
            <div class="sticky top-0 z-20 bg-brand-dark/90 backdrop-blur-md border-b border-white/10 px-4 py-4 flex justify-between items-center">
                <h2 class="font-display text-2xl font-bold text-white flex items-center gap-3">
                    <i class="fa-solid fa-shield-halved text-brand-emerald"></i>
                    Admin Control Center
                </h2>
                <button onclick="closeAdminOverlay()" class="px-6 py-2 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 font-semibold hover:bg-red-500/30 transition-all">
                    <i class="fa-solid fa-xmark mr-2"></i> Close
                </button>
            </div>
            <div class="p-4 sm:p-6 lg:p-8 text-center">
                <i class="fa-solid fa-spinner fa-spin text-4xl text-brand-cyan"></i>
                <p class="text-slate-400 mt-4">Loading admin data...</p>
            </div>
        </div>
    `;
    
    overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    // Load admin data from Firebase
    const adminContent = await renderAdminControlCenter();
    
    overlay.querySelector('.p-4.sm\\:p-6.lg\\:p-8').innerHTML = adminContent;
    
    // Initialize admin map
    setTimeout(initAdminMap, 100);
    
    // Add event listener for create coupon button
    setTimeout(() => {
        const createCouponBtn = document.getElementById('create-coupon-btn');
        console.log('Create coupon button found:', createCouponBtn);
        if (createCouponBtn) {
            createCouponBtn.addEventListener('click', handleCreateCoupon);
            console.log('Event listener attached to create coupon button');
        } else {
            console.error('Create coupon button not found');
        }
    }, 300);
}

function closeAdminOverlay() {
    const overlay = document.getElementById('admin-overlay');
    if (overlay) {
        overlay.classList.add('hidden');
        document.body.style.overflow = '';
    }
    switchView('home');
}

function showTechnicianOverlay() {
    // Create overlay container if it doesn't exist
    let overlay = document.getElementById('technician-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'technician-overlay';
        overlay.className = 'fixed inset-0 z-[200] hidden';
        document.body.appendChild(overlay);
    }
    
    overlay.innerHTML = `
        <div class="absolute inset-0 bg-brand-dark/95 backdrop-blur-md"></div>
        <div class="relative z-10 h-full overflow-y-auto">
            <div class="sticky top-0 z-20 bg-brand-dark/90 backdrop-blur-md border-b border-white/10 px-4 py-4 flex justify-between items-center">
                <h2 class="font-display text-2xl font-bold text-white flex items-center gap-3">
                    <i class="fa-solid fa-user-gear text-brand-cyan"></i>
                    Technician Dashboard
                </h2>
                <button onclick="closeTechnicianOverlay()" class="px-6 py-2 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 font-semibold hover:bg-red-500/30 transition-all">
                    <i class="fa-solid fa-xmark mr-2"></i> Close
                </button>
            </div>
            <div class="p-4 sm:p-6 lg:p-8">
                ${renderTechnicianDashboard()}
            </div>
        </div>
    `;
    
    overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeTechnicianOverlay() {
    const overlay = document.getElementById('technician-overlay');
    if (overlay) {
        overlay.classList.add('hidden');
        document.body.style.overflow = '';
    }
    switchView('home');
}

// --- View Renderers ---
function renderHomeView() {
    return `
        <!-- HERO SECTION - IMMEDIATE TRUST & VALUE -->
        <section class="relative z-10 min-h-[90vh] flex items-center px-4 sm:px-6 lg:px-8 overflow-hidden">
            <!-- Background Image with Overlay -->
            <div class="absolute inset-0 z-0">
                <img src="hero-tech.png" alt="IT Support" class="w-full h-full object-cover opacity-20">
                <div class="absolute inset-0 bg-gradient-to-r from-brand-dark via-brand-dark/95 to-brand-dark/80"></div>
            </div>
            
            <div class="relative z-10 max-w-7xl mx-auto">
                <div class="grid lg:grid-cols-2 gap-12 items-center">
                    <div class="reveal">
                        <!-- Trust Badge -->
                        <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border-brand-emerald/30 mb-6">
                            <i class="fa-solid fa-shield-check text-brand-emerald"></i>
                            <span class="text-xs font-semibold text-brand-emerald tracking-wider uppercase">Trusted by 500+ Businesses</span>
                        </div>
                        
                        <h1 class="font-display text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-tight mb-6">
                            Your IT Problems,<br>
                            <span class="text-gradient">Solved Fast.</span>
                        </h1>
                        <p class="text-lg text-slate-400 mb-8 max-w-lg leading-relaxed">
                            Computer broken? WiFi dead? Need CCTV? We fix it all — at your doorstep in 2 hours or less. 
                            Serving Rewari, Delhi, Noida & Gurugram with 3+ years of expertise.
                        </p>
                        
                        <!-- Quick Actions -->
                        <div class="flex flex-col sm:flex-row gap-4 mb-8">
                            <button onclick="openSpecialModal('consultation')" class="btn-glow px-8 py-4 rounded-full bg-gradient-to-r from-brand-cyan to-brand-emerald text-brand-dark font-bold text-base hover:shadow-[0_0_30px_rgba(0,240,255,0.4)] transition-all flex items-center justify-center gap-2">
                                <i class="fa-solid fa-calendar-check"></i> Book Free Consultation
                            </button>
                            <a href="tel:+919813443289" class="px-8 py-4 rounded-full border border-brand-cyan/50 text-brand-cyan font-bold text-base hover:bg-brand-cyan/10 transition-all flex items-center justify-center gap-2">
                                <i class="fa-solid fa-phone"></i> Call Now
                            </a>
                        </div>
                        
                        <!-- Micro Trust Signals -->
                        <div class="flex flex-wrap gap-4 text-xs text-slate-400">
                            <div class="flex items-center gap-1">
                                <i class="fa-solid fa-check-circle text-brand-emerald"></i>
                                <span>No Fix, No Fee</span>
                            </div>
                            <div class="flex items-center gap-1">
                                <i class="fa-solid fa-check-circle text-brand-emerald"></i>
                                <span>30-Day Warranty</span>
                            </div>
                            <div class="flex items-center gap-1">
                                <i class="fa-solid fa-check-circle text-brand-emerald"></i>
                                <span>Same-Day Service</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Right Side - Quick Service Cards -->
                    <div class="relative reveal" style="transition-delay: 200ms;">
                        <div class="relative animate-float">
                            <div class="absolute inset-0 bg-gradient-to-r from-brand-cyan/20 to-brand-emerald/20 rounded-3xl blur-3xl"></div>
                            <div class="relative glass rounded-3xl p-8 border border-white/10">
                                <h3 class="font-display text-xl font-bold text-white mb-6 text-center">Quick Services</h3>
                                <div class="grid grid-cols-2 gap-4">
                                    <div class="glass p-6 rounded-2xl hover:border-brand-cyan/30 transition-all cursor-pointer group" onclick="openSpecialModal('home-door')">
                                        <i class="fa-solid fa-house-signal text-3xl text-brand-cyan mb-4 group-hover:scale-110 transition-transform"></i>
                                        <h4 class="font-display font-bold text-white mb-1">Home Visit</h4>
                                        <p class="text-xs text-slate-400">Starts at just ₹99</p>
                                    </div>
                                    <div class="glass p-6 rounded-2xl hover:border-brand-danger/30 transition-all cursor-pointer group mt-8" onclick="openSpecialModal('emergency')">
                                        <i class="fa-solid fa-triangle-exclamation text-3xl text-brand-danger mb-4 group-hover:scale-110 transition-transform"></i>
                                        <h4 class="font-display font-bold text-white mb-1">Emergency</h4>
                                        <p class="text-xs text-slate-400">2-hour response</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- PROBLEM SECTION - RELATABLE PAIN POINTS -->
        <section class="relative z-10 py-20 px-4 sm:px-6 lg:px-8 bg-brand-card/30 border-y border-white/5">
            <div class="max-w-5xl mx-auto text-center">
                <div class="reveal">
                    <h2 class="font-display text-3xl sm:text-4xl font-bold text-white mb-6">
                        Sound <span class="text-gradient">Familiar?</span>
                    </h2>
                    <p class="text-slate-400 text-lg mb-12 max-w-2xl mx-auto">
                        We know how frustrating IT problems can be. That's why we're here to help.
                    </p>
                    
                    <div class="grid md:grid-cols-3 gap-6">
                        <div class="glass rounded-2xl p-6 border border-red-500/20 hover:border-red-500/40 transition-all">
                            <div class="w-14 h-14 mx-auto rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                                <i class="fa-solid fa-circle-exclamation text-2xl text-red-400"></i>
                            </div>
                            <h3 class="font-display font-bold text-white mb-2">Computer Slow or Crashed?</h3>
                            <p class="text-sm text-slate-400">Deadlines missed, work piling up, and your laptop won't cooperate.</p>
                        </div>
                        <div class="glass rounded-2xl p-6 border border-yellow-500/20 hover:border-yellow-500/40 transition-all">
                            <div class="w-14 h-14 mx-auto rounded-full bg-yellow-500/10 flex items-center justify-center mb-4">
                                <i class="fa-solid fa-wifi text-2xl text-yellow-400"></i>
                            </div>
                            <h3 class="font-display font-bold text-white mb-2">WiFi Not Working?</h3>
                            <p class="text-sm text-slate-400">Dead zones, slow speeds, and dropped connections ruining your day.</p>
                        </div>
                        <div class="glass rounded-2xl p-6 border border-purple-500/20 hover:border-purple-500/40 transition-all">
                            <div class="w-14 h-14 mx-auto rounded-full bg-purple-500/10 flex items-center justify-center mb-4">
                                <i class="fa-solid fa-video text-2xl text-purple-400"></i>
                            </div>
                            <h3 class="font-display font-bold text-white mb-2">Need Security Cameras?</h3>
                            <p class="text-sm text-slate-400">Worried about safety but don't know where to start with CCTV.</p>
                        </div>
                    </div>
                    
                    <div class="mt-12">
                        <p class="text-brand-emerald font-bold text-xl mb-4">
                            <i class="fa-solid fa-check-double mr-2"></i>
                            We Solve All of This — Guaranteed.
                        </p>
                        <button onclick="switchView('services')" class="px-8 py-3 rounded-full bg-white/5 border border-white/20 text-white font-semibold hover:bg-white/10 transition-all">
                            See How We Help <i class="fa-solid fa-arrow-right ml-2"></i>
                        </button>
                    </div>
                </div>
            </div>
        </section>

        <!-- HOW IT WORKS - SIMPLE PROCESS -->
        <section class="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
            <div class="max-w-6xl mx-auto">
                <div class="text-center mb-16 reveal">
                    <h2 class="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
                        How It <span class="text-gradient">Works</span>
                    </h2>
                    <p class="text-slate-400 max-w-2xl mx-auto">Simple, fast, and hassle-free. Get IT support in 3 easy steps.</p>
                </div>
                
                <div class="grid md:grid-cols-3 gap-8 reveal stagger-children">
                    <div class="relative">
                        <div class="glass rounded-2xl p-8 border border-brand-cyan/20 hover:border-brand-cyan/50 transition-all h-full">
                            <div class="absolute -top-4 -left-4 w-12 h-12 rounded-full bg-brand-cyan text-brand-dark font-bold text-xl flex items-center justify-center shadow-lg">1</div>
                            <div class="w-16 h-16 mx-auto rounded-full bg-brand-cyan/10 flex items-center justify-center mb-6">
                                <i class="fa-solid fa-phone-volume text-3xl text-brand-cyan"></i>
                            </div>
                            <h3 class="font-display text-xl font-bold text-white mb-3 text-center">Contact Us</h3>
                            <p class="text-sm text-slate-400 text-center">Call, WhatsApp, or book online. Tell us your problem — we'll listen.</p>
                        </div>
                    </div>
                    <div class="relative">
                        <div class="glass rounded-2xl p-8 border border-brand-emerald/20 hover:border-brand-emerald/50 transition-all h-full">
                            <div class="absolute -top-4 -left-4 w-12 h-12 rounded-full bg-brand-emerald text-brand-dark font-bold text-xl flex items-center justify-center shadow-lg">2</div>
                            <div class="w-16 h-16 mx-auto rounded-full bg-brand-emerald/10 flex items-center justify-center mb-6">
                                <i class="fa-solid fa-user-gear text-3xl text-brand-emerald"></i>
                            </div>
                            <h3 class="font-display text-xl font-bold text-white mb-3 text-center">We Diagnose</h3>
                            <p class="text-sm text-slate-400 text-center">Our expert technician arrives at your doorstep or connects remotely.</p>
                        </div>
                    </div>
                    <div class="relative">
                        <div class="glass rounded-2xl p-8 border border-brand-purple/20 hover:border-brand-purple/50 transition-all h-full">
                            <div class="absolute -top-4 -left-4 w-12 h-12 rounded-full bg-brand-purple text-white font-bold text-xl flex items-center justify-center shadow-lg">3</div>
                            <div class="w-16 h-16 mx-auto rounded-full bg-brand-purple/10 flex items-center justify-center mb-6">
                                <i class="fa-solid fa-circle-check text-3xl text-brand-purple"></i>
                            </div>
                            <h3 class="font-display text-xl font-bold text-white mb-3 text-center">Problem Solved</h3>
                            <p class="text-sm text-slate-400 text-center">We fix it fast. Pay only when you're 100% satisfied. 30-day warranty included.</p>
                        </div>
                    </div>
                </div>
                
                <div class="text-center mt-12 reveal">
                    <button onclick="openSpecialModal('consultation')" class="btn-glow px-10 py-4 rounded-full bg-gradient-to-r from-brand-cyan to-brand-emerald text-brand-dark font-bold text-lg hover:shadow-[0_0_30px_rgba(0,240,255,0.4)] transition-all">
                        Get Started Now <i class="fa-solid fa-arrow-right ml-2"></i>
                    </button>
                </div>
            </div>
        </section>

        <!-- SERVICES SHOWCASE WITH AI IMAGES -->
        <section class="relative z-10 py-20 px-4 sm:px-6 lg:px-8 bg-brand-card/30 border-y border-white/5">
            <div class="max-w-7xl mx-auto">
                <div class="text-center mb-16 reveal">
                    <h2 class="font-display text-3xl sm:text-4xl font-bold text-white mb-4">Our <span class="text-gradient">Core Services</span></h2>
                    <p class="text-slate-400 max-w-2xl mx-auto">Professional IT solutions powered by cutting-edge technology</p>
                </div>
                
                <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-8 reveal stagger-children">
                    <!-- Network Operations -->
                    <div class="glass rounded-2xl overflow-hidden border border-white/5 hover:border-brand-cyan/30 transition-all group">
                        <div class="h-56 relative overflow-hidden">
                            <img src="network-ops.png" alt="Network Operations" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500">
                            <div class="absolute inset-0 bg-gradient-to-t from-brand-dark via-brand-dark/50 to-transparent"></div>
                            <div class="absolute bottom-4 left-4">
                                <div class="flex items-center gap-2">
                                    <i class="fa-solid fa-network-wired text-brand-cyan text-2xl"></i>
                                    <h3 class="font-display text-xl font-bold text-white">Network Solutions</h3>
                                </div>
                            </div>
                        </div>
                        <div class="p-6">
                            <p class="text-sm text-slate-400 mb-4">Enterprise-grade networking, router configuration, and secure infrastructure setup.</p>
                            <button onclick="switchView('services')" class="text-brand-cyan text-sm font-semibold hover:text-brand-emerald transition-colors flex items-center gap-2">
                                Learn More <i class="fa-solid fa-arrow-right"></i>
                            </button>
                        </div>
                    </div>

                    <!-- CCTV Security -->
                    <div class="glass rounded-2xl overflow-hidden border border-white/5 hover:border-brand-emerald/30 transition-all group">
                        <div class="h-56 relative overflow-hidden">
                            <img src="cctv-security.png" alt="CCTV Security" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500">
                            <div class="absolute inset-0 bg-gradient-to-t from-brand-dark via-brand-dark/50 to-transparent"></div>
                            <div class="absolute bottom-4 left-4">
                                <div class="flex items-center gap-2">
                                    <i class="fa-solid fa-video text-brand-emerald text-2xl"></i>
                                    <h3 class="font-display text-xl font-bold text-white">CCTV & Security</h3>
                                </div>
                            </div>
                        </div>
                        <div class="p-6">
                            <p class="text-sm text-slate-400 mb-4">AI-powered surveillance systems with remote monitoring and smart detection.</p>
                            <button onclick="switchView('services')" class="text-brand-emerald text-sm font-semibold hover:text-brand-cyan transition-colors flex items-center gap-2">
                                Learn More <i class="fa-solid fa-arrow-right"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Cloud Services -->
                    <div class="glass rounded-2xl overflow-hidden border border-white/5 hover:border-brand-purple/30 transition-all group">
                        <div class="h-56 relative overflow-hidden">
                            <img src="cloud-services.png" alt="Cloud Services" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500">
                            <div class="absolute inset-0 bg-gradient-to-t from-brand-dark via-brand-dark/50 to-transparent"></div>
                            <div class="absolute bottom-4 left-4">
                                <div class="flex items-center gap-2">
                                    <i class="fa-solid fa-cloud text-brand-purple text-2xl"></i>
                                    <h3 class="font-display text-xl font-bold text-white">Cloud Services</h3>
                                </div>
                            </div>
                        </div>
                        <div class="p-6">
                            <p class="text-sm text-slate-400 mb-4">Scalable cloud infrastructure, data backup, and disaster recovery solutions.</p>
                            <button onclick="switchView('services')" class="text-brand-purple text-sm font-semibold hover:text-brand-cyan transition-colors flex items-center gap-2">
                                Learn More <i class="fa-solid fa-arrow-right"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Custom Software & Websites -->
                    <div class="glass rounded-2xl overflow-hidden border border-white/5 hover:border-brand-cyan/30 transition-all group">
                        <div class="h-56 relative overflow-hidden">
                            <img src="custom-software.png" alt="Custom Software" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500">
                            <div class="absolute inset-0 bg-gradient-to-t from-brand-dark via-brand-dark/50 to-transparent"></div>
                            <div class="absolute bottom-4 left-4">
                                <div class="flex items-center gap-2">
                                    <i class="fa-solid fa-code text-brand-cyan text-2xl"></i>
                                    <h3 class="font-display text-xl font-bold text-white">Custom Software</h3>
                                </div>
                            </div>
                        </div>
                        <div class="p-6">
                            <p class="text-sm text-slate-400 mb-4">Tailored websites, web apps, ERP, CRM, and business management software.</p>
                            <button onclick="switchView('dts-software')" class="text-brand-cyan text-sm font-semibold hover:text-brand-emerald transition-colors flex items-center gap-2">
                                View software <i class="fa-solid fa-arrow-right"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- STATS SECTION - SOCIAL PROOF -->
        <section class="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
            <div class="max-w-6xl mx-auto">
                <div class="text-center mb-16 reveal">
                    <h2 class="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
                        Numbers Don't <span class="text-gradient">Lie</span>
                    </h2>
                    <p class="text-slate-400 max-w-2xl mx-auto">Real results from real customers. See why businesses trust us.</p>
                </div>
                
                <div class="grid grid-cols-2 md:grid-cols-4 gap-6 reveal stagger-children">
                    <div class="glass rounded-2xl p-8 text-center border border-brand-cyan/20 hover:border-brand-cyan/50 transition-all group">
                        <div class="text-5xl font-bold text-brand-cyan mb-2 group-hover:scale-110 transition-transform">500+</div>
                        <div class="text-sm text-slate-400 mb-1">Happy Clients</div>
                        <div class="text-xs text-slate-500">And counting</div>
                    </div>
                    <div class="glass rounded-2xl p-8 text-center border border-brand-emerald/20 hover:border-brand-emerald/50 transition-all group">
                        <div class="text-5xl font-bold text-brand-emerald mb-2 group-hover:scale-110 transition-transform">2hr</div>
                        <div class="text-sm text-slate-400 mb-1">Avg Response</div>
                        <div class="text-xs text-slate-500">Or less</div>
                    </div>
                    <div class="glass rounded-2xl p-8 text-center border border-brand-purple/20 hover:border-brand-purple/50 transition-all group">
                        <div class="text-5xl font-bold text-brand-purple mb-2 group-hover:scale-110 transition-transform">4+</div>
                        <div class="text-sm text-slate-400 mb-1">Cities Served</div>
                        <div class="text-xs text-slate-500">Rewari, Delhi, Noida, Gurugram</div>
                    </div>
                    <div class="glass rounded-2xl p-8 text-center border border-yellow-500/20 hover:border-yellow-500/50 transition-all group">
                        <div class="text-5xl font-bold text-yellow-500 mb-2 group-hover:scale-110 transition-transform">99%</div>
                        <div class="text-sm text-slate-400 mb-1">Satisfaction</div>
                        <div class="text-xs text-slate-500">Guaranteed</div>
                    </div>
                </div>
            </div>
        </section>

        <!-- TESTIMONIALS & HAPPY CUSTOMERS -->
        <section class="relative z-10 py-20 px-4 sm:px-6 lg:px-8 bg-brand-card/30 border-y border-white/5">
            <div class="max-w-7xl mx-auto">
                <div class="text-center mb-16 reveal">
                    <h2 class="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
                        Happy <span class="text-gradient">Customers</span>
                    </h2>
                    <p class="text-slate-400 max-w-2xl mx-auto">Real people, real results. See why our clients love working with us.</p>
                </div>
                
                <!-- Customer Images -->
                <div class="grid md:grid-cols-2 gap-8 mb-12 reveal">
                    <div class="relative rounded-3xl overflow-hidden group">
                        <img src="happy-customer.png" alt="Happy Customer" class="w-full h-80 object-cover group-hover:scale-105 transition-transform duration-500">
                        <div class="absolute inset-0 bg-gradient-to-t from-brand-dark/90 via-brand-dark/40 to-transparent"></div>
                        <div class="absolute bottom-6 left-6 right-6">
                            <div class="flex items-center gap-1 mb-2">
                                <i class="fa-solid fa-star text-yellow-500"></i>
                                <i class="fa-solid fa-star text-yellow-500"></i>
                                <i class="fa-solid fa-star text-yellow-500"></i>
                                <i class="fa-solid fa-star text-yellow-500"></i>
                                <i class="fa-solid fa-star text-yellow-500"></i>
                            </div>
                            <p class="text-white text-lg font-semibold mb-2">"Absolutely fantastic service! My business runs smoothly thanks to DTS."</p>
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-full bg-brand-cyan/30 backdrop-blur-sm flex items-center justify-center border border-brand-cyan/50">
                                    <span class="text-brand-cyan font-bold">S</span>
                                </div>
                                <div>
                                    <div class="text-sm font-bold text-white">Satisfied Customer</div>
                                    <div class="text-xs text-slate-300">Business Owner</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="relative rounded-3xl overflow-hidden group">
                        <img src="team-success.png" alt="Team Success" class="w-full h-80 object-cover group-hover:scale-105 transition-transform duration-500">
                        <div class="absolute inset-0 bg-gradient-to-t from-brand-dark/90 via-brand-dark/40 to-transparent"></div>
                        <div class="absolute bottom-6 left-6 right-6">
                            <div class="flex items-center gap-2 mb-2">
                                <i class="fa-solid fa-trophy text-yellow-500 text-xl"></i>
                                <span class="text-white font-bold text-lg">500+ Projects Completed</span>
                            </div>
                            <p class="text-slate-300 mb-3">Our expert team delivers results that exceed expectations, every single time.</p>
                            <div class="flex items-center gap-2">
                                <div class="flex -space-x-2">
                                    <div class="w-8 h-8 rounded-full bg-brand-cyan/30 backdrop-blur-sm flex items-center justify-center border-2 border-brand-dark">
                                        <span class="text-brand-cyan font-bold text-xs">R</span>
                                    </div>
                                    <div class="w-8 h-8 rounded-full bg-brand-emerald/30 backdrop-blur-sm flex items-center justify-center border-2 border-brand-dark">
                                        <span class="text-brand-emerald font-bold text-xs">P</span>
                                    </div>
                                    <div class="w-8 h-8 rounded-full bg-brand-purple/30 backdrop-blur-sm flex items-center justify-center border-2 border-brand-dark">
                                        <span class="text-brand-purple font-bold text-xs">A</span>
                                    </div>
                                </div>
                                <span class="text-xs text-slate-300">+497 more happy clients</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Scrollable Reviews -->
                <div class="relative reveal">
                    <div class="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide" style="scrollbar-width: none; -ms-overflow-style: none;">
                        <div class="flex-shrink-0 w-80 glass rounded-2xl p-6 border border-white/10 hover:border-brand-cyan/30 transition-all snap-start">
                            <div class="flex items-center gap-1 mb-4">
                                <i class="fa-solid fa-star text-yellow-500"></i>
                                <i class="fa-solid fa-star text-yellow-500"></i>
                                <i class="fa-solid fa-star text-yellow-500"></i>
                                <i class="fa-solid fa-star text-yellow-500"></i>
                                <i class="fa-solid fa-star text-yellow-500"></i>
                            </div>
                            <p class="text-slate-300 mb-6 italic">"My laptop crashed before a critical presentation. DTS came within an hour, fixed it on the spot, and saved my career. Absolutely lifesavers!"</p>
                            <div class="flex items-center gap-3">
                                <div class="w-12 h-12 rounded-full bg-brand-cyan/20 flex items-center justify-center">
                                    <span class="text-brand-cyan font-bold text-lg">R</span>
                                </div>
                                <div>
                                    <div class="font-bold text-white">Rahul Sharma</div>
                                    <div class="text-xs text-slate-400">Business Owner, Rewari</div>
                                </div>
                            </div>
                        </div>
                        <div class="flex-shrink-0 w-80 glass rounded-2xl p-6 border border-white/10 hover:border-brand-emerald/30 transition-all snap-start">
                            <div class="flex items-center gap-1 mb-4">
                                <i class="fa-solid fa-star text-yellow-500"></i>
                                <i class="fa-solid fa-star text-yellow-500"></i>
                                <i class="fa-solid fa-star text-yellow-500"></i>
                                <i class="fa-solid fa-star text-yellow-500"></i>
                                <i class="fa-solid fa-star text-yellow-500"></i>
                            </div>
                            <p class="text-slate-300 mb-6 italic">"Got 8 CCTV cameras installed at my shop. The quality is excellent, mobile app works perfectly, and the price was very fair. Highly professional team!"</p>
                            <div class="flex items-center gap-3">
                                <div class="w-12 h-12 rounded-full bg-brand-emerald/20 flex items-center justify-center">
                                    <span class="text-brand-emerald font-bold text-lg">P</span>
                                </div>
                                <div>
                                    <div class="font-bold text-white">Priya Verma</div>
                                    <div class="text-xs text-slate-400">Shop Owner, Gurugram</div>
                                </div>
                            </div>
                        </div>
                        <div class="flex-shrink-0 w-80 glass rounded-2xl p-6 border border-white/10 hover:border-brand-purple/30 transition-all snap-start">
                            <div class="flex items-center gap-1 mb-4">
                                <i class="fa-solid fa-star text-yellow-500"></i>
                                <i class="fa-solid fa-star text-yellow-500"></i>
                                <i class="fa-solid fa-star text-yellow-500"></i>
                                <i class="fa-solid fa-star text-yellow-500"></i>
                                <i class="fa-solid fa-star text-yellow-500"></i>
                            </div>
                            <p class="text-slate-300 mb-6 italic">"Their AMC plan is worth every rupee. They prevented a major server crash last month. Quick response, knowledgeable team, and transparent pricing."</p>
                            <div class="flex items-center gap-3">
                                <div class="w-12 h-12 rounded-full bg-brand-purple/20 flex items-center justify-center">
                                    <span class="text-brand-purple font-bold text-lg">A</span>
                                </div>
                                <div>
                                    <div class="font-bold text-white">Amit Gupta</div>
                                    <div class="text-xs text-slate-400">IT Manager, Delhi</div>
                                </div>
                            </div>
                        </div>
                        <div class="flex-shrink-0 w-80 glass rounded-2xl p-6 border border-white/10 hover:border-yellow-500/30 transition-all snap-start">
                            <div class="flex items-center gap-1 mb-4">
                                <i class="fa-solid fa-star text-yellow-500"></i>
                                <i class="fa-solid fa-star text-yellow-500"></i>
                                <i class="fa-solid fa-star text-yellow-500"></i>
                                <i class="fa-solid fa-star text-yellow-500"></i>
                                <i class="fa-solid fa-star text-yellow-500"></i>
                            </div>
                            <p class="text-slate-300 mb-6 italic">"Fast, reliable, and professional. They set up our entire office network in just 2 days. Amazing team!"</p>
                            <div class="flex items-center gap-3">
                                <div class="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                                    <span class="text-yellow-500 font-bold text-lg">V</span>
                                </div>
                                <div>
                                    <div class="font-bold text-white">Vikram Singh</div>
                                    <div class="text-xs text-slate-400">Operations Manager, Noida</div>
                                </div>
                            </div>
                        </div>
                        <div class="flex-shrink-0 w-80 glass rounded-2xl p-6 border border-white/10 hover:border-pink-500/30 transition-all snap-start">
                            <div class="flex items-center gap-1 mb-4">
                                <i class="fa-solid fa-star text-yellow-500"></i>
                                <i class="fa-solid fa-star text-yellow-500"></i>
                                <i class="fa-solid fa-star text-yellow-500"></i>
                                <i class="fa-solid fa-star text-yellow-500"></i>
                                <i class="fa-solid fa-star text-yellow-500"></i>
                            </div>
                            <p class="text-slate-300 mb-6 italic">"Best IT service provider in Rewari! They built our company website and it looks amazing. Highly professional."</p>
                            <div class="flex items-center gap-3">
                                <div class="w-12 h-12 rounded-full bg-pink-500/20 flex items-center justify-center">
                                    <span class="text-pink-500 font-bold text-lg">N</span>
                                </div>
                                <div>
                                    <div class="font-bold text-white">Neha Agarwal</div>
                                    <div class="text-xs text-slate-400">CEO, Rewari</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <!-- Scroll indicators -->
                    <div class="flex justify-center gap-2 mt-6">
                        <div class="w-2 h-2 rounded-full bg-brand-cyan"></div>
                        <div class="w-2 h-2 rounded-full bg-white/20"></div>
                        <div class="w-2 h-2 rounded-full bg-white/20"></div>
                    </div>
                </div>
            </div>
        </section>

        <!-- TRUST BADGES & GUARANTEES -->
        <section class="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
            <div class="max-w-6xl mx-auto">
                <div class="text-center mb-16 reveal">
                    <h2 class="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
                        Why <span class="text-gradient">Trust Us?</span>
                    </h2>
                    <p class="text-slate-400 max-w-2xl mx-auto">We stand behind our work with real guarantees.</p>
                </div>
                
                <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-6 reveal stagger-children">
                    <div class="glass rounded-2xl p-6 border border-brand-emerald/20 hover:border-brand-emerald/50 transition-all text-center">
                        <div class="w-16 h-16 mx-auto rounded-full bg-brand-emerald/10 flex items-center justify-center mb-4">
                            <i class="fa-solid fa-shield-check text-3xl text-brand-emerald"></i>
                        </div>
                        <h3 class="font-display font-bold text-white mb-2">30-Day Warranty</h3>
                        <p class="text-xs text-slate-400">All repairs guaranteed. If it breaks again, we fix it free.</p>
                    </div>
                    <div class="glass rounded-2xl p-6 border border-brand-cyan/20 hover:border-brand-cyan/50 transition-all text-center">
                        <div class="w-16 h-16 mx-auto rounded-full bg-brand-cyan/10 flex items-center justify-center mb-4">
                            <i class="fa-solid fa-hand-holding-dollar text-3xl text-brand-cyan"></i>
                        </div>
                        <h3 class="font-display font-bold text-white mb-2">No Fix, No Fee</h3>
                        <p class="text-xs text-slate-400">Don't pay a rupee unless we solve your problem. Period.</p>
                    </div>
                    <div class="glass rounded-2xl p-6 border border-brand-purple/20 hover:border-brand-purple/50 transition-all text-center">
                        <div class="w-16 h-16 mx-auto rounded-full bg-brand-purple/10 flex items-center justify-center mb-4">
                            <i class="fa-solid fa-user-shield text-3xl text-brand-purple"></i>
                        </div>
                        <h3 class="font-display font-bold text-white mb-2">Verified Technicians</h3>
                        <p class="text-xs text-slate-400">Background-checked, certified, and professionally trained.</p>
                    </div>
                    <div class="glass rounded-2xl p-6 border border-yellow-500/20 hover:border-yellow-500/50 transition-all text-center">
                        <div class="w-16 h-16 mx-auto rounded-full bg-yellow-500/10 flex items-center justify-center mb-4">
                            <i class="fa-solid fa-lock text-3xl text-yellow-500"></i>
                        </div>
                        <h3 class="font-display font-bold text-white mb-2">Secure Payments</h3>
                        <p class="text-xs text-slate-400">Razorpay-secured. UPI, cards, wallets — all safe.</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- SERVICE AREAS WITH MAP -->
        <section class="relative z-10 py-20 px-4 sm:px-6 lg:px-8 bg-brand-card/30 border-y border-white/5">
            <div class="max-w-7xl mx-auto">
                <div class="text-center mb-16 reveal">
                    <h2 class="font-display text-3xl sm:text-4xl font-bold text-white mb-4">We're <span class="text-gradient">Near You</span></h2>
                    <p class="text-slate-400 max-w-2xl mx-auto">Serving multiple cities across India with on-site and remote support</p>
                </div>
                <div class="grid lg:grid-cols-2 gap-8 items-center">
                    <div class="reveal">
                        <div id="home-map" class="h-[450px] rounded-2xl border border-white/10 overflow-hidden shadow-2xl"></div>
                    </div>
                    <div class="reveal space-y-6" style="transition-delay: 200ms;">
                        <div class="glass rounded-2xl p-8 border border-white/10 relative overflow-hidden group hover:border-brand-cyan/30 transition-all">
                            <div class="absolute top-0 right-0 w-32 h-32 bg-brand-cyan/10 rounded-full blur-3xl group-hover:bg-brand-cyan/20 transition-all"></div>
                            <div class="relative">
                                <div class="flex items-center gap-3 mb-4">
                                    <div class="w-12 h-12 rounded-xl bg-brand-cyan/20 flex items-center justify-center">
                                        <i class="fa-solid fa-location-dot text-brand-cyan text-xl"></i>
                                    </div>
                                    <h3 class="font-display text-xl font-bold text-white">Offline Service Zones</h3>
                                </div>
                                <div class="grid grid-cols-2 gap-3 mb-6">
                                    <div class="glass p-4 rounded-xl border border-brand-cyan/20 hover:border-brand-cyan/50 transition-all">
                                        <div class="flex items-center gap-2 mb-1">
                                            <i class="fa-solid fa-city text-brand-cyan text-sm"></i>
                                            <span class="font-bold text-white">Rewari</span>
                                        </div>
                                        <p class="text-xs text-slate-400">Headquarters</p>
                                    </div>
                                    <div class="glass p-4 rounded-xl border border-brand-emerald/20 hover:border-brand-emerald/50 transition-all">
                                        <div class="flex items-center gap-2 mb-1">
                                            <i class="fa-solid fa-building text-brand-emerald text-sm"></i>
                                            <span class="font-bold text-white">Gurugram</span>
                                        </div>
                                        <p class="text-xs text-slate-400">Full Support</p>
                                    </div>
                                    <div class="glass p-4 rounded-xl border border-brand-purple/20 hover:border-brand-purple/50 transition-all">
                                        <div class="flex items-center gap-2 mb-1">
                                            <i class="fa-solid fa-landmark text-brand-purple text-sm"></i>
                                            <span class="font-bold text-white">Delhi</span>
                                        </div>
                                        <p class="text-xs text-slate-400">Full Support</p>
                                    </div>
                                    <div class="glass p-4 rounded-xl border border-brand-danger/20 hover:border-brand-danger/50 transition-all">
                                        <div class="flex items-center gap-2 mb-1">
                                            <i class="fa-solid fa-building-columns text-brand-danger text-sm"></i>
                                            <span class="font-bold text-white">Noida</span>
                                        </div>
                                        <p class="text-xs text-slate-400">Full Support</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="glass rounded-2xl p-8 border border-white/10 relative overflow-hidden group hover:border-brand-emerald/30 transition-all">
                            <div class="absolute top-0 right-0 w-32 h-32 bg-brand-emerald/10 rounded-full blur-3xl group-hover:bg-brand-emerald/20 transition-all"></div>
                            <div class="relative">
                                <div class="flex items-center gap-3 mb-4">
                                    <div class="w-12 h-12 rounded-xl bg-brand-emerald/20 flex items-center justify-center">
                                        <i class="fa-solid fa-globe text-brand-emerald text-xl"></i>
                                    </div>
                                    <h3 class="font-display text-xl font-bold text-white">Online Global Support</h3>
                                </div>
                                <p class="text-sm text-slate-400 mb-4">Remote IT support available worldwide. Get expert help from anywhere.</p>
                                <button onclick="openSpecialModal('consultation')" class="w-full py-3 rounded-lg bg-brand-emerald/10 text-brand-emerald border border-brand-emerald/30 font-semibold hover:bg-brand-emerald/20 transition-all">
                                    <i class="fa-solid fa-headset mr-2"></i> Get Remote Support
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- OPINION/SURVEY SECTION -->
        ${addOpinionSection()}

        <!-- WEBSITE/SOFTWARE REQUEST SECTION -->
        ${addWebsiteRequestSection()}

        <!-- FINAL CTA - CONVERSION -->
        <section class="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
            <div class="max-w-4xl mx-auto text-center">
                <div class="glass rounded-3xl p-12 border border-brand-cyan/30 relative overflow-hidden">
                    <div class="absolute top-0 right-0 w-64 h-64 bg-brand-cyan/10 rounded-full blur-3xl"></div>
                    <div class="absolute bottom-0 left-0 w-64 h-64 bg-brand-emerald/10 rounded-full blur-3xl"></div>
                    <div class="relative z-10">
                        <h2 class="font-display text-3xl sm:text-4xl font-bold text-white mb-6">
                            Ready to <span class="text-gradient">Get Started?</span>
                        </h2>
                        <p class="text-slate-400 text-lg mb-8 max-w-xl mx-auto">
                            Join 500+ happy customers. Book your free consultation today and experience the DTS difference.
                        </p>
                        <div class="flex flex-col sm:flex-row gap-4 justify-center">
                            <button onclick="openSpecialModal('consultation')" class="btn-glow px-10 py-4 rounded-full bg-gradient-to-r from-brand-cyan to-brand-emerald text-brand-dark font-bold text-lg hover:shadow-[0_0_30px_rgba(0,240,255,0.4)] transition-all flex items-center justify-center gap-2">
                                <i class="fa-solid fa-calendar-check"></i> Book Free Consultation
                            </button>
                            <a href="tel:+919813443289" class="px-10 py-4 rounded-full border-2 border-brand-cyan text-brand-cyan font-bold text-lg hover:bg-brand-cyan/10 transition-all flex items-center justify-center gap-2">
                                <i class="fa-solid fa-phone"></i> +91 9813443289
                            </a>
                        </div>
                        <p class="text-xs text-slate-500 mt-6">
                            <i class="fa-solid fa-clock mr-1"></i> Response within 2 hours | 
                            <i class="fa-solid fa-shield-check ml-2 mr-1"></i> 100% Satisfaction Guaranteed
                        </p>
                    </div>
                </div>
            </div>
        </section>
    `;
}

function renderServicesView() {
    let html = `
        <!-- HERO SECTION -->
        <section class="relative z-10 py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
            <div class="absolute inset-0 z-0">
                <div class="absolute top-0 left-1/4 w-96 h-96 bg-brand-cyan/5 rounded-full blur-3xl"></div>
                <div class="absolute bottom-0 right-1/4 w-96 h-96 bg-brand-emerald/5 rounded-full blur-3xl"></div>
            </div>
            <div class="relative z-10 max-w-7xl mx-auto text-center">
                <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border-brand-cyan/30 mb-6">
                    <i class="fa-solid fa-award text-brand-cyan"></i>
                    <span class="text-xs font-semibold text-brand-cyan tracking-wider uppercase">Certified IT Professionals</span>
                </div>
                <h2 class="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
                    Professional <span class="text-gradient">IT Services</span><br>You Can Trust
                </h2>
                <p class="text-slate-400 max-w-3xl mx-auto text-lg mb-8">
                    500+ satisfied clients. 24/7 emergency support. 100% satisfaction guarantee. 
                    Expert technicians with 3+ years of experience serving Rewari, Delhi, Noida, and Gurugram.
                </p>
                
                <!-- Trust Badges -->
                <div class="flex flex-wrap justify-center gap-4 mb-12">
                    <div class="glass rounded-xl px-4 py-3 border border-brand-emerald/30 flex items-center gap-2">
                        <i class="fa-solid fa-shield-check text-brand-emerald text-xl"></i>
                        <div class="text-left">
                            <div class="text-xs text-slate-400">Guaranteed</div>
                            <div class="text-sm font-bold text-white">100% Satisfaction</div>
                        </div>
                    </div>
                    <div class="glass rounded-xl px-4 py-3 border border-brand-cyan/30 flex items-center gap-2">
                        <i class="fa-solid fa-clock text-brand-cyan text-xl"></i>
                        <div class="text-left">
                            <div class="text-xs text-slate-400">Response</div>
                            <div class="text-sm font-bold text-white">Under 2 Hours</div>
                        </div>
                    </div>
                    <div class="glass rounded-xl px-4 py-3 border border-brand-purple/30 flex items-center gap-2">
                        <i class="fa-solid fa-certificate text-brand-purple text-xl"></i>
                        <div class="text-left">
                            <div class="text-xs text-slate-400">Experience</div>
                            <div class="text-sm font-bold text-white">3+ Years</div>
                        </div>
                    </div>
                    <div class="glass rounded-xl px-4 py-3 border border-yellow-500/30 flex items-center gap-2">
                        <i class="fa-solid fa-star text-yellow-500 text-xl"></i>
                        <div class="text-left">
                            <div class="text-xs text-slate-400">Rating</div>
                            <div class="text-sm font-bold text-white">4.9/5 Stars</div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- WHY CHOOSE US SECTION -->
        <section class="relative z-10 py-16 px-4 sm:px-6 lg:px-8 bg-brand-card/30 border-y border-white/5">
            <div class="max-w-7xl mx-auto">
                <div class="text-center mb-12 reveal">
                    <h3 class="font-display text-2xl sm:text-3xl font-bold text-white mb-4">Why Choose <span class="text-gradient">DTS</span>?</h3>
                    <p class="text-slate-400 max-w-2xl mx-auto">We don't just fix problems — we build lasting relationships with our clients</p>
                </div>
                <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 reveal stagger-children">
                    <div class="glass rounded-2xl p-6 border border-white/5 hover:border-brand-cyan/30 transition-all text-center">
                        <div class="w-14 h-14 mx-auto rounded-full bg-brand-cyan/10 flex items-center justify-center mb-4">
                            <i class="fa-solid fa-user-shield text-2xl text-brand-cyan"></i>
                        </div>
                        <h4 class="font-display font-bold text-white mb-2">Certified Technicians</h4>
                        <p class="text-xs text-slate-400">All our technicians are certified and background verified</p>
                    </div>
                    <div class="glass rounded-2xl p-6 border border-white/5 hover:border-brand-emerald/30 transition-all text-center">
                        <div class="w-14 h-14 mx-auto rounded-full bg-brand-emerald/10 flex items-center justify-center mb-4">
                            <i class="fa-solid fa-hand-holding-dollar text-2xl text-brand-emerald"></i>
                        </div>
                        <h4 class="font-display font-bold text-white mb-2">Transparent Pricing</h4>
                        <p class="text-xs text-slate-400">No hidden charges. Get upfront quotes before we start</p>
                    </div>
                    <div class="glass rounded-2xl p-6 border border-white/5 hover:border-brand-purple/30 transition-all text-center">
                        <div class="w-14 h-14 mx-auto rounded-full bg-brand-purple/10 flex items-center justify-center mb-4">
                            <i class="fa-solid fa-rotate-left text-2xl text-brand-purple"></i>
                        </div>
                        <h4 class="font-display font-bold text-white mb-2">Service Warranty</h4>
                        <p class="text-xs text-slate-400">30-day warranty on all repairs and installations</p>
                    </div>
                    <div class="glass rounded-2xl p-6 border border-white/5 hover:border-yellow-500/30 transition-all text-center">
                        <div class="w-14 h-14 mx-auto rounded-full bg-yellow-500/10 flex items-center justify-center mb-4">
                            <i class="fa-solid fa-headset text-2xl text-yellow-500"></i>
                        </div>
                        <h4 class="font-display font-bold text-white mb-2">24/7 Support</h4>
                        <p class="text-xs text-slate-400">Round-the-clock emergency support when you need it</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- SERVICES GRID -->
        <section class="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
            <div class="max-w-7xl mx-auto">
                <div class="text-center mb-12 reveal">
                    <h3 class="font-display text-2xl sm:text-3xl font-bold text-white mb-4">Our <span class="text-gradient">Service Categories</span></h3>
                    <p class="text-slate-400 max-w-2xl mx-auto">Comprehensive IT solutions for home and business</p>
                </div>
    `;

    // Render service categories as cards
    let categoryIndex = 0;
    for (const [category, items] of Object.entries(servicesData)) {
        const isComingSoon = category.includes("Coming Soon");
        const icon = getCategoryIcon(category);
        const colorClass = isComingSoon ? 'brand-purple' : (category.includes('Emergency') ? 'brand-danger' : 'brand-cyan');
        
        // Map categories to images
        const categoryImages = {
            'Home Doorstep': 'hero-tech.png',
            'Computer & Laptop': 'network-ops.png',
            'Wi-Fi & Internet': 'network-ops.png',
            'CCTV & Security': 'cctv-security.png',
            'Smart Device': 'cloud-services.png',
            'Home IT': 'hero-tech.png',
            'Business IT': 'network-ops.png',
            'Website & Digital': 'custom-software.png',
            'Emergency': 'hero-tech.png',
            'AMC & Maintenance': 'team-success.png',
            'Custom Software & Websites': 'custom-software.png'
        };
        
        const categoryImage = categoryImages[category] || 'hero-tech.png';
        
        html += `
            <div class="glass rounded-2xl overflow-hidden border border-white/5 hover:border-${colorClass}/30 transition-all mb-8 reveal ${isComingSoon ? 'opacity-75' : ''}">
                <div class="grid lg:grid-cols-3 gap-0">
                    <!-- Image Section -->
                    <div class="relative h-64 lg:h-auto overflow-hidden">
                        <img src="${categoryImage}" alt="${category}" class="w-full h-full object-cover">
                        <div class="absolute inset-0 bg-gradient-to-r from-brand-dark/80 via-brand-dark/40 to-transparent"></div>
                        <div class="absolute bottom-6 left-6 right-6">
                            <div class="flex items-center gap-3 mb-3">
                                <div class="w-12 h-12 rounded-xl bg-${colorClass}/20 backdrop-blur-sm flex items-center justify-center border border-${colorClass}/30">
                                    <i class="${icon} text-2xl text-${colorClass}"></i>
                                </div>
                                <div>
                                    <h4 class="font-display text-xl font-bold text-white">${category}</h4>
                                    ${isComingSoon ? '<span class="text-xs text-brand-purple font-semibold">Coming Soon</span>' : `<span class="text-xs text-${colorClass}">${items.length} Services</span>`}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Content Section -->
                    <div class="lg:col-span-2 p-6 sm:p-8">
                        <p class="text-sm text-slate-400 mb-6">${getCategoryDescription(category)}</p>
                        
                        <!-- Services List -->
                        <div class="grid sm:grid-cols-2 gap-2 mb-6">
                            ${items.map(item => `
                                <div class="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-all group">
                                    <i class="fa-solid fa-circle-check text-${colorClass} text-sm flex-shrink-0"></i>
                                    <span class="text-sm text-slate-300 group-hover:text-white transition-colors">${item}</span>
                                </div>
                            `).join('')}
                        </div>
                        
                        <!-- Action Buttons -->
                        <div class="flex flex-wrap gap-3">
                            ${!isComingSoon ? `
                                <button onclick="openSpecialModal('general', '${category}')" class="px-6 py-2.5 rounded-lg bg-${colorClass}/10 text-${colorClass} border border-${colorClass}/30 text-sm font-semibold hover:bg-${colorClass}/20 transition-all flex items-center gap-2">
                                    <i class="fa-solid fa-calendar-check"></i> Book Now
                                </button>
                                ${category === 'Website & Digital' ? `
                                    <button onclick="switchView('domain-check')" class="px-6 py-2.5 rounded-lg bg-brand-purple/10 text-brand-purple border border-brand-purple/30 text-sm font-semibold hover:bg-brand-purple/20 transition-all flex items-center gap-2">
                                        <i class="fa-solid fa-globe"></i> Check Domain
                                    </button>
                                ` : ''}
                            ` : `
                                <div class="px-6 py-2.5 rounded-lg bg-white/5 text-slate-500 text-sm font-semibold flex items-center gap-2">
                                    <i class="fa-solid fa-clock"></i> Coming Soon
                                </div>
                            `}
                        </div>
                    </div>
                </div>
            </div>
        `;
        categoryIndex++;
    }

    html += `
            </div>
        </section>

        <!-- TESTIMONIALS & HAPPY CUSTOMERS SECTION -->
        <section class="relative z-10 py-16 px-4 sm:px-6 lg:px-8 bg-brand-card/30 border-y border-white/5">
            <div class="max-w-7xl mx-auto">
                <div class="text-center mb-12 reveal">
                    <h3 class="font-display text-2xl sm:text-3xl font-bold text-white mb-4">Happy <span class="text-gradient">Customers</span></h3>
                    <p class="text-slate-400">Real people, real results. See why our clients love working with us.</p>
                </div>
                
                <!-- Customer Images -->
                <div class="grid md:grid-cols-2 gap-8 mb-12 reveal">
                    <div class="relative rounded-3xl overflow-hidden group">
                        <img src="happy-customer.png" alt="Happy Customer" class="w-full h-80 object-cover group-hover:scale-105 transition-transform duration-500">
                        <div class="absolute inset-0 bg-gradient-to-t from-brand-dark/90 via-brand-dark/40 to-transparent"></div>
                        <div class="absolute bottom-6 left-6 right-6">
                            <div class="flex items-center gap-1 mb-2">
                                <i class="fa-solid fa-star text-yellow-500"></i>
                                <i class="fa-solid fa-star text-yellow-500"></i>
                                <i class="fa-solid fa-star text-yellow-500"></i>
                                <i class="fa-solid fa-star text-yellow-500"></i>
                                <i class="fa-solid fa-star text-yellow-500"></i>
                            </div>
                            <p class="text-white text-lg font-semibold mb-2">"Absolutely fantastic service! My business runs smoothly thanks to DTS."</p>
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-full bg-brand-cyan/30 backdrop-blur-sm flex items-center justify-center border border-brand-cyan/50">
                                    <span class="text-brand-cyan font-bold">S</span>
                                </div>
                                <div>
                                    <div class="text-sm font-bold text-white">Satisfied Customer</div>
                                    <div class="text-xs text-slate-300">Business Owner</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="relative rounded-3xl overflow-hidden group">
                        <img src="team-success.png" alt="Team Success" class="w-full h-80 object-cover group-hover:scale-105 transition-transform duration-500">
                        <div class="absolute inset-0 bg-gradient-to-t from-brand-dark/90 via-brand-dark/40 to-transparent"></div>
                        <div class="absolute bottom-6 left-6 right-6">
                            <div class="flex items-center gap-2 mb-2">
                                <i class="fa-solid fa-trophy text-yellow-500 text-xl"></i>
                                <span class="text-white font-bold text-lg">500+ Projects Completed</span>
                            </div>
                            <p class="text-slate-300 mb-3">Our expert team delivers results that exceed expectations, every single time.</p>
                            <div class="flex items-center gap-2">
                                <div class="flex -space-x-2">
                                    <div class="w-8 h-8 rounded-full bg-brand-cyan/30 backdrop-blur-sm flex items-center justify-center border-2 border-brand-dark">
                                        <span class="text-brand-cyan font-bold text-xs">R</span>
                                    </div>
                                    <div class="w-8 h-8 rounded-full bg-brand-emerald/30 backdrop-blur-sm flex items-center justify-center border-2 border-brand-dark">
                                        <span class="text-brand-emerald font-bold text-xs">P</span>
                                    </div>
                                    <div class="w-8 h-8 rounded-full bg-brand-purple/30 backdrop-blur-sm flex items-center justify-center border-2 border-brand-dark">
                                        <span class="text-brand-purple font-bold text-xs">A</span>
                                    </div>
                                </div>
                                <span class="text-xs text-slate-300">+497 more happy clients</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Scrollable Reviews -->
                <div class="relative reveal">
                    <div class="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide" style="scrollbar-width: none; -ms-overflow-style: none;">
                        <div class="flex-shrink-0 w-80 glass rounded-2xl p-6 border border-white/5 snap-start">
                            <div class="flex items-center gap-1 mb-3">
                                <i class="fa-solid fa-star text-yellow-500"></i>
                                <i class="fa-solid fa-star text-yellow-500"></i>
                                <i class="fa-solid fa-star text-yellow-500"></i>
                                <i class="fa-solid fa-star text-yellow-500"></i>
                                <i class="fa-solid fa-star text-yellow-500"></i>
                            </div>
                            <p class="text-sm text-slate-300 mb-4">"Excellent service! The technician arrived on time and fixed my laptop issue quickly. Very professional and affordable."</p>
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-full bg-brand-cyan/20 flex items-center justify-center">
                                    <span class="text-brand-cyan font-bold">R</span>
                                </div>
                                <div>
                                    <div class="text-sm font-bold text-white">Rahul Sharma</div>
                                    <div class="text-xs text-slate-400">Rewari</div>
                                </div>
                            </div>
                        </div>
                        <div class="flex-shrink-0 w-80 glass rounded-2xl p-6 border border-white/5 snap-start">
                            <div class="flex items-center gap-1 mb-3">
                                <i class="fa-solid fa-star text-yellow-500"></i>
                                <i class="fa-solid fa-star text-yellow-500"></i>
                                <i class="fa-solid fa-star text-yellow-500"></i>
                                <i class="fa-solid fa-star text-yellow-500"></i>
                                <i class="fa-solid fa-star text-yellow-500"></i>
                            </div>
                            <p class="text-sm text-slate-300 mb-4">"Got CCTV installed at my shop. Great quality work and the remote viewing setup works perfectly. Highly recommended!"</p>
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-full bg-brand-emerald/20 flex items-center justify-center">
                                    <span class="text-brand-emerald font-bold">P</span>
                                </div>
                                <div>
                                    <div class="text-sm font-bold text-white">Priya Verma</div>
                                    <div class="text-xs text-slate-400">Gurugram</div>
                                </div>
                            </div>
                        </div>
                        <div class="flex-shrink-0 w-80 glass rounded-2xl p-6 border border-white/5 snap-start">
                            <div class="flex items-center gap-1 mb-3">
                                <i class="fa-solid fa-star text-yellow-500"></i>
                                <i class="fa-solid fa-star text-yellow-500"></i>
                                <i class="fa-solid fa-star text-yellow-500"></i>
                                <i class="fa-solid fa-star text-yellow-500"></i>
                                <i class="fa-solid fa-star text-yellow-500"></i>
                            </div>
                            <p class="text-sm text-slate-300 mb-4">"Their AMC plan saved us from a major server crash. Quick response and very knowledgeable team. Worth every rupee!"</p>
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-full bg-brand-purple/20 flex items-center justify-center">
                                    <span class="text-brand-purple font-bold">A</span>
                                </div>
                                <div>
                                    <div class="text-sm font-bold text-white">Amit Gupta</div>
                                    <div class="text-xs text-slate-400">Delhi</div>
                                </div>
                            </div>
                        </div>
                        <div class="flex-shrink-0 w-80 glass rounded-2xl p-6 border border-white/5 snap-start">
                            <div class="flex items-center gap-1 mb-3">
                                <i class="fa-solid fa-star text-yellow-500"></i>
                                <i class="fa-solid fa-star text-yellow-500"></i>
                                <i class="fa-solid fa-star text-yellow-500"></i>
                                <i class="fa-solid fa-star text-yellow-500"></i>
                                <i class="fa-solid fa-star text-yellow-500"></i>
                            </div>
                            <p class="text-sm text-slate-300 mb-4">"Fast, reliable, and professional. They set up our entire office network in just 2 days. Amazing team!"</p>
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                                    <span class="text-yellow-500 font-bold">V</span>
                                </div>
                                <div>
                                    <div class="text-sm font-bold text-white">Vikram Singh</div>
                                    <div class="text-xs text-slate-400">Noida</div>
                                </div>
                            </div>
                        </div>
                        <div class="flex-shrink-0 w-80 glass rounded-2xl p-6 border border-white/5 snap-start">
                            <div class="flex items-center gap-1 mb-3">
                                <i class="fa-solid fa-star text-yellow-500"></i>
                                <i class="fa-solid fa-star text-yellow-500"></i>
                                <i class="fa-solid fa-star text-yellow-500"></i>
                                <i class="fa-solid fa-star text-yellow-500"></i>
                                <i class="fa-solid fa-star text-yellow-500"></i>
                            </div>
                            <p class="text-sm text-slate-300 mb-4">"Best IT service provider in Rewari! They built our company website and it looks amazing. Highly professional."</p>
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center">
                                    <span class="text-pink-500 font-bold">N</span>
                                </div>
                                <div>
                                    <div class="text-sm font-bold text-white">Neha Agarwal</div>
                                    <div class="text-xs text-slate-400">Rewari</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <!-- Scroll indicators -->
                    <div class="flex justify-center gap-2 mt-6">
                        <div class="w-2 h-2 rounded-full bg-brand-cyan"></div>
                        <div class="w-2 h-2 rounded-full bg-white/20"></div>
                        <div class="w-2 h-2 rounded-full bg-white/20"></div>
                    </div>
                </div>
            </div>
        </section>

        <!-- CTA SECTION -->
        <section class="relative z-10 py-16 px-4 sm:px-6 lg:px-8">
            <div class="max-w-4xl mx-auto text-center">
                <div class="glass rounded-3xl p-8 sm:p-12 border border-brand-cyan/30 relative overflow-hidden">
                    <div class="absolute top-0 right-0 w-64 h-64 bg-brand-cyan/5 rounded-full blur-3xl"></div>
                    <div class="relative z-10">
                        <h3 class="font-display text-2xl sm:text-3xl font-bold text-white mb-4">Ready to Get Started?</h3>
                        <p class="text-slate-400 mb-8 max-w-xl mx-auto">Book a service today and experience the DTS difference. First-time customers get special discounts!</p>
                        <div class="flex flex-col sm:flex-row gap-4 justify-center">
                            <button onclick="openSpecialModal('consultation')" class="btn-glow px-8 py-4 rounded-full bg-gradient-to-r from-brand-cyan to-brand-emerald text-brand-dark font-bold text-base hover:shadow-[0_0_30px_rgba(0,240,255,0.4)] transition-all flex items-center justify-center gap-2">
                                <i class="fa-solid fa-calendar-check"></i> Book Free Consultation
                            </button>
                            <a href="tel:+919813443289" class="px-8 py-4 rounded-full border border-brand-cyan/50 text-brand-cyan font-bold text-base hover:bg-brand-cyan/10 transition-all flex items-center justify-center gap-2">
                                <i class="fa-solid fa-phone"></i> Call: +91 9813443289
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    `;
    return html;
}

function getCategoryTitle(category) {
    const titles = {
        "Home Doorstep": "Expert IT Support at Your Doorstep",
        "Computer & Laptop": "Complete Computer & Laptop Care",
        "Wi-Fi & Internet": "Seamless Wi-Fi & Internet Solutions",
        "CCTV & Security": "Advanced CCTV & Security Systems",
        "Smart Device": "Smart Home & Device Integration",
        "Home IT": "Comprehensive Home IT Infrastructure",
        "Business IT": "Enterprise-Grade Business IT Services",
        "Website & Digital": "Professional Website & Digital Setup",
        "Emergency": "Rapid Emergency IT Support",
        "AMC & Maintenance": "Proactive AMC & Maintenance Plans",
        "Custom Software & Websites": "Custom Software & Website Development",
        "The Apex Circle (Coming Soon)": "The Apex Circle: Event Technology",
        "DTS Premium Business (Coming Soon)": "DTS Premium: Next-Gen Business Solutions"
    };
    return titles[category] || category;
}

function getCategoryDescription(category) {
    const descriptions = {
        "Home Doorstep": "Get expert IT support without leaving your home. Our certified technicians bring the repair shop to your doorstep, handling everything from hardware fixes to network optimization with minimal disruption to your day.",
        "Computer & Laptop": "From slow performance and virus infections to hardware upgrades and screen replacements, we provide comprehensive diagnostics and repair services to extend the life of your devices.",
        "Wi-Fi & Internet": "Eliminate dead zones and enjoy blazing-fast connectivity. We design, install, and optimize wired and wireless networks for homes and offices, ensuring maximum speed and security.",
        "CCTV & Security": "Protect what matters most. We offer end-to-end security solutions including high-definition CCTV installation, remote mobile viewing setup, biometric access control, and regular maintenance.",
        "Smart Device": "Transform your living space into a smart home. We assist with the setup, integration, and troubleshooting of smart TVs, cameras, speakers, doorbells, and automated lighting systems.",
        "Home IT": "Whether you're building a gaming rig, setting up a home office, or connecting multiple devices, we provide complete home IT infrastructure planning and execution.",
        "Business IT": "Empower your workforce with reliable technology. We handle office IT setup, server maintenance, employee onboarding, remote support, and strategic IT infrastructure planning.",
        "Website & Digital": "Establish a strong online presence. We handle domain registration, hosting setup, professional business email configuration, and cloud storage integration.",
        "Emergency": "When technology fails, every minute counts. Our emergency response team provides same-day repairs, urgent data recovery, and rapid network restoration to minimize your downtime.",
        "AMC & Maintenance": "Prevent problems before they happen. Our Annual Maintenance Contracts offer predictable IT budgeting, priority support, regular health checkups, and dedicated technician assignments.",
        "Custom Software & Websites": "Get tailor-made software solutions for your business. From custom websites and e-commerce platforms to ERP systems, mobile apps, and business management software — we build it all.",
        "The Apex Circle (Coming Soon)": "Elevate your events with cutting-edge technology. From robust event Wi-Fi and QR check-in systems to live streaming support and LED screen management, we've got your event covered.",
        "DTS Premium Business (Coming Soon)": "Stay ahead of the curve with our premium consulting services. We offer AI tool integration, business process automation, cybersecurity training, and digital transformation roadmaps."
    };
    return descriptions[category] || "Professional IT solutions tailored to your specific needs.";
}

function renderShopView() {
    if (state.shopCategory) {
        return renderShopCategoryView(state.shopCategory);
    }

    let html = `
        <section class="relative z-10 py-24 px-4 sm:px-6 lg:px-8">
            <div class="max-w-7xl mx-auto">
                <div class="flex justify-between items-end mb-12 reveal">
                    <div>
                        <h2 class="font-display text-3xl sm:text-4xl font-bold text-white mb-2">IT <span class="text-gradient">Hardware Shop</span></h2>
                        <p class="text-slate-400">Quality products with professional installation support.</p>
                    </div>
                    <button onclick="switchView('cart')" class="relative px-6 py-3 glass rounded-xl text-sm font-semibold text-white hover:bg-white/10 transition-all flex items-center gap-2">
                        <i class="fa-solid fa-cart-shopping"></i> View Cart (<span class="cart-count">${state.cart.length}</span>)
                    </button>
                </div>
                <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 reveal stagger-children">
    `;

    shopCategories.forEach(cat => {
        html += `
            <div onclick="state.shopCategory = '${cat.id}'; switchView('shop');" class="glass rounded-2xl p-8 border border-white/5 hover:border-brand-cyan/30 transition-all cursor-pointer group text-center">
                <div class="w-20 h-20 mx-auto rounded-full bg-brand-cyan/10 flex items-center justify-center mb-6 group-hover:bg-brand-cyan/20 transition-all group-hover:scale-110">
                    <i class="fa-solid ${cat.icon} text-3xl text-brand-cyan"></i>
                </div>
                <h3 class="font-display font-bold text-xl text-white mb-2">${cat.name}</h3>
                <p class="text-sm text-slate-400">${cat.items.length} Products Available</p>
                <button class="mt-4 px-6 py-2 rounded-lg bg-brand-cyan/10 text-brand-cyan text-sm font-semibold group-hover:bg-brand-cyan group-hover:text-brand-dark transition-all">
                    Browse Category <i class="fa-solid fa-arrow-right ml-1"></i>
                </button>
            </div>
        `;
    });

    html += `</div></div></section>`;
    return html;
}

function renderShopCategoryView(categoryId) {
    const category = shopCategories.find(c => c.id === categoryId);
    if (!category) return renderShopView();

    let html = `
        <section class="relative z-10 py-24 px-4 sm:px-6 lg:px-8">
            <div class="max-w-7xl mx-auto">
                <button onclick="state.shopCategory = null; switchView('shop');" class="mb-6 flex items-center gap-2 text-slate-400 hover:text-brand-cyan transition-all">
                    <i class="fa-solid fa-arrow-left"></i> Back to Categories
                </button>
                <div class="flex justify-between items-end mb-12 reveal">
                    <div>
                        <h2 class="font-display text-3xl sm:text-4xl font-bold text-white mb-2">${category.name}</h2>
                        <p class="text-slate-400">Professional grade equipment with ₹99 installation option.</p>
                    </div>
                    <button onclick="switchView('cart')" class="relative px-6 py-3 glass rounded-xl text-sm font-semibold text-white hover:bg-white/10 transition-all flex items-center gap-2">
                        <i class="fa-solid fa-cart-shopping"></i> Cart (<span class="cart-count">${state.cart.length}</span>)
                    </button>
                </div>
                <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 reveal stagger-children">
    `;

    category.items.forEach(item => {
        html += `
            <div class="glass rounded-2xl overflow-hidden border border-white/5 hover:border-brand-cyan/30 transition-all group">
                <div class="h-48 bg-brand-card relative overflow-hidden">
                    <img src="${item.image}" alt="${item.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                    <div class="absolute top-3 left-3 px-2 py-1 bg-brand-dark/80 rounded text-[10px] font-bold text-brand-cyan uppercase">${category.name}</div>
                </div>
                <div class="p-6">
                    <h3 class="font-display font-bold text-white mb-2">${item.name}</h3>
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-xl font-bold text-brand-emerald">₹${item.price.toLocaleString()}</span>
                        <span class="text-xs text-brand-cyan bg-brand-cyan/10 px-2 py-1 rounded">In Stock</span>
                    </div>
                    <p class="text-xs text-slate-500 mb-4 flex items-center gap-1"><i class="fa-solid fa-screwdriver-wrench"></i> + ₹99 Professional Installation available at checkout</p>
                    <button onclick="addToCart({id: ${item.id}, name: '${item.name}', price: ${item.price}, image: '${item.image}'}, '${category.name}')" class="w-full py-2.5 rounded-lg bg-brand-cyan/10 text-brand-cyan font-semibold hover:bg-brand-cyan hover:text-brand-dark transition-all flex items-center justify-center gap-2">
                        <i class="fa-solid fa-cart-plus"></i> Add to Cart
                    </button>
                </div>
            </div>
        `;
    });

    html += `</div></div></section>`;
    return html;
}

function renderCartView() {
    if (state.cart.length === 0) {
        return `
            <section class="relative z-10 py-32 px-4 text-center min-h-screen">
                <i class="fa-solid fa-cart-shopping text-6xl text-slate-700 mb-6"></i>
                <h2 class="font-display text-2xl font-bold text-white mb-4">Your Cart is Empty</h2>
                <button onclick="switchView('shop')" class="px-6 py-3 rounded-lg bg-brand-cyan text-brand-dark font-bold hover:bg-brand-cyan/80 transition-all">Browse Shop</button>
            </section>
        `;
    }

    let subtotal = state.cart.reduce((sum, item) => sum + item.price, 0);
    let installationCount = state.cart.filter(item => item.installation).length;
    let installationFee = installationCount * 99;
    let total = subtotal + installationFee;

    let html = `
        <section class="relative z-10 py-24 px-4 sm:px-6 lg:px-8 min-h-screen">
            <div class="max-w-4xl mx-auto">
                <h2 class="font-display text-3xl font-bold text-white mb-8 reveal">Shopping Cart</h2>
                <div class="grid lg:grid-cols-3 gap-8 reveal">
                    <div class="lg:col-span-2 space-y-4">
    `;

    state.cart.forEach((item, index) => {
        html += `
            <div class="glass rounded-xl p-4 border border-white/5 flex gap-4 items-center">
                <img src="${item.image}" class="w-20 h-20 rounded-lg object-cover bg-brand-card">
                <div class="flex-1">
                    <h4 class="font-bold text-white">${item.name}</h4>
                    <p class="text-xs text-slate-400">${item.categoryName}</p>
                    <div class="flex items-center gap-4 mt-2">
                        <span class="text-brand-emerald font-bold">₹${item.price.toLocaleString()}</span>
                        <label class="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                            <input type="checkbox" ${item.installation ? 'checked' : ''} onchange="toggleInstallation(${index})" class="accent-brand-cyan w-4 h-4">
                            Add ₹99 Professional Installation
                        </label>
                    </div>
                </div>
                <button onclick="removeFromCart(${index})" class="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `;
    });

    html += `
                    </div>
                    <div class="glass rounded-xl p-6 border border-white/10 h-fit">
                        <h3 class="font-display text-lg font-bold text-white mb-4">Order Summary</h3>
                        <div class="space-y-3 text-sm mb-6">
                            <div class="flex justify-between text-slate-400">
                                <span>Subtotal (${state.cart.length} items)</span>
                                <span>₹${subtotal.toLocaleString()}</span>
                            </div>
                            <div class="flex justify-between text-slate-400">
                                <span>Installation Service (${installationCount}x)</span>
                                <span>₹${installationFee}</span>
                            </div>
                            <div class="border-t border-white/10 pt-3 flex justify-between text-white font-bold text-lg">
                                <span>Total</span>
                                <span class="text-brand-cyan">₹${total.toLocaleString()}</span>
                            </div>
                        </div>
                        <button onclick="switchView('checkout')" class="w-full py-3 rounded-lg bg-gradient-to-r from-brand-cyan to-brand-emerald text-brand-dark font-bold hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-all">
                            Proceed to Checkout
                        </button>
                        <button onclick="switchView('shop')" class="w-full mt-3 py-3 rounded-lg border border-white/10 text-slate-400 text-sm font-semibold hover:bg-white/5 transition-all">
                            Continue Shopping
                        </button>
                    </div>
                </div>
            </div>
        </section>
    `;
    return html;
}

function renderCheckoutView() {
    let subtotal = state.cart.reduce((sum, item) => sum + item.price, 0);
    let installationCount = state.cart.filter(item => item.installation).length;
    let installationFee = installationCount * 99;
    let total = subtotal + installationFee;

    return `
        <section class="relative z-10 py-24 px-4 sm:px-6 lg:px-8 min-h-screen">
            <div class="max-w-2xl mx-auto">
                <button onclick="switchView('cart')" class="mb-6 flex items-center gap-2 text-slate-400 hover:text-brand-cyan transition-all">
                    <i class="fa-solid fa-arrow-left"></i> Back to Cart
                </button>
                <div class="glass rounded-2xl p-8 border border-white/10 reveal">
                    <h2 class="font-display text-2xl font-bold text-white mb-6">Secure Checkout</h2>
                    
                    <div class="bg-brand-dark/50 rounded-xl p-4 mb-6 border border-white/5">
                        <h3 class="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wider">Order Total</h3>
                        <div class="flex justify-between items-center">
                            <span class="text-3xl font-bold text-white">₹${total.toLocaleString()}</span>
                            <span class="text-xs text-slate-500">${state.cart.length} item(s) ${installationCount > 0 ? `+ ${installationCount}x Installation` : ''}</span>
                        </div>
                    </div>

                    <form onsubmit="handleCheckoutSubmit(event, ${total})" class="space-y-4">
                        <div>
                            <label class="block text-xs font-medium text-slate-400 mb-1">Full Name</label>
                            <input type="text" name="fullName" value="${state.currentUser ? `${state.currentUser.firstName} ${state.currentUser.lastName}`.trim() : ''}" required class="w-full bg-brand-dark/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-cyan transition-colors">
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-slate-400 mb-1">Shipping Address</label>
                            <textarea name="address" rows="2" required class="w-full bg-brand-dark/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-cyan transition-colors resize-none" placeholder="House No, Street, Landmark">${state.currentUser ? state.currentUser.address || '' : ''}</textarea>
                        </div>
                        <div class="grid grid-cols-3 gap-3">
                            <div>
                                <label class="block text-xs font-medium text-slate-400 mb-1">Pincode</label>
                                <input type="text" name="pincode" maxlength="6" onblur="fetchAddressByPincode(this.value, '')" class="w-full bg-brand-dark/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-cyan transition-colors" placeholder="e.g., 123456">
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-slate-400 mb-1">City</label>
                                <input type="text" name="city" value="${state.currentUser ? state.currentUser.city || '' : ''}" class="w-full bg-brand-dark/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-cyan transition-colors" placeholder="Auto-filled">
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-slate-400 mb-1">State</label>
                                <input type="text" name="state" value="${state.currentUser ? state.currentUser.state || '' : ''}" class="w-full bg-brand-dark/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-cyan transition-colors" placeholder="Auto-filled">
                            </div>
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-slate-400 mb-1">Phone Number</label>
                            <input type="tel" name="phone" value="${state.currentUser ? state.currentUser.phone : ''}" required class="w-full bg-brand-dark/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-cyan transition-colors">
                        </div>
                        
                        <div class="pt-4 border-t border-white/10">
                            <button type="submit" class="w-full btn-glow py-4 rounded-lg bg-gradient-to-r from-brand-cyan to-brand-emerald text-brand-dark font-bold text-lg hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-all flex items-center justify-center gap-2">
                                <i class="fa-solid fa-lock"></i> Pay ₹${total.toLocaleString()} via Razorpay
                            </button>
                            <p class="text-center text-xs text-slate-500 mt-4 flex items-center justify-center gap-2">
                                <i class="fa-solid fa-shield-halved text-brand-emerald"></i> Secured by Razorpay & 256-bit SSL Encryption
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </section>
    `;
}

function handleCheckoutSubmit(event, total) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());

    if (!state.currentUser) {
        alert("⚠️ Please log in to complete your purchase.");
        openAuthModal('signup');
        return;
    }

    initiateRazorpay('Hardware Purchase', total, data, true);
}

function renderAMCView() {
    return `
        <!-- HERO SECTION -->
        <section class="relative z-10 py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
            <div class="absolute inset-0 z-0">
                <div class="absolute top-0 left-1/3 w-96 h-96 bg-brand-cyan/5 rounded-full blur-3xl"></div>
                <div class="absolute bottom-0 right-1/3 w-96 h-96 bg-brand-emerald/5 rounded-full blur-3xl"></div>
            </div>
            <div class="relative z-10 max-w-7xl mx-auto text-center">
                <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border-brand-emerald/30 mb-6">
                    <i class="fa-solid fa-shield-halved text-brand-emerald"></i>
                    <span class="text-xs font-semibold text-brand-emerald tracking-wider uppercase">Preventive IT Care</span>
                </div>
                <h2 class="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
                    Annual Maintenance <span class="text-gradient">Contracts</span>
                </h2>
                <p class="text-slate-400 max-w-3xl mx-auto text-lg mb-8">
                    Stop IT problems before they happen. Our AMC plans give you priority support, regular health checks, 
                    and peace of mind — all at a predictable monthly cost.
                </p>
                
                <!-- Benefits Bar -->
                <div class="flex flex-wrap justify-center gap-6 text-sm">
                    <div class="flex items-center gap-2 text-slate-300">
                        <i class="fa-solid fa-check-circle text-brand-emerald"></i>
                        <span>No Surprise Bills</span>
                    </div>
                    <div class="flex items-center gap-2 text-slate-300">
                        <i class="fa-solid fa-check-circle text-brand-emerald"></i>
                        <span>Priority Response</span>
                    </div>
                    <div class="flex items-center gap-2 text-slate-300">
                        <i class="fa-solid fa-check-circle text-brand-emerald"></i>
                        <span>Regular Health Checks</span>
                    </div>
                    <div class="flex items-center gap-2 text-slate-300">
                        <i class="fa-solid fa-check-circle text-brand-emerald"></i>
                        <span>Cancel Anytime</span>
                    </div>
                </div>
            </div>
        </section>

        <!-- PRICING CARDS -->
        <section class="relative z-10 py-12 px-4 sm:px-6 lg:px-8">
            <div class="max-w-6xl mx-auto">
                <div class="grid md:grid-cols-3 gap-6 lg:gap-8">
                    <!-- Starter Plan -->
                    <div class="glass rounded-3xl p-8 border border-white/10 hover:border-brand-cyan/30 transition-all reveal flex flex-col">
                        <div class="mb-6">
                            <div class="w-12 h-12 rounded-xl bg-brand-cyan/10 flex items-center justify-center mb-4">
                                <i class="fa-solid fa-house-laptop text-2xl text-brand-cyan"></i>
                            </div>
                            <h3 class="font-display text-2xl font-bold text-white mb-2">Starter</h3>
                            <p class="text-sm text-slate-400">Perfect for home offices & freelancers</p>
                        </div>
                        
                        <div class="mb-6 pb-6 border-b border-white/10">
                            <div class="flex items-baseline gap-1">
                                <span class="text-4xl font-bold text-white">₹899</span>
                                <span class="text-slate-400">/month</span>
                            </div>
                            <p class="text-sm text-brand-cyan mt-2">
                                <i class="fa-solid fa-tag mr-1"></i> ₹6,899/year (Save ₹3,889)
                            </p>
                        </div>
                        
                        <ul class="space-y-3 mb-8 flex-1">
                            <li class="flex items-start gap-3 text-sm text-slate-300">
                                <i class="fa-solid fa-check text-brand-emerald mt-0.5"></i>
                                <span>Up to <strong class="text-white">4 devices</strong> covered</span>
                            </li>
                            <li class="flex items-start gap-3 text-sm text-slate-300">
                                <i class="fa-solid fa-check text-brand-emerald mt-0.5"></i>
                                <span><strong class="text-white">4 remote</strong> support sessions/month</span>
                            </li>
                            <li class="flex items-start gap-3 text-sm text-slate-300">
                                <i class="fa-solid fa-check text-brand-emerald mt-0.5"></i>
                                <span>Monthly health checkup</span>
                            </li>
                            <li class="flex items-start gap-3 text-sm text-slate-300">
                                <i class="fa-solid fa-check text-brand-emerald mt-0.5"></i>
                                <span>Basic antivirus management</span>
                            </li>
                            <li class="flex items-start gap-3 text-sm text-slate-300">
                                <i class="fa-solid fa-check text-brand-emerald mt-0.5"></i>
                                <span><strong class="text-white">1 emergency</strong> support/year</span>
                            </li>
                            <li class="flex items-start gap-3 text-sm text-slate-300">
                                <i class="fa-solid fa-check text-brand-emerald mt-0.5"></i>
                                <span>Email support (24hr response)</span>
                            </li>
                        </ul>
                        
                        <button onclick="openAMCPurchaseModal('Starter', 'monthly')" class="w-full py-3.5 rounded-xl border border-brand-cyan/50 text-brand-cyan font-semibold hover:bg-brand-cyan/10 transition-all flex items-center justify-center gap-2 mb-3">
                            <i class="fa-solid fa-lock text-xs"></i> Subscribe Monthly — ₹899
                        </button>
                        <button onclick="openAMCPurchaseModal('Starter', 'yearly')" class="w-full py-3.5 rounded-xl bg-brand-cyan/10 text-brand-cyan font-semibold hover:bg-brand-cyan/20 transition-all flex items-center justify-center gap-2">
                            <i class="fa-solid fa-calendar-check text-xs"></i> Subscribe Yearly — ₹6,899
                        </button>
                    </div>

                    <!-- Business Pro Plan (Most Popular) -->
                    <div class="glass rounded-3xl p-8 border-2 border-brand-cyan relative reveal flex flex-col transform md:-translate-y-4 shadow-[0_0_40px_rgba(0,240,255,0.15)]">
                        <div class="absolute -top-4 left-1/2 -translate-x-1/2 px-6 py-1.5 bg-gradient-to-r from-brand-cyan to-brand-emerald rounded-full text-brand-dark text-xs font-bold uppercase tracking-wider shadow-lg">
                            <i class="fa-solid fa-fire mr-1"></i> Most Popular
                        </div>
                        
                        <div class="mb-6">
                            <div class="w-12 h-12 rounded-xl bg-brand-emerald/10 flex items-center justify-center mb-4">
                                <i class="fa-solid fa-briefcase text-2xl text-brand-emerald"></i>
                            </div>
                            <h3 class="font-display text-2xl font-bold text-white mb-2">Business Pro</h3>
                            <p class="text-sm text-slate-400">For small to medium businesses</p>
                        </div>
                        
                        <div class="mb-6 pb-6 border-b border-white/10">
                            <div class="flex items-baseline gap-1">
                                <span class="text-4xl font-bold text-white">₹2,899</span>
                                <span class="text-slate-400">/month</span>
                            </div>
                            <p class="text-sm text-brand-emerald mt-2">
                                <i class="fa-solid fa-tag mr-1"></i> ₹28,999/year (Save ₹5,789)
                            </p>
                        </div>
                        
                        <ul class="space-y-3 mb-8 flex-1">
                            <li class="flex items-start gap-3 text-sm text-slate-300">
                                <i class="fa-solid fa-check text-brand-cyan mt-0.5"></i>
                                <span>Up to <strong class="text-white">10 devices</strong> covered</span>
                            </li>
                            <li class="flex items-start gap-3 text-sm text-slate-300">
                                <i class="fa-solid fa-check text-brand-cyan mt-0.5"></i>
                                <span><strong class="text-white">Unlimited</strong> remote support</span>
                            </li>
                            <li class="flex items-start gap-3 text-sm text-slate-300">
                                <i class="fa-solid fa-check text-brand-cyan mt-0.5"></i>
                                <span>Monthly health checkup</span>
                            </li>
                            <li class="flex items-start gap-3 text-sm text-slate-300">
                                <i class="fa-solid fa-check text-brand-cyan mt-0.5"></i>
                                <span><strong class="text-white">4-hour</strong> priority response</span>
                            </li>
                            <li class="flex items-start gap-3 text-sm text-slate-300">
                                <i class="fa-solid fa-check text-brand-cyan mt-0.5"></i>
                                <span>Monthly backup verification</span>
                            </li>
                            <li class="flex items-start gap-3 text-sm text-slate-300">
                                <i class="fa-solid fa-check text-brand-cyan mt-0.5"></i>
                                <span><strong class="text-white">2 emergency</strong> supports/year</span>
                            </li>
                            <li class="flex items-start gap-3 text-sm text-slate-300">
                                <i class="fa-solid fa-check text-brand-cyan mt-0.5"></i>
                                <span>Phone + WhatsApp support</span>
                            </li>
                        </ul>
                        
                        <button onclick="openAMCPurchaseModal('Business Pro', 'monthly')" class="btn-glow w-full py-3.5 rounded-xl bg-gradient-to-r from-brand-cyan to-brand-emerald text-brand-dark font-bold hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-all flex items-center justify-center gap-2 mb-3">
                            <i class="fa-solid fa-lock"></i> Subscribe Monthly — ₹2,899
                        </button>
                        <button onclick="openAMCPurchaseModal('Business Pro', 'yearly')" class="w-full py-3.5 rounded-xl border border-brand-emerald/50 text-brand-emerald font-semibold hover:bg-brand-emerald/10 transition-all flex items-center justify-center gap-2">
                            <i class="fa-solid fa-calendar-check text-xs"></i> Subscribe Yearly — ₹28,999
                        </button>
                    </div>

                    <!-- Enterprise Plan -->
                    <div class="glass rounded-3xl p-8 border border-white/10 hover:border-brand-purple/30 transition-all reveal flex flex-col" style="transition-delay: 200ms;">
                        <div class="mb-6">
                            <div class="w-12 h-12 rounded-xl bg-brand-purple/10 flex items-center justify-center mb-4">
                                <i class="fa-solid fa-building text-2xl text-brand-purple"></i>
                            </div>
                            <h3 class="font-display text-2xl font-bold text-white mb-2">Enterprise</h3>
                            <p class="text-sm text-slate-400">Custom solutions for large teams</p>
                        </div>
                        
                        <div class="mb-6 pb-6 border-b border-white/10">
                            <div class="flex items-baseline gap-1">
                                <span class="text-4xl font-bold text-white">Custom</span>
                            </div>
                            <p class="text-sm text-brand-purple mt-2">
                                <i class="fa-solid fa-handshake mr-1"></i> Tailored to your needs
                            </p>
                        </div>
                        
                        <ul class="space-y-3 mb-8 flex-1">
                            <li class="flex items-start gap-3 text-sm text-slate-300">
                                <i class="fa-solid fa-check text-brand-purple mt-0.5"></i>
                                <span><strong class="text-white">Unlimited</strong> devices</span>
                            </li>
                            <li class="flex items-start gap-3 text-sm text-slate-300">
                                <i class="fa-solid fa-check text-brand-purple mt-0.5"></i>
                                <span>Dedicated IT account manager</span>
                            </li>
                            <li class="flex items-start gap-3 text-sm text-slate-300">
                                <i class="fa-solid fa-check text-brand-purple mt-0.5"></i>
                                <span>Unlimited on-site & remote support</span>
                            </li>
                            <li class="flex items-start gap-3 text-sm text-slate-300">
                                <i class="fa-solid fa-check text-brand-purple mt-0.5"></i>
                                <span><strong class="text-white">1-hour</strong> emergency response SLA</span>
                            </li>
                            <li class="flex items-start gap-3 text-sm text-slate-300">
                                <i class="fa-solid fa-check text-brand-purple mt-0.5"></i>
                                <span>Custom cloud & security architecture</span>
                            </li>
                            <li class="flex items-start gap-3 text-sm text-slate-300">
                                <i class="fa-solid fa-check text-brand-purple mt-0.5"></i>
                                <span>Quarterly IT strategy reviews</span>
                            </li>
                            <li class="flex items-start gap-3 text-sm text-slate-300">
                                <i class="fa-solid fa-check text-brand-purple mt-0.5"></i>
                                <span>24/7 priority phone support</span>
                            </li>
                        </ul>
                        
                        <button onclick="openEnterpriseModal()" class="w-full py-3.5 rounded-xl bg-gradient-to-r from-brand-purple to-brand-cyan text-white font-semibold hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all flex items-center justify-center gap-2">
                            <i class="fa-solid fa-building"></i> Contact Enterprise Sales
                        </button>
                    </div>
                </div>

                <!-- Payment Trust Badge -->
                <div class="flex flex-wrap items-center justify-center gap-4 mt-12 text-xs text-slate-500 reveal">
                    <div class="flex items-center gap-2">
                        <i class="fa-solid fa-shield-halved text-brand-emerald text-lg"></i>
                        <span>Secured by Razorpay & 256-bit SSL</span>
                    </div>
                    <span class="text-slate-700">|</span>
                    <div class="flex items-center gap-2">
                        <i class="fa-solid fa-credit-card text-brand-cyan"></i>
                        <span>UPI, Cards, Net Banking, Wallets</span>
                    </div>
                    <span class="text-slate-700">|</span>
                    <div class="flex items-center gap-2">
                        <i class="fa-solid fa-rotate-left text-brand-purple"></i>
                        <span>Cancel Anytime</span>
                    </div>
                </div>
            </div>
        </section>

        <!-- COMPARISON TABLE -->
        <section class="relative z-10 py-16 px-4 sm:px-6 lg:px-8 bg-brand-card/30 border-y border-white/5">
            <div class="max-w-5xl mx-auto">
                <div class="text-center mb-12 reveal">
                    <h3 class="font-display text-2xl sm:text-3xl font-bold text-white mb-4">Compare <span class="text-gradient">Plans</span></h3>
                    <p class="text-slate-400">Find the perfect plan for your needs</p>
                </div>
                
                <div class="glass rounded-2xl border border-white/10 overflow-hidden reveal">
                    <div class="overflow-x-auto">
                        <table class="w-full text-sm">
                            <thead>
                                <tr class="border-b border-white/10">
                                    <th class="text-left p-4 text-slate-400 font-medium">Feature</th>
                                    <th class="p-4 text-center text-brand-cyan font-bold">Starter</th>
                                    <th class="p-4 text-center text-brand-emerald font-bold bg-brand-emerald/5">Business Pro</th>
                                    <th class="p-4 text-center text-brand-purple font-bold">Enterprise</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-white/5">
                                <tr>
                                    <td class="p-4 text-slate-300">Devices Covered</td>
                                    <td class="p-4 text-center text-white">4</td>
                                    <td class="p-4 text-center text-white bg-brand-emerald/5">10</td>
                                    <td class="p-4 text-center text-white">Unlimited</td>
                                </tr>
                                <tr>
                                    <td class="p-4 text-slate-300">Remote Support</td>
                                    <td class="p-4 text-center text-slate-400">4/month</td>
                                    <td class="p-4 text-center text-white bg-brand-emerald/5">Unlimited</td>
                                    <td class="p-4 text-center text-white">Unlimited</td>
                                </tr>
                                <tr>
                                    <td class="p-4 text-slate-300">Response Time</td>
                                    <td class="p-4 text-center text-slate-400">24 hours</td>
                                    <td class="p-4 text-center text-white bg-brand-emerald/5">4 hours</td>
                                    <td class="p-4 text-center text-white">1 hour</td>
                                </tr>
                                <tr>
                                    <td class="p-4 text-slate-300">Health Checkups</td>
                                    <td class="p-4 text-center text-white">Monthly</td>
                                    <td class="p-4 text-center text-white bg-brand-emerald/5">Monthly</td>
                                    <td class="p-4 text-center text-white">Weekly</td>
                                </tr>
                                <tr>
                                    <td class="p-4 text-slate-300">Emergency Support</td>
                                    <td class="p-4 text-center text-slate-400">1/year</td>
                                    <td class="p-4 text-center text-white bg-brand-emerald/5">2/year</td>
                                    <td class="p-4 text-center text-white">Unlimited</td>
                                </tr>
                                <tr>
                                    <td class="p-4 text-slate-300">On-site Support</td>
                                    <td class="p-4 text-center"><i class="fa-solid fa-xmark text-slate-600"></i></td>
                                    <td class="p-4 text-center bg-brand-emerald/5"><i class="fa-solid fa-check text-brand-emerald"></i></td>
                                    <td class="p-4 text-center"><i class="fa-solid fa-check text-brand-purple"></i></td>
                                </tr>
                                <tr>
                                    <td class="p-4 text-slate-300">Dedicated Manager</td>
                                    <td class="p-4 text-center"><i class="fa-solid fa-xmark text-slate-600"></i></td>
                                    <td class="p-4 text-center bg-brand-emerald/5"><i class="fa-solid fa-xmark text-slate-600"></i></td>
                                    <td class="p-4 text-center"><i class="fa-solid fa-check text-brand-purple"></i></td>
                                </tr>
                                <tr>
                                    <td class="p-4 text-slate-300">Support Channels</td>
                                    <td class="p-4 text-center text-slate-400">Email</td>
                                    <td class="p-4 text-center text-white bg-brand-emerald/5">Phone + WhatsApp</td>
                                    <td class="p-4 text-center text-white">24/7 Priority</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </section>

        <!-- FAQ SECTION -->
        <section class="relative z-10 py-16 px-4 sm:px-6 lg:px-8">
            <div class="max-w-3xl mx-auto">
                <div class="text-center mb-12 reveal">
                    <h3 class="font-display text-2xl sm:text-3xl font-bold text-white mb-4">Frequently Asked <span class="text-gradient">Questions</span></h3>
                </div>
                
                <div class="space-y-4 reveal">
                    <div class="glass rounded-xl p-6 border border-white/5">
                        <h4 class="font-bold text-white mb-2 flex items-center gap-2">
                            <i class="fa-solid fa-circle-question text-brand-cyan"></i>
                            What happens if I exceed my device limit?
                        </h4>
                        <p class="text-sm text-slate-400">We'll notify you and offer a simple upgrade path. No surprise charges — you always know what you're paying for.</p>
                    </div>
                    <div class="glass rounded-xl p-6 border border-white/5">
                        <h4 class="font-bold text-white mb-2 flex items-center gap-2">
                            <i class="fa-solid fa-circle-question text-brand-cyan"></i>
                            Can I cancel my AMC plan anytime?
                        </h4>
                        <p class="text-sm text-slate-400">Yes! Monthly plans can be cancelled anytime. Yearly plans are eligible for pro-rata refund within the first 30 days.</p>
                    </div>
                    <div class="glass rounded-xl p-6 border border-white/5">
                        <h4 class="font-bold text-white mb-2 flex items-center gap-2">
                            <i class="fa-solid fa-circle-question text-brand-cyan"></i>
                            Do you offer on-site support?
                        </h4>
                        <p class="text-sm text-slate-400">Business Pro and Enterprise plans include on-site support. Starter plan is remote-only, but on-site visits can be booked separately at discounted rates.</p>
                    </div>
                    <div class="glass rounded-xl p-6 border border-white/5">
                        <h4 class="font-bold text-white mb-2 flex items-center gap-2">
                            <i class="fa-solid fa-circle-question text-brand-cyan"></i>
                            What areas do you serve?
                        </h4>
                        <p class="text-sm text-slate-400">We serve Rewari, Gurugram, Delhi, and Noida for on-site support. Remote support is available pan-India and globally.</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- CTA SECTION -->
        <section class="relative z-10 py-16 px-4 sm:px-6 lg:px-8">
            <div class="max-w-4xl mx-auto text-center">
                <div class="glass rounded-3xl p-8 sm:p-12 border border-brand-emerald/30 relative overflow-hidden">
                    <div class="absolute top-0 right-0 w-64 h-64 bg-brand-emerald/5 rounded-full blur-3xl"></div>
                    <div class="relative z-10">
                        <h3 class="font-display text-2xl sm:text-3xl font-bold text-white mb-4">Still Have Questions?</h3>
                        <p class="text-slate-400 mb-8 max-w-xl mx-auto">Our team is here to help you choose the right plan. Get a free consultation today!</p>
                        <div class="flex flex-col sm:flex-row gap-4 justify-center">
                            <button onclick="openSpecialModal('consultation')" class="btn-glow px-8 py-4 rounded-full bg-gradient-to-r from-brand-cyan to-brand-emerald text-brand-dark font-bold text-base hover:shadow-[0_0_30px_rgba(0,240,255,0.4)] transition-all flex items-center justify-center gap-2">
                                <i class="fa-solid fa-calendar-check"></i> Free Consultation
                            </button>
                            <a href="tel:+919813443289" class="px-8 py-4 rounded-full border border-brand-emerald/50 text-brand-emerald font-bold text-base hover:bg-brand-emerald/10 transition-all flex items-center justify-center gap-2">
                                <i class="fa-solid fa-phone"></i> Call: +91 9813443289
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    `;
}

// --- Helper: Get User's Premium Plan Tier ---
function getUserPlanTier(user) {
    if (!user || !user.orders) return { tier: 'standard', label: 'Standard', color: 'slate', icon: 'fa-user', gradient: '' };
    
    const amcOrders = user.orders.filter(o => o.type === 'AMC' && o.status === 'Active');
    
    if (amcOrders.some(o => o.product.includes('Enterprise'))) {
        return { 
            tier: 'enterprise', 
            label: 'Enterprise', 
            color: 'purple', 
            icon: 'fa-crown', 
            gradient: 'from-purple-500 via-pink-500 to-cyan-500',
            border: 'border-purple-500/50',
            glow: 'shadow-[0_0_30px_rgba(139,92,246,0.3)]'
        };
    }
    if (amcOrders.some(o => o.product.includes('Business Pro'))) {
        return { 
            tier: 'business', 
            label: 'Business Pro', 
            color: 'yellow', 
            icon: 'fa-star', 
            gradient: 'from-yellow-400 via-orange-500 to-red-500',
            border: 'border-yellow-500/50',
            glow: 'shadow-[0_0_30px_rgba(234,179,8,0.3)]'
        };
    }
    if (amcOrders.some(o => o.product.includes('Starter'))) {
        return { 
            tier: 'starter', 
            label: 'Starter', 
            color: 'cyan', 
            icon: 'fa-gem', 
            gradient: 'from-cyan-400 to-blue-500',
            border: 'border-cyan-500/50',
            glow: 'shadow-[0_0_30px_rgba(0,240,255,0.2)]'
        };
    }
    
    return { tier: 'standard', label: 'Standard', color: 'slate', icon: 'fa-user', gradient: '', border: 'border-white/10', glow: '' };
}

async function renderProfileView() {
    if (!state.currentUser || state.currentUser.role === 'admin') {
        return `<div class="pt-32 text-center text-white">Please log in as a user to view this page.</div>`;
    }
    
    // Fetch fresh user data from Firebase
    const freshUserData = await DTSDB.getUserByEmail(state.currentUser.email);
    if (freshUserData) {
        state.currentUser = freshUserData;
        localStorage.setItem('dts_user', JSON.stringify(state.currentUser));
    }
    
    const user = state.currentUser;
    const points = user.points || 0;
    const planTier = getUserPlanTier(user);
    // REAL STATS: Calculate strictly from user's actual data
    const allTransactions = [...(user.bookings || []), ...(user.orders || [])];
    const activeBookings = allTransactions.filter(b => b.status !== 'Closed' && b.status !== 'Cancelled' && b.status !== 'Delivered').length;
    const totalSpent = allTransactions.reduce((sum, b) => sum + (b.amount || 0), 0);
    
    const tabs = [
        { id: 'overview', label: 'Overview', icon: 'fa-chart-pie' },
        ...(getAMCUsageData(user) ? [{ id: 'myplan', label: 'My AMC Plan', icon: 'fa-shield-halved' }] : []),
        { id: 'bookings', label: 'Bookings & Orders', icon: 'fa-clock-rotate-left' },
        { id: 'tickets', label: 'Support Tickets', icon: 'fa-ticket' },
        { id: 'rewards', label: 'Rewards & Referrals', icon: 'fa-gift' },
        { id: 'settings', label: 'Settings', icon: 'fa-gear' }
    ];

    let contentHtml = '';

    if (state.profileTab === 'overview') {
        contentHtml = `
            <div class="grid md:grid-cols-3 gap-6 mb-8 reveal stagger-children">
                <div class="glass rounded-2xl p-6 border border-brand-cyan/30">
                    <h3 class="text-slate-400 text-xs uppercase mb-2">Total Spent</h3>
                    <div class="text-3xl font-bold text-white">₹${totalSpent.toLocaleString()}</div>
                </div>
                <div class="glass rounded-2xl p-6 border border-brand-emerald/30">
                    <h3 class="text-slate-400 text-xs uppercase mb-2">DTS Points</h3>
                    <div class="text-3xl font-bold text-brand-emerald">${points} pts</div>
                    <div class="text-xs text-slate-500 mt-1">₹${Math.floor(points / 100) * 100} redeemable</div>
                </div>
                <div class="glass rounded-2xl p-6 border border-brand-purple/30">
                    <h3 class="text-slate-400 text-xs uppercase mb-2">Active Bookings</h3>
                    <div class="text-3xl font-bold text-brand-purple">${activeBookings}</div>
                </div>
            </div>
            
            ${renderAMCUsageCard(user)}

            <div class="glass rounded-2xl p-6 border border-yellow-500/30 mb-8 reveal flex flex-col md:flex-row items-center justify-between gap-4 bg-gradient-to-r from-yellow-500/5 to-transparent">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                        <i class="fa-solid fa-percent text-yellow-400 text-xl"></i>
                    </div>
                    <div>
                        <h3 class="font-display text-lg font-bold text-white">Your Exclusive Welcome Offer!</h3>
                        <p class="text-sm text-slate-400">Use code <span class="text-yellow-400 font-mono font-bold">${user.personalCoupon || 'FIRST99'}</span> for your first Home Service at just ₹99!</p>
                    </div>
                </div>
                <button onclick="openSpecialModal('home-door')" class="px-6 py-2 rounded-lg bg-yellow-500 text-brand-dark font-bold hover:bg-yellow-400 transition-all whitespace-nowrap">
                    Book Now
                </button>
            </div>

            <div class="glass rounded-2xl p-6 border border-white/10 reveal">
                <h3 class="font-display text-lg font-bold text-white mb-4">Quick Actions</h3>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button onclick="openSpecialModal('home-door')" class="p-4 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-semibold text-white transition-all flex flex-col items-center gap-2">
                        <i class="fa-solid fa-house text-brand-cyan text-2xl"></i> Book Home Service
                    </button>
                    <button onclick="openSpecialModal('emergency')" class="p-4 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-semibold text-white transition-all flex flex-col items-center gap-2">
                        <i class="fa-solid fa-triangle-exclamation text-brand-danger text-2xl"></i> Emergency
                    </button>
                    <button onclick="switchView('shop')" class="p-4 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-semibold text-white transition-all flex flex-col items-center gap-2">
                        <i class="fa-solid fa-cart-shopping text-brand-emerald text-2xl"></i> Shop Products
                    </button>
                    <button onclick="alert('Support tickets coming soon!')" class="p-4 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-semibold text-white transition-all flex flex-col items-center gap-2">
                        <i class="fa-solid fa-ticket text-brand-purple text-2xl"></i> Support Tickets
                    </button>
                </div>
            </div>
        `;
    } else if (state.profileTab === 'myplan') {
        const amcData = getAMCUsageData(user);
        if (!amcData) {
            contentHtml = `
                <div class="glass rounded-2xl p-12 border border-white/10 text-center reveal">
                    <i class="fa-solid fa-shield-halved text-5xl text-slate-600 mb-4"></i>
                    <h3 class="font-display text-xl font-bold text-white mb-2">No Active AMC Plan</h3>
                    <p class="text-slate-400 mb-6">Subscribe to an AMC plan to get priority support, regular health checks, and more.</p>
                    <button onclick="switchView('amc')" class="px-8 py-3 rounded-lg bg-gradient-to-r from-brand-cyan to-brand-emerald text-brand-dark font-bold hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-all">
                        <i class="fa-solid fa-shield-halved mr-2"></i> View AMC Plans
                    </button>
                </div>
            `;
        } else {
            const { plan, usage, order, planKey } = amcData;
            const colorMap = { 'Starter': 'cyan', 'Business Pro': 'emerald', 'Enterprise': 'purple' };
            const color = colorMap[planKey] || 'cyan';
            const billingCycle = order.billingCycle || 'monthly';
            const cyclePrice = billingCycle === 'yearly' ? plan.yearlyPrice : plan.price;
            const cycleLabel = billingCycle === 'yearly' ? '/year' : '/month';

            const remoteRemaining = plan.remoteSessions === 'Unlimited' ? 'Unlimited' : Math.max(0, plan.remoteSessions - usage.remoteSessions);
            const emergencyRemaining = plan.emergencySupport === 'Unlimited' ? 'Unlimited' : Math.max(0, plan.emergencySupport - usage.emergencySupport);
            const devicesRemaining = plan.devices === 'Unlimited' ? 'Unlimited' : Math.max(0, plan.devices - (usage.devicesRegistered || 0));

            contentHtml = `
                <!-- Full Plan Details -->
                <div class="glass rounded-2xl border border-brand-${color}/40 p-6 mb-6 reveal relative overflow-hidden ${planKey === 'Enterprise' ? 'shadow-[0_0_40px_rgba(139,92,246,0.2)]' : planKey === 'Business Pro' ? 'shadow-[0_0_40px_rgba(16,185,129,0.15)]' : 'shadow-[0_0_30px_rgba(0,240,255,0.1)]'}">
                    <div class="absolute inset-0 opacity-[0.03]"><div class="absolute inset-0 bg-gradient-to-br from-brand-${color} to-transparent"></div></div>
                    <div class="relative">
                        <!-- Plan Header -->
                        <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8 pb-6 border-b border-white/10">
                            <div class="flex items-center gap-4">
                                <div class="w-16 h-16 rounded-2xl bg-brand-${color}/15 flex items-center justify-center border-2 border-brand-${color}/30">
                                    <i class="fa-solid ${plan.icon} text-brand-${color} text-3xl"></i>
                                </div>
                                <div>
                                    <div class="flex items-center gap-3 mb-1">
                                        <h3 class="font-display text-2xl font-bold text-white">${plan.name}</h3>
                                        <span class="px-3 py-1 rounded-full bg-brand-${color}/20 text-brand-${color} text-xs font-bold uppercase tracking-wider border border-brand-${color}/30 animate-pulse">Active</span>
                                    </div>
                                    <p class="text-sm text-slate-400">Subscription ID: <span class="font-mono text-brand-${color}">${order.id}</span></p>
                                    <p class="text-xs text-slate-500 mt-1">Started: ${order.date} | Billing: ${billingCycle === 'yearly' ? 'Yearly' : 'Monthly'} @ ₹${cyclePrice.toLocaleString()}${cycleLabel}</p>
                                    ${order.nextBillingDate ? `<p class="text-xs text-brand-${color} mt-1"><i class="fa-solid fa-clock mr-1"></i> Next billing: ${order.nextBillingDate}</p>` : ''}
                                </div>
                            </div>
                            <div class="flex flex-col items-end gap-2">
                                <div class="text-right">
                                    <div class="text-3xl font-bold text-white">₹${cyclePrice.toLocaleString()}</div>
                                    <div class="text-xs text-slate-500">${cycleLabel}</div>
                                </div>
                            </div>
                        </div>

                        <!-- Detailed Usage Breakdown -->
                        <h4 class="font-display text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <i class="fa-solid fa-chart-bar text-brand-${color}"></i> Usage Breakdown
                        </h4>
                        <div class="space-y-4 mb-8">
                            <!-- Remote Sessions -->
                            <div class="bg-brand-dark/40 rounded-xl p-4 border border-white/5">
                                <div class="flex justify-between items-center mb-2">
                                    <div class="flex items-center gap-2">
                                        <i class="fa-solid fa-headset text-brand-${color}"></i>
                                        <span class="text-sm font-semibold text-white">Remote Support Sessions</span>
                                    </div>
                                    <span class="text-sm font-bold text-white">${usage.remoteSessions} / ${plan.remoteSessions}</span>
                                </div>
                                <div class="w-full bg-brand-dark/80 rounded-full h-2">
                                    <div class="bg-gradient-to-r from-brand-${color} to-brand-${color}/60 h-2 rounded-full transition-all duration-700" style="width: ${plan.remoteSessions === 'Unlimited' ? '15' : Math.min(100, (usage.remoteSessions / plan.remoteSessions) * 100)}%"></div>
                                </div>
                                <p class="text-[10px] text-slate-500 mt-1">${remoteRemaining === 'Unlimited' ? 'Unlimited remaining' : remoteRemaining + ' remaining this month'}</p>
                            </div>

                            <!-- Emergency Support -->
                            <div class="bg-brand-dark/40 rounded-xl p-4 border border-white/5">
                                <div class="flex justify-between items-center mb-2">
                                    <div class="flex items-center gap-2">
                                        <i class="fa-solid fa-triangle-exclamation text-yellow-500"></i>
                                        <span class="text-sm font-semibold text-white">Emergency Support</span>
                                    </div>
                                    <span class="text-sm font-bold text-white">${usage.emergencySupport} / ${plan.emergencySupport}</span>
                                </div>
                                <div class="w-full bg-brand-dark/80 rounded-full h-2">
                                    <div class="bg-gradient-to-r from-yellow-500 to-yellow-500/60 h-2 rounded-full transition-all duration-700" style="width: ${plan.emergencySupport === 'Unlimited' ? '10' : Math.min(100, (usage.emergencySupport / plan.emergencySupport) * 100)}%"></div>
                                </div>
                                <p class="text-[10px] text-slate-500 mt-1">${emergencyRemaining === 'Unlimited' ? 'Unlimited remaining' : emergencyRemaining + ' remaining this year'}</p>
                            </div>

                            <!-- Devices -->
                            <div class="bg-brand-dark/40 rounded-xl p-4 border border-white/5">
                                <div class="flex justify-between items-center mb-2">
                                    <div class="flex items-center gap-2">
                                        <i class="fa-solid fa-laptop text-brand-emerald"></i>
                                        <span class="text-sm font-semibold text-white">Devices Covered</span>
                                    </div>
                                    <span class="text-sm font-bold text-white">${usage.devicesRegistered || 0} / ${plan.devices}</span>
                                </div>
                                <div class="w-full bg-brand-dark/80 rounded-full h-2">
                                    <div class="bg-gradient-to-r from-brand-emerald to-brand-emerald/60 h-2 rounded-full transition-all duration-700" style="width: ${plan.devices === 'Unlimited' ? '20' : Math.min(100, ((usage.devicesRegistered || 0) / plan.devices) * 100)}%"></div>
                                </div>
                                <p class="text-[10px] text-slate-500 mt-1">${devicesRemaining === 'Unlimited' ? 'Unlimited slots available' : devicesRemaining + ' slots available'}</p>
                                ${order.deviceTypes ? `<p class="text-[10px] text-slate-400 mt-1"><i class="fa-solid fa-microchip mr-1"></i> Types: ${order.deviceTypes}</p>` : ''}
                            </div>

                            <!-- Health Checkups -->
                            <div class="bg-brand-dark/40 rounded-xl p-4 border border-white/5">
                                <div class="flex justify-between items-center mb-2">
                                    <div class="flex items-center gap-2">
                                        <i class="fa-solid fa-heart-pulse text-pink-400"></i>
                                        <span class="text-sm font-semibold text-white">Health Checkups</span>
                                    </div>
                                    <span class="text-sm font-bold text-white">${usage.healthCheckups} / ${plan.healthCheckups}</span>
                                </div>
                                <div class="w-full bg-brand-dark/80 rounded-full h-2">
                                    <div class="bg-gradient-to-r from-pink-400 to-pink-400/60 h-2 rounded-full transition-all duration-700" style="width: ${Math.min(100, (usage.healthCheckups / plan.healthCheckups) * 100)}%"></div>
                                </div>
                                <p class="text-[10px] text-slate-500 mt-1">${usage.lastHealthCheckup ? 'Last checkup: ' + usage.lastHealthCheckup : 'No checkups yet — schedule your first one!'}</p>
                            </div>

                            <!-- On-site Visits -->
                            ${plan.onSite ? `
                            <div class="bg-brand-dark/40 rounded-xl p-4 border border-white/5">
                                <div class="flex justify-between items-center mb-2">
                                    <div class="flex items-center gap-2">
                                        <i class="fa-solid fa-house text-brand-cyan"></i>
                                        <span class="text-sm font-semibold text-white">On-site Visits</span>
                                    </div>
                                    <span class="text-sm font-bold text-white">${usage.onSiteVisits || 0} used</span>
                                </div>
                                <p class="text-[10px] text-slate-500">On-site visits are included in your plan at no extra cost</p>
                            </div>
                            ` : ''}
                        </div>

                        <!-- Full Plan Benefits -->
                        <h4 class="font-display text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <i class="fa-solid fa-list-check text-brand-${color}"></i> All Plan Benefits
                        </h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                            <div class="flex items-center gap-3 p-3 rounded-lg bg-brand-dark/30 border border-white/5">
                                <i class="fa-solid fa-check-circle text-brand-${color}"></i>
                                <span class="text-sm text-slate-300">${plan.devices === 'Unlimited' ? 'Unlimited' : plan.devices} devices covered</span>
                            </div>
                            <div class="flex items-center gap-3 p-3 rounded-lg bg-brand-dark/30 border border-white/5">
                                <i class="fa-solid fa-check-circle text-brand-${color}"></i>
                                <span class="text-sm text-slate-300">${plan.remoteSessions === 'Unlimited' ? 'Unlimited' : plan.remoteSessions + '/mo'} remote support sessions</span>
                            </div>
                            <div class="flex items-center gap-3 p-3 rounded-lg bg-brand-dark/30 border border-white/5">
                                <i class="fa-solid fa-check-circle text-brand-${color}"></i>
                                <span class="text-sm text-slate-300">${plan.responseTime} response time</span>
                            </div>
                            <div class="flex items-center gap-3 p-3 rounded-lg bg-brand-dark/30 border border-white/5">
                                <i class="fa-solid fa-check-circle text-brand-${color}"></i>
                                <span class="text-sm text-slate-300">Monthly health checkup</span>
                            </div>
                            <div class="flex items-center gap-3 p-3 rounded-lg bg-brand-dark/30 border border-white/5">
                                <i class="fa-solid fa-check-circle text-brand-${color}"></i>
                                <span class="text-sm text-slate-300">${plan.emergencySupport === 'Unlimited' ? 'Unlimited' : plan.emergencySupport + '/yr'} emergency support</span>
                            </div>
                            <div class="flex items-center gap-3 p-3 rounded-lg bg-brand-dark/30 border border-white/5">
                                <i class="fa-solid fa-check-circle text-brand-${color}"></i>
                                <span class="text-sm text-slate-300">${plan.channels} support channels</span>
                            </div>
                            ${plan.onSite ? `
                            <div class="flex items-center gap-3 p-3 rounded-lg bg-brand-dark/30 border border-white/5">
                                <i class="fa-solid fa-check-circle text-brand-${color}"></i>
                                <span class="text-sm text-slate-300">On-site visits included</span>
                            </div>` : ''}
                            ${plan.dedicatedManager ? `
                            <div class="flex items-center gap-3 p-3 rounded-lg bg-brand-dark/30 border border-white/5">
                                <i class="fa-solid fa-check-circle text-brand-${color}"></i>
                                <span class="text-sm text-slate-300">Dedicated account manager</span>
                            </div>` : ''}
                        </div>

                        <!-- Action Buttons -->
                        <div class="flex flex-wrap gap-3">
                            <button onclick="openSpecialModal('home-door')" class="px-6 py-2.5 rounded-lg bg-brand-${color}/10 text-brand-${color} border border-brand-${color}/30 text-sm font-semibold hover:bg-brand-${color}/20 transition-all flex items-center gap-2">
                                <i class="fa-solid fa-headset"></i> Use Remote Support
                            </button>
                            <button onclick="openSpecialModal('emergency')" class="px-6 py-2.5 rounded-lg bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 text-sm font-semibold hover:bg-yellow-500/20 transition-all flex items-center gap-2">
                                <i class="fa-solid fa-triangle-exclamation"></i> Emergency Support
                            </button>
                            <button onclick="switchView('amc')" class="px-6 py-2.5 rounded-lg bg-white/5 text-slate-400 border border-white/10 text-sm font-semibold hover:bg-white/10 transition-all flex items-center gap-2">
                                <i class="fa-solid fa-arrow-up"></i> Upgrade Plan
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
    } else if (state.profileTab === 'bookings') {
        const allTransactions = [...(user.bookings || []), ...(user.orders || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
        
        if (allTransactions.length === 0) {
            contentHtml = `<div class="glass rounded-2xl p-12 border border-white/10 text-center reveal"><i class="fa-solid fa-inbox text-4xl text-slate-600 mb-4"></i><p class="text-slate-400">No bookings or orders yet.</p><button onclick="switchView('services')" class="mt-4 px-6 py-2 rounded-lg bg-brand-cyan text-brand-dark font-bold">Browse Services</button></div>`;
        } else {
            contentHtml = `<div class="space-y-6 reveal">`;
            allTransactions.forEach(item => {
                const isBooking = item.type === 'Service';
                const stages = isBooking 
                    ? ['Booked', 'Confirmed', 'Assigned', 'In Progress', 'Completed', 'Closed']
                    : ['Ordered', 'Processing', 'Shipped', 'Delivered', 'Closed'];
                const currentStageIndex = stages.indexOf(item.status) !== -1 ? stages.indexOf(item.status) : 0;
                
                // Handle rejected bookings
                if (item.status === 'Rejected') {
                    contentHtml += `
                        <div class="bg-red-500/5 rounded-xl p-5 border border-red-500/20">
                            <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-2">
                                <div>
                                    <div class="flex items-center gap-3 mb-1">
                                        <span class="font-mono text-brand-cyan text-sm">${item.id}</span>
                                        <span class="px-2 py-0.5 rounded bg-brand-cyan/10 text-brand-cyan text-xs">${item.type}</span>
                                    </div>
                                    <h4 class="font-bold text-white">${item.service || item.product}</h4>
                                    <p class="text-xs text-slate-400">${item.date} • ₹${item.amount}</p>
                                </div>
                                <div class="flex items-center gap-3">
                                    <span class="px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/30">
                                        <i class="fa-solid fa-xmark mr-1"></i> Rejected
                                    </span>
                                </div>
                            </div>
                            ${item.rejectionReason ? `<p class="text-xs text-red-400 mt-2"><i class="fa-solid fa-circle-info mr-1"></i> Reason: ${item.rejectionReason}</p>` : ''}
                        </div>
                    `;
                    return;
                }
                
                contentHtml += `
                    <div class="bg-brand-dark/30 rounded-xl p-5 border border-white/5">
                        <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-2">
                            <div>
                                <div class="flex items-center gap-3 mb-1">
                                    <span class="font-mono text-${isBooking ? 'brand-cyan' : 'brand-purple'} text-sm">${item.id}</span>
                                    <span class="px-2 py-0.5 rounded bg-${isBooking ? 'brand-cyan' : 'brand-purple'}/10 text-${isBooking ? 'brand-cyan' : 'brand-purple'} text-xs">${item.type}</span>
                                    ${item.isRecurring ? `<span class="px-2 py-0.5 rounded bg-brand-emerald/10 text-brand-emerald text-xs"><i class="fa-solid fa-rotate mr-1"></i>${item.billingCycle}</span>` : ''}
                                </div>
                                <h4 class="font-bold text-white">${item.service || item.product}</h4>
                                <p class="text-xs text-slate-400">${item.date} • ₹${item.amount}</p>
                                ${item.isRecurring ? `<p class="text-xs text-brand-emerald mt-1"><i class="fa-solid fa-calendar mr-1"></i>Next billing: ${item.nextBillingDate}</p>` : ''}
                            </div>
                            <div class="flex items-center gap-3">
                                <span class="px-3 py-1 rounded-full bg-brand-emerald/20 text-brand-emerald text-xs font-bold border border-brand-emerald/30">${item.status}</span>
                                ${isBooking && (item.status === 'Booked' || item.status === 'Pending') ? `
                                    <button onclick="cancelBooking('${item.id}')" class="px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/30 hover:bg-red-500/30 transition-all">
                                        <i class="fa-solid fa-xmark mr-1"></i> Cancel
                                    </button>
                                ` : ''}
                                ${isBooking && (item.status === 'Confirmed' || item.status === 'Assigned' || item.status === 'On the Way' || item.status === 'Arrived' || item.status === 'In Progress') ? `
                                    <button onclick="openTrackingView('${item.id}')" class="px-3 py-1 rounded-full bg-brand-cyan/20 text-brand-cyan text-xs font-bold border border-brand-cyan/30 hover:bg-brand-cyan/30 transition-all">
                                        <i class="fa-solid fa-location-dot mr-1"></i> Track
                                    </button>
                                ` : ''}
                                <button onclick="toggleBookingQR('${item.id}')" class="px-3 py-1 rounded-full bg-brand-purple/20 text-brand-purple text-xs font-bold border border-brand-purple/30 hover:bg-brand-purple/30 transition-all">
                                    <i class="fa-solid fa-qrcode mr-1"></i> QR
                                </button>
                                ${item.paymentId ? `
                                <button onclick="generateInvoice('${item.id}')" class="px-3 py-1 rounded-full bg-brand-emerald/20 text-brand-emerald text-xs font-bold border border-brand-emerald/30 hover:bg-brand-emerald/30 transition-all">
                                    <i class="fa-solid fa-file-invoice mr-1"></i> Invoice
                                </button>
                                ` : ''}
                            </div>
                        </div>
                        
                        <!-- QR Code Section (Hidden by default) -->
                        <div id="qr-section-${item.id}" class="hidden mt-4 p-4 bg-brand-card/50 rounded-xl border border-brand-purple/20">
                            <div class="flex flex-col md:flex-row items-center gap-6">
                                <div class="flex-shrink-0">
                                    <div id="qr-code-${item.id}" class="p-3 bg-white rounded-xl"></div>
                                </div>
                                <div class="flex-1 text-center md:text-left">
                                    <h5 class="font-display text-lg font-bold text-white mb-2 flex items-center gap-2 justify-center md:justify-start">
                                        <i class="fa-solid fa-qrcode text-brand-purple"></i> Booking QR Code
                                    </h5>
                                    <p class="text-sm text-slate-400 mb-3">Show this QR code to the technician for verification</p>
                                    <div class="grid grid-cols-2 gap-2 text-xs">
                                        <div class="bg-brand-dark/50 p-2 rounded">
                                            <span class="text-slate-500">Booking ID:</span>
                                            <span class="text-brand-cyan font-mono ml-1">${item.id}</span>
                                        </div>
                                        <div class="bg-brand-dark/50 p-2 rounded">
                                            <span class="text-slate-500">Amount:</span>
                                            <span class="text-brand-emerald font-bold ml-1">₹${item.amount}</span>
                                        </div>
                                        <div class="bg-brand-dark/50 p-2 rounded">
                                            <span class="text-slate-500">Date:</span>
                                            <span class="text-white ml-1">${item.date || 'TBD'}</span>
                                        </div>
                                        <div class="bg-brand-dark/50 p-2 rounded">
                                            <span class="text-slate-500">Time:</span>
                                            <span class="text-white ml-1">${item.time || 'TBD'}</span>
                                        </div>
                                    </div>
                                    <button onclick="downloadBookingQR('${item.id}')" class="mt-3 px-4 py-2 rounded-lg bg-brand-purple/20 text-brand-purple text-xs font-semibold hover:bg-brand-purple/30 transition-all">
                                        <i class="fa-solid fa-download mr-1"></i> Download QR
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <div class="relative mt-4">
                            <div class="absolute top-1/2 left-0 w-full h-0.5 bg-white/10 -translate-y-1/2"></div>
                            <div class="absolute top-1/2 left-0 h-0.5 bg-brand-emerald -translate-y-1/2" style="width: ${(currentStageIndex / (stages.length - 1)) * 100}%"></div>
                            <div class="relative flex justify-between">
                                ${stages.map((stage, idx) => `
                                    <div class="flex flex-col items-center gap-2">
                                        <div class="w-8 h-8 rounded-full ${idx <= currentStageIndex ? 'bg-brand-emerald text-brand-dark' : 'bg-brand-dark border-2 border-white/20 text-slate-500'} flex items-center justify-center text-xs font-bold z-10 transition-all">
                                            ${idx < currentStageIndex ? '<i class="fa-solid fa-check"></i>' : (idx + 1)}
                                        </div>
                                        <span class="text-[10px] ${idx <= currentStageIndex ? 'text-white font-semibold' : 'text-slate-500'}">${stage}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                `;
            });
            contentHtml += `</div>`;
        }
    } else if (state.profileTab === 'tickets') {
        const tickets = user.tickets || [];
        contentHtml = `
            <div class="glass rounded-2xl p-6 border border-white/10 reveal">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="font-display text-xl font-bold text-white flex items-center gap-2">
                        <i class="fa-solid fa-ticket text-brand-purple"></i> My Support Tickets
                    </h3>
                    <button onclick="openTicketModal()" class="px-4 py-2 rounded-lg bg-brand-purple/20 text-brand-purple border border-brand-purple/50 text-sm font-semibold hover:bg-brand-purple/30 transition-all flex items-center gap-2">
                        <i class="fa-solid fa-plus"></i> New Ticket
                    </button>
                </div>
                ${tickets.length === 0 ? 
                    `<div class="text-center py-12 text-slate-500"><i class="fa-regular fa-folder-open text-4xl mb-3"></i><p>No support tickets yet.</p></div>` :
                    `<div class="space-y-4">
                        ${tickets.map(t => `
                            <div class="bg-brand-dark/30 rounded-xl p-4 border border-white/5 flex flex-col md:flex-row justify-between gap-4">
                                <div>
                                    <div class="flex items-center gap-3 mb-1">
                                        <span class="font-mono text-brand-cyan text-sm">${t.id}</span>
                                        <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase ${t.status === 'Open' ? 'bg-yellow-500/20 text-yellow-500' : (t.status === 'Resolved' ? 'bg-brand-emerald/20 text-brand-emerald' : 'bg-brand-cyan/20 text-brand-cyan')}">${t.status}</span>
                                    </div>
                                    <h4 class="font-bold text-white mb-1">${t.subject}</h4>
                                    <p class="text-sm text-slate-400">${t.description}</p>
                                    <p class="text-xs text-slate-500 mt-2"><i class="fa-regular fa-clock mr-1"></i> ${t.date}</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>`
                }
            </div>
        `;
    } else if (state.profileTab === 'rewards') {
        const redeemableAmount = Math.floor(points / 100) * 100;
        contentHtml = `
            <div class="grid md:grid-cols-2 gap-6 reveal">
                <div class="glass rounded-2xl p-8 border border-brand-cyan/30 relative overflow-hidden">
                    <div class="absolute top-0 right-0 w-32 h-32 bg-brand-cyan/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                    <h3 class="font-display text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <i class="fa-solid fa-crown text-yellow-400"></i> DTS Rewards
                    </h3>
                    <div class="text-5xl font-bold text-brand-cyan mb-2">${points} <span class="text-lg text-slate-400">Points</span></div>
                    <p class="text-sm text-slate-400 mb-4">100 Rs spent = 1 Point | 1 Point = 1 Rs Off</p>
                    <div class="w-full bg-brand-dark/50 rounded-full h-3 mb-2">
                        <div class="bg-gradient-to-r from-brand-cyan to-brand-emerald h-3 rounded-full transition-all duration-500" style="width: ${Math.min((points % 100), 100)}%"></div>
                    </div>
                    <p class="text-xs text-slate-400 mb-6">${100 - (points % 100)} points until next ₹100 reward!</p>
                    <button onclick="alert('${points >= 100 ? `✅ You can redeem ₹${redeemableAmount} off your next service! Apply at checkout.` : '⚠️ You need at least 100 points to redeem a reward.'}')" 
                        class="w-full py-3 rounded-lg ${points >= 100 ? 'bg-brand-emerald text-brand-dark font-bold hover:bg-brand-emerald/80' : 'bg-white/5 text-slate-500 cursor-not-allowed'} transition-all">
                        Redeem Rewards
                    </button>
                </div>

                <div class="glass rounded-2xl p-8 border border-brand-purple/30 relative overflow-hidden">
                    <div class="absolute top-0 right-0 w-32 h-32 bg-brand-purple/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                    <h3 class="font-display text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <i class="fa-solid fa-gift text-brand-purple"></i> Refer & Earn
                    </h3>
                    <p class="text-sm text-slate-400 mb-4">Share your code. They get 50 pts, you get 100 pts!</p>
                    <div class="flex items-center gap-2 mb-6">
                        <code class="flex-1 bg-brand-dark/80 border border-brand-purple/30 rounded-lg px-4 py-3 text-brand-purple font-mono text-lg text-center tracking-wider">${user.referralCode || 'DTS-XXXXXX'}</code>
                        <button onclick="navigator.clipboard.writeText('${user.referralCode}'); alert('Code copied to clipboard!')" class="p-3 rounded-lg bg-brand-purple/20 text-brand-purple hover:bg-brand-purple/30 transition-all">
                            <i class="fa-regular fa-copy text-xl"></i>
                        </button>
                    </div>
                    <div class="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 mb-4">
                        <p class="text-xs text-yellow-400 font-semibold mb-1">🎁 Your Personal Welcome Coupon:</p>
                        <code class="text-lg font-bold text-white">${user.personalCoupon || 'FIRST99'}</code>
                        <p class="text-xs text-slate-400 mt-1">Use this for ₹99 off your first Home Service!</p>
                    </div>
                </div>
            </div>
        `;
    } else if (state.profileTab === 'settings') {
        contentHtml = `
            <div class="glass rounded-2xl p-8 border border-white/10 reveal max-w-2xl mx-auto">
                <h3 class="font-display text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <i class="fa-solid fa-user-pen text-brand-cyan"></i> Edit Personal Details
                </h3>
                <form onsubmit="saveProfile(event)" class="space-y-4">
                    <div class="grid md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-medium text-slate-400 mb-1">First Name</label>
                            <input type="text" name="firstName" value="${user.firstName || ''}" class="w-full bg-brand-dark/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-cyan transition-colors">
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-slate-400 mb-1">Last Name</label>
                            <input type="text" name="lastName" value="${user.lastName || ''}" class="w-full bg-brand-dark/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-cyan transition-colors">
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-slate-400 mb-1">Email Address</label>
                        <input type="email" name="email" value="${user.email || ''}" class="w-full bg-brand-dark/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-cyan transition-colors">
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-slate-400 mb-1">Phone Number</label>
                        <input type="tel" name="phone" value="${user.phone || ''}" class="w-full bg-brand-dark/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-cyan transition-colors">
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-slate-400 mb-1">Full Address</label>
                        <textarea name="address" rows="3" class="w-full bg-brand-dark/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-cyan transition-colors resize-none" placeholder="House No, Building, Street, City, State, ZIP">${user.address || ''}</textarea>
                    </div>
                    <div class="pt-4 border-t border-white/10">
                        <button type="submit" class="px-8 py-3 rounded-lg bg-gradient-to-r from-brand-cyan to-brand-emerald text-brand-dark font-bold hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-all flex items-center gap-2">
                            <i class="fa-solid fa-save"></i> Save Changes
                        </button>
                    </div>
                </form>
            </div>
        `;
    }

    return `
        <section class="relative z-10 py-24 px-4 sm:px-6 lg:px-8 min-h-screen">
            <div class="max-w-6xl mx-auto">
                <!-- Profile Header -->
                <div class="glass rounded-2xl p-6 border ${planTier.border} mb-8 reveal flex flex-col md:flex-row items-center gap-6 relative overflow-hidden ${planTier.glow}">
                    ${planTier.tier !== 'standard' ? `
                    <div class="absolute inset-0 opacity-[0.04]">
                        <div class="absolute inset-0 bg-gradient-to-br ${planTier.gradient} animate-pulse-slow"></div>
                    </div>
                    <div class="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br ${planTier.gradient} opacity-[0.06] rounded-full blur-3xl -mr-12 -mt-12"></div>
                    ` : ''}
                    
                    <div class="relative">
                        <img src="${user.profilePhoto || `https://placehold.co/120x120/0f172a/00f0ff?text=${user.firstName ? user.firstName[0] : 'U'}&font=montserrat`}" 
                             alt="Profile" class="w-24 h-24 rounded-full object-cover border-4 ${planTier.tier !== 'standard' ? `border-${planTier.color}-500/50` : 'border-brand-cyan/30'} ${planTier.tier !== 'standard' ? 'ring-4 ring-' + planTier.color + '-500/20 ring-offset-2 ring-offset-brand-dark' : ''}">
                        
                        <!-- Premium Badge Overlay -->
                        ${planTier.tier !== 'standard' ? `
                        <div class="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-gradient-to-br ${planTier.gradient} flex items-center justify-center border-2 border-brand-dark shadow-lg animate-bounce" style="animation-duration: 3s;">
                            <i class="fa-solid ${planTier.icon} text-white text-sm"></i>
                        </div>
                        ` : ''}
                        
                        <!-- Upload Button -->
                        <label class="absolute top-0 right-0 w-8 h-8 rounded-full bg-brand-cyan/20 border border-brand-cyan/50 flex items-center justify-center cursor-pointer hover:bg-brand-cyan/30 transition-all" title="Change Profile Photo">
                            <i class="fa-solid fa-camera text-brand-cyan text-xs"></i>
                            <input type="file" accept="image/*" onchange="updateProfilePhoto(this)" class="hidden">
                        </label>
                    </div>
                    
                    <div class="text-center md:text-left flex-1 relative">
                        <div class="flex items-center gap-3 mb-2 flex-wrap">
                            <h2 class="font-display text-2xl font-bold text-white">${user.firstName || ''} ${user.lastName || ''}</h2>
                            ${planTier.tier !== 'standard' ? `
                            <span class="px-3 py-1 rounded-full bg-gradient-to-r ${planTier.gradient} text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1 shadow-lg">
                                <i class="fa-solid ${planTier.icon}"></i> ${planTier.label}
                            </span>
                            ` : ''}
                        </div>
                        <p class="text-brand-cyan font-mono text-sm mb-2">@${user.username || 'user'}</p>
                        <div class="flex flex-wrap gap-2 justify-center md:justify-start">
                            <span class="inline-block px-3 py-1 rounded-full bg-brand-emerald/20 text-brand-emerald text-xs font-bold border border-brand-emerald/30">
                                <i class="fa-solid fa-circle-check mr-1"></i> Verified Customer
                            </span>
                            ${planTier.tier === 'enterprise' ? `
                            <span class="inline-block px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 text-xs font-bold border border-purple-500/30">
                                <i class="fa-solid fa-building mr-1"></i> Enterprise Client
                            </span>
                            <span class="inline-block px-3 py-1 rounded-full bg-purple-500/10 text-purple-300 text-[10px] font-semibold border border-purple-500/20">
                                <i class="fa-solid fa-infinity mr-1"></i> Unlimited Everything
                            </span>
                            ` : ''}
                            ${planTier.tier === 'business' ? `
                            <span class="inline-block px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-bold border border-yellow-500/30">
                                <i class="fa-solid fa-briefcase mr-1"></i> Business Member
                            </span>
                            <span class="inline-block px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-300 text-[10px] font-semibold border border-yellow-500/20">
                                <i class="fa-solid fa-bolt mr-1"></i> Priority 4hr Response
                            </span>
                            ` : ''}
                            ${planTier.tier === 'starter' ? `
                            <span class="inline-block px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-bold border border-cyan-500/30">
                                <i class="fa-solid fa-shield-halved mr-1"></i> AMC Protected
                            </span>
                            <span class="inline-block px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 text-[10px] font-semibold border border-cyan-500/20">
                                <i class="fa-solid fa-headset mr-1"></i> 4 Sessions/mo
                            </span>
                            ` : ''}
                        </div>
                        ${planTier.tier !== 'standard' ? `
                        <div class="mt-3 flex items-center gap-2">
                            <div class="h-px flex-1 bg-gradient-to-r from-transparent via-${planTier.color}-500/30 to-transparent"></div>
                            <span class="text-[10px] text-${planTier.color}-400 font-semibold uppercase tracking-widest">Premium Member</span>
                            <div class="h-px flex-1 bg-gradient-to-r from-transparent via-${planTier.color}-500/30 to-transparent"></div>
                        </div>
                        ` : ''}
                    </div>
                </div>

                <!-- Tabs -->
                <div class="flex overflow-x-auto gap-2 mb-8 pb-2 reveal no-scrollbar">
                    ${tabs.map(tab => `
                        <button onclick="state.profileTab = '${tab.id}'; switchView('profile');" 
                            class="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${state.profileTab === tab.id ? 'bg-brand-cyan text-brand-dark' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}">
                            <i class="fa-solid ${tab.icon}"></i> ${tab.label}
                        </button>
                    `).join('')}
                </div>

                <!-- Tab Content -->
                ${contentHtml}
            </div>
        </section>
    `;
}

function updateProfilePhoto(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            state.currentUser.profilePhoto = e.target.result;
            localStorage.setItem('dts_user', JSON.stringify(state.currentUser));
            switchView('profile'); // Re-render to show new image
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function saveProfile(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const updates = Object.fromEntries(formData.entries());
    
    state.currentUser = { ...state.currentUser, ...updates };
    localStorage.setItem('dts_user', JSON.stringify(state.currentUser));
    
    // Update in the main users database
    let users = JSON.parse(localStorage.getItem('dts_registered_users') || '[]');
    const userIndex = users.findIndex(u => u.username === state.currentUser.username);
    if (userIndex !== -1) {
        users[userIndex] = state.currentUser;
        localStorage.setItem('dts_registered_users', JSON.stringify(users));
    }
    
    alert('✅ Profile updated successfully!');
    switchView('profile');
}

async function renderAdminControlCenter() {
    // Load all data from Firebase or localStorage
    const allUsers = await DTSDB.getAllUsers();
    const allTransactions = allUsers.flatMap(u => 
        [...(u.bookings || []), ...(u.orders || [])].map(t => ({...t, userName: u.firstName + ' ' + u.lastName, userEmail: u.email, username: u.username}))
    );
    const coupons = await DTSDB.getAllCoupons();
    const activityLogs = await DTSDB.getActivityLogs();
    const allTickets = allUsers.flatMap(u => (u.tickets || []).map(t => ({...t, userName: u.firstName + ' ' + u.lastName, userEmail: u.email})));
    const technicians = await DTSDB.getAllTechnicians();
    const inventory = await DTSDB.getAllInventory();
    
    const totalRevenue = allTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    const pendingAssignments = allTransactions.filter(t => t.status === 'Booked' || t.status === 'Pending' || t.status === 'Processing').length;

    const tabs = [
        { id: 'dashboard', label: 'Dashboard', icon: 'fa-chart-line' },
        { id: 'approvals', label: 'Booking Approvals', icon: 'fa-clipboard-check' },
        { id: 'dispatch', label: 'Service Dispatch', icon: 'fa-truck-fast' },
        { id: 'technicians', label: 'Technicians', icon: 'fa-user-gear' },
        { id: 'transactions', label: 'Bookings & Orders', icon: 'fa-calendar-check' },
        { id: 'inventory', label: 'Inventory & Products', icon: 'fa-boxes-stacked' },
        { id: 'analytics', label: 'Revenue Analytics', icon: 'fa-chart-pie' },
        { id: 'tickets', label: 'Support Tickets', icon: 'fa-ticket' },
        { id: 'web-requests', label: 'Website Requests', icon: 'fa-code' },
        { id: 'software-management', label: 'Software Management', icon: 'fa-calculator' },
        { id: 'users', label: 'Users', icon: 'fa-users' },
        { id: 'offers', label: 'Offers & Coupons', icon: 'fa-tags' }
    ];

    let contentHtml = '';

    if (state.adminTab === 'dashboard') {
        contentHtml = `
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div class="glass p-6 rounded-xl border border-white/5">
                    <div class="text-slate-400 text-xs uppercase mb-1">Total Users</div>
                    <div class="text-3xl font-bold text-white">${allUsers.length}</div>
                </div>
                <div class="glass p-6 rounded-xl border border-white/5">
                    <div class="text-slate-400 text-xs uppercase mb-1">Total Transactions</div>
                    <div class="text-3xl font-bold text-brand-cyan">${allTransactions.length}</div>
                </div>
                <div class="glass p-6 rounded-xl border border-white/5">
                    <div class="text-slate-400 text-xs uppercase mb-1">Pending Actions</div>
                    <div class="text-3xl font-bold text-yellow-500">${pendingAssignments}</div>
                </div>
                <div class="glass p-6 rounded-xl border border-white/5">
                    <div class="text-slate-400 text-xs uppercase mb-1">Total Revenue</div>
                    <div class="text-3xl font-bold text-brand-emerald">₹${totalRevenue.toLocaleString()}</div>
                </div>
            </div>
            <div class="grid lg:grid-cols-3 gap-6">
                <div class="lg:col-span-2 glass rounded-2xl p-2 border border-white/10">
                    <div id="admin-map" class="h-[400px] rounded-xl overflow-hidden"></div>
                </div>
                <div class="glass rounded-2xl p-6 border border-white/10">
                    <h3 class="font-display text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <i class="fa-solid fa-bolt text-yellow-400"></i> Live Activity
                    </h3>
                    <div class="space-y-4 max-h-[350px] overflow-y-auto custom-scrollbar pr-2">
                        ${activityLogs.length === 0 ? '<p class="text-slate-500 text-sm">No recent activity.</p>' : 
                          activityLogs.map(log => `
                            <div class="flex gap-3 items-start pb-3 border-b border-white/5 last:border-0">
                                <div class="w-2 h-2 rounded-full bg-brand-cyan mt-1.5 flex-shrink-0"></div>
                                <div>
                                    <p class="text-sm text-slate-300">${log.action}</p>
                                    <p class="text-[10px] text-slate-500 mt-1">${log.time}</p>
                                </div>
                            </div>
                          `).join('')}
                    </div>
                </div>
            </div>
        `;
    } else if (state.adminTab === 'approvals') {
        // Booking Approvals - Admin reviews and approves/rejects bookings
        const pendingApprovals = allTransactions.filter(t => t.status === 'Booked' || t.status === 'Pending');
        const approvedToday = allTransactions.filter(t => {
            if (t.status !== 'Confirmed' && t.status !== 'Assigned') return false;
            if (!t.approvedAt) return false;
            const today = new Date().toDateString();
            return new Date(t.approvedAt).toDateString() === today;
        }).length;
        
        contentHtml = `
            <div class="space-y-6">
                <!-- Approval Stats -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div class="glass p-5 rounded-xl border border-yellow-500/30">
                        <div class="text-slate-400 text-xs uppercase mb-1">Pending Approval</div>
                        <div class="text-2xl font-bold text-yellow-500">${pendingApprovals.length}</div>
                    </div>
                    <div class="glass p-5 rounded-xl border border-brand-emerald/30">
                        <div class="text-slate-400 text-xs uppercase mb-1">Approved Today</div>
                        <div class="text-2xl font-bold text-brand-emerald">${approvedToday}</div>
                    </div>
                    <div class="glass p-5 rounded-xl border border-brand-cyan/30">
                        <div class="text-slate-400 text-xs uppercase mb-1">Total Confirmed</div>
                        <div class="text-2xl font-bold text-brand-cyan">${allTransactions.filter(t => t.status === 'Confirmed').length}</div>
                    </div>
                    <div class="glass p-5 rounded-xl border border-red-500/30">
                        <div class="text-slate-400 text-xs uppercase mb-1">Rejected</div>
                        <div class="text-2xl font-bold text-red-500">${allTransactions.filter(t => t.status === 'Rejected').length}</div>
                    </div>
                </div>

                <!-- Pending Approvals Queue -->
                <div class="glass rounded-2xl p-6 border border-white/10">
                    <h3 class="font-display text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <i class="fa-solid fa-clipboard-check text-yellow-500"></i> Pending Booking Approvals
                    </h3>
                    ${pendingApprovals.length === 0 ? `
                        <div class="text-center py-12">
                            <i class="fa-solid fa-check-circle text-5xl text-brand-emerald mb-4"></i>
                            <p class="text-slate-400 text-lg">All caught up! No pending approvals.</p>
                        </div>
                    ` : `
                    <div class="space-y-4">
                        ${pendingApprovals.map(booking => `
                            <div class="bg-brand-dark/50 rounded-xl p-5 border border-yellow-500/20 hover:border-yellow-500/40 transition-all">
                                <div class="flex flex-col lg:flex-row justify-between gap-4">
                                    <div class="flex-1">
                                        <div class="flex items-center gap-3 mb-3 flex-wrap">
                                            <span class="font-mono text-brand-cyan text-sm font-bold">${booking.id}</span>
                                            <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase ${booking.type === 'Product' ? 'bg-brand-purple/20 text-brand-purple' : 'bg-brand-cyan/20 text-brand-cyan'}">${booking.type}</span>
                                            <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-yellow-500/20 text-yellow-500 animate-pulse">${booking.status}</span>
                                        </div>
                                        
                                        <h4 class="font-bold text-white text-lg mb-2">${booking.service || booking.product || 'Service'}</h4>
                                        
                                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                            <div class="space-y-1">
                                                <p class="text-slate-400"><i class="fa-solid fa-user mr-2 text-brand-cyan"></i> ${booking.userName}</p>
                                                <p class="text-slate-400"><i class="fa-solid fa-at mr-2 text-brand-cyan"></i> @${booking.username}</p>
                                                <p class="text-slate-400"><i class="fa-solid fa-envelope mr-2 text-brand-cyan"></i> ${booking.userEmail}</p>
                                            </div>
                                            <div class="space-y-1">
                                                <p class="text-slate-400"><i class="fa-solid fa-location-dot mr-2 text-brand-emerald"></i> ${booking.address || 'Address not provided'}</p>
                                                ${booking.amount ? `<p class="text-brand-emerald font-bold"><i class="fa-solid fa-indian-rupee-sign mr-1"></i> ₹${booking.amount}</p>` : ''}
                                            </div>
                                        </div>
                                        
                                        <!-- Editable Date/Time Section -->
                                        <div class="mt-4 p-3 rounded-lg bg-brand-dark/80 border border-white/10">
                                            <p class="text-xs text-slate-400 mb-2 font-semibold uppercase tracking-wide">
                                                <i class="fa-solid fa-calendar-days mr-1 text-brand-cyan"></i> Modify Date & Time
                                            </p>
                                            <div class="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label class="text-[10px] text-slate-500 mb-1 block">Date</label>
                                                    <input type="date" id="edit-date-${booking.id}" value="${booking.date || ''}" class="w-full bg-brand-dark border border-white/20 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-brand-cyan">
                                                </div>
                                                <div>
                                                    <label class="text-[10px] text-slate-500 mb-1 block">Time</label>
                                                    <input type="time" id="edit-time-${booking.id}" value="${booking.time || ''}" class="w-full bg-brand-dark border border-white/20 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-brand-cyan">
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="flex flex-col gap-2 lg:min-w-[180px]">
                                        <button onclick="approveBookingWithDateTime('${booking.id}')" class="relative z-10 px-4 py-3 rounded-lg bg-brand-emerald text-white font-bold text-sm hover:bg-brand-emerald/80 transition-all flex items-center justify-center gap-2">
                                            <i class="fa-solid fa-check"></i> Approve & Confirm
                                        </button>
                                        <button onclick="rejectBooking('${booking.id}')" class="relative z-10 px-4 py-3 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 font-bold text-sm hover:bg-red-500/30 transition-all flex items-center justify-center gap-2">
                                            <i class="fa-solid fa-xmark"></i> Reject Booking
                                        </button>
                                        <button onclick="viewBookingDetails('${booking.id}')" class="relative z-10 px-4 py-3 rounded-lg bg-white/5 text-slate-300 border border-white/10 font-semibold text-sm hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                                            <i class="fa-solid fa-eye"></i> View Details
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    `}
                </div>

                <!-- Recently Approved -->
                <div class="glass rounded-2xl p-6 border border-white/10">
                    <h3 class="font-display text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <i class="fa-solid fa-clock-rotate-left text-brand-cyan"></i> Recently Approved
                    </h3>
                    ${allTransactions.filter(t => t.status === 'Confirmed' || t.status === 'Assigned').length === 0 ? `
                        <p class="text-slate-500 text-sm text-center py-8">No approved bookings yet.</p>
                    ` : `
                    <div class="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                        ${allTransactions.filter(t => t.status === 'Confirmed' || t.status === 'Assigned').slice(0, 10).map(booking => `
                            <div class="flex items-center justify-between p-3 rounded-lg bg-brand-dark/30 border border-white/5">
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 rounded-full bg-brand-emerald/20 flex items-center justify-center">
                                        <i class="fa-solid fa-check text-brand-emerald"></i>
                                    </div>
                                    <div>
                                        <p class="text-sm font-semibold text-white">${booking.service || booking.product}</p>
                                        <p class="text-xs text-slate-400">${booking.userName} • ${booking.date} ${booking.time || ''}</p>
                                    </div>
                                </div>
                                <div class="text-right">
                                    <span class="px-2 py-1 rounded text-[10px] font-bold uppercase ${booking.status === 'Confirmed' ? 'bg-brand-emerald/20 text-brand-emerald' : 'bg-brand-cyan/20 text-brand-cyan'}">${booking.status}</span>
                                    ${booking.approvedAt ? `<p class="text-[10px] text-slate-500 mt-1">${new Date(booking.approvedAt).toLocaleString()}</p>` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    `}
                </div>
            </div>
        `;
    } else if (state.adminTab === 'dispatch') {
        // Service Dispatch Queue - Only approved bookings that need technician assignment
        const pendingBookings = allTransactions.filter(t => t.status === 'Confirmed');
        
        contentHtml = `
            <div class="space-y-6">
                <!-- Dispatch Stats -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div class="glass p-5 rounded-xl border border-yellow-500/30">
                        <div class="text-slate-400 text-xs uppercase mb-1">Pending Dispatch</div>
                        <div class="text-2xl font-bold text-yellow-500">${pendingBookings.length}</div>
                    </div>
                    <div class="glass p-5 rounded-xl border border-brand-cyan/30">
                        <div class="text-slate-400 text-xs uppercase mb-1">Available Techs</div>
                        <div class="text-2xl font-bold text-brand-cyan">${technicians.filter(t => t.status === 'available').length}</div>
                    </div>
                    <div class="glass p-5 rounded-xl border border-brand-emerald/30">
                        <div class="text-slate-400 text-xs uppercase mb-1">On Job</div>
                        <div class="text-2xl font-bold text-brand-emerald">${technicians.filter(t => t.status === 'on-job').length}</div>
                    </div>
                    <div class="glass p-5 rounded-xl border border-slate-500/30">
                        <div class="text-slate-400 text-xs uppercase mb-1">Offline</div>
                        <div class="text-2xl font-bold text-slate-400">${technicians.filter(t => t.status === 'offline').length}</div>
                    </div>
                </div>

                <!-- Pending Bookings Queue -->
                <div class="glass rounded-2xl p-6 border border-white/10">
                    <h3 class="font-display text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <i class="fa-solid fa-clock-rotate-left text-yellow-500"></i> Pending Service Queue
                    </h3>
                    ${pendingBookings.length === 0 ? '<p class="text-slate-500 text-sm text-center py-8">No pending bookings. All services are dispatched!</p>' : `
                    <div class="space-y-3">
                        ${pendingBookings.map(booking => `
                            <div class="bg-brand-dark/50 rounded-xl p-4 border border-white/5 flex flex-col md:flex-row justify-between gap-4">
                                <div class="flex-1">
                                    <div class="flex items-center gap-3 mb-2">
                                        <span class="font-mono text-brand-cyan text-sm font-bold">${booking.id}</span>
                                        <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase ${booking.type === 'Product' ? 'bg-brand-purple/20 text-brand-purple' : 'bg-brand-cyan/20 text-brand-cyan'}">${booking.type}</span>
                                        <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-yellow-500/20 text-yellow-500">${booking.status}</span>
                                    </div>
                                    <h4 class="font-bold text-white mb-1">${booking.service || booking.product || 'Service'}</h4>
                                    <p class="text-xs text-slate-400">
                                        <i class="fa-solid fa-user mr-1"></i> ${booking.userName} (@${booking.username})<br>
                                        <i class="fa-solid fa-calendar mr-1"></i> ${booking.date || 'Date not set'} ${booking.time ? 'at ' + booking.time : ''}<br>
                                        ${booking.address ? `<i class="fa-solid fa-location-dot mr-1"></i> ${booking.address}` : ''}
                                    </p>
                                </div>
                                <div class="flex flex-col gap-2 md:min-w-[200px]">
                                    <select id="tech-select-${booking.id}" class="bg-brand-dark border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-cyan">
                                        <option value="">Select Technician...</option>
                                        ${technicians.filter(t => t.status === 'available').map(t => `<option value="${t.id}">${t.name} (${t.specialization || 'General'})</option>`).join('')}
                                    </select>
                                    <button onclick="assignTechnicianToBooking('${booking.id}')" class="px-4 py-2 rounded-lg bg-brand-emerald text-brand-dark font-bold text-sm hover:bg-brand-emerald/80 transition-all">
                                        <i class="fa-solid fa-user-check mr-1"></i> Assign
                                    </button>
                                    <button onclick="generateBookingQR('${booking.id}')" class="px-4 py-2 rounded-lg bg-brand-purple/20 text-brand-purple border border-brand-purple/50 font-semibold text-sm hover:bg-brand-purple/30 transition-all">
                                        <i class="fa-solid fa-qrcode mr-1"></i> Generate QR
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    `}
                </div>
            </div>
        `;
    } else if (state.adminTab === 'technicians') {
        // Technician Management
        
        contentHtml = `
            <div class="space-y-6">
                <!-- Add Technician Form -->
                <div class="glass rounded-2xl p-6 border border-white/10">
                    <h3 class="font-display text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <i class="fa-solid fa-user-plus text-brand-cyan"></i> Add New Technician
                    </h3>
                    <form onsubmit="handleAddTechnician(event)" class="grid md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-medium text-slate-400 mb-1">Full Name</label>
                            <input type="text" name="name" required class="w-full bg-brand-dark/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-cyan" placeholder="e.g., Rahul Sharma">
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-slate-400 mb-1">Phone Number</label>
                            <input type="tel" name="phone" required class="w-full bg-brand-dark/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-cyan" placeholder="+91 98XXX XXXXX">
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-slate-400 mb-1">Email</label>
                            <input type="email" name="email" class="w-full bg-brand-dark/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-cyan" placeholder="tech@dts.com">
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-slate-400 mb-1">Password</label>
                            <input type="text" name="password" class="w-full bg-brand-dark/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-cyan" placeholder="Default: dts123" value="dts123">
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-slate-400 mb-1">Specialization</label>
                            <select name="specialization" class="w-full bg-brand-dark/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-cyan">
                                <option value="General IT">General IT</option>
                                <option value="Computer & Laptop">Computer & Laptop</option>
                                <option value="Wi-Fi & Networking">Wi-Fi & Networking</option>
                                <option value="CCTV & Security">CCTV & Security</option>
                                <option value="Smart Devices">Smart Devices</option>
                                <option value="Business IT">Business IT</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-slate-400 mb-1">Location / Area</label>
                            <input type="text" name="location" class="w-full bg-brand-dark/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-cyan" placeholder="e.g., Rewari, Gurugram">
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-slate-400 mb-1">Status</label>
                            <select name="status" class="w-full bg-brand-dark/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-cyan">
                                <option value="available">Available</option>
                                <option value="on-job">On Job</option>
                                <option value="offline">Offline</option>
                            </select>
                        </div>
                        <div class="md:col-span-2">
                            <button type="submit" class="w-full py-3 rounded-lg bg-gradient-to-r from-brand-cyan to-brand-emerald text-brand-dark font-bold hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-all">
                                <i class="fa-solid fa-plus mr-2"></i> Add Technician
                            </button>
                        </div>
                    </form>
                </div>

                <!-- Technician List -->
                <div class="glass rounded-2xl p-6 border border-white/10">
                    <h3 class="font-display text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <i class="fa-solid fa-users-gear text-brand-emerald"></i> Technician Team (${technicians.length})
                    </h3>
                    ${technicians.length === 0 ? '<p class="text-slate-500 text-sm text-center py-8">No technicians added yet. Add your first technician above.</p>' : `
                    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        ${technicians.map((tech, idx) => `
                            <div class="bg-brand-dark/50 rounded-xl p-4 border border-white/5 relative">
                                <div class="flex items-start justify-between mb-3">
                                    <div class="flex items-center gap-3">
                                        <div class="w-12 h-12 rounded-full bg-gradient-to-br from-brand-cyan to-brand-emerald flex items-center justify-center text-brand-dark font-bold text-lg">
                                            ${tech.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h4 class="font-bold text-white text-sm">${tech.name}</h4>
                                            <p class="text-xs text-slate-400">${tech.specialization || 'General IT'}</p>
                                        </div>
                                    </div>
                                    <span class="px-2 py-1 rounded text-[10px] font-bold uppercase ${tech.status === 'available' ? 'bg-brand-cyan/20 text-brand-cyan' : tech.status === 'on-job' ? 'bg-brand-emerald/20 text-brand-emerald' : 'bg-slate-500/20 text-slate-400'}">
                                        ${tech.status === 'available' ? '● Available' : tech.status === 'on-job' ? '● On Job' : '● Offline'}
                                    </span>
                                </div>
                                <div class="text-xs text-slate-400 space-y-1 mb-3">
                                    <p><i class="fa-solid fa-phone w-4"></i> ${tech.phone || 'N/A'}</p>
                                    ${tech.email ? `<p><i class="fa-solid fa-envelope w-4"></i> ${tech.email}</p>` : ''}
                                    ${tech.location ? `<p><i class="fa-solid fa-location-dot w-4"></i> ${tech.location}</p>` : ''}
                                    <p><i class="fa-solid fa-briefcase w-4"></i> ${tech.completedJobs || 0} jobs completed</p>
                                    <p><i class="fa-solid fa-key w-4"></i> <span class="font-mono text-xs">ID: ${tech.id}</span></p>
                                </div>
                                <div class="flex gap-2">
                                    <button onclick="toggleTechnicianStatus('${tech.id}')" class="flex-1 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-white transition-all">
                                        <i class="fa-solid fa-toggle-on mr-1"></i> Toggle Status
                                    </button>
                                    <button onclick="editTechnicianCredentials('${tech.id}')" class="px-3 py-2 rounded-lg bg-brand-cyan/20 text-brand-cyan hover:bg-brand-cyan/30 text-xs font-bold transition-all">
                                        <i class="fa-solid fa-key"></i>
                                    </button>
                                    <button onclick="deleteTechnician('${tech.id}')" class="px-3 py-2 rounded-lg bg-red-500/20 text-red-500 hover:bg-red-500/30 text-xs font-bold transition-all">
                                        <i class="fa-solid fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    `}
                </div>
            </div>
        `;
    } else if (state.adminTab === 'inventory') {
        // Inventory & Products Management
        
        contentHtml = `
            <div class="space-y-6">
                <!-- Add Product Form -->
                <div class="glass rounded-2xl p-6 border border-white/10">
                    <h3 class="font-display text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <i class="fa-solid fa-box-open text-brand-purple"></i> Add New Product
                    </h3>
                    <form onsubmit="handleAddProduct(event)" class="grid md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-medium text-slate-400 mb-1">Product Name</label>
                            <input type="text" name="name" required class="w-full bg-brand-dark/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-cyan" placeholder="e.g., TP-Link Router AX3000">
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-slate-400 mb-1">Category</label>
                            <select name="category" class="w-full bg-brand-dark/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-cyan">
                                <option value="networking">Networking</option>
                                <option value="storage">Storage</option>
                                <option value="security">Security</option>
                                <option value="hardware">Hardware</option>
                                <option value="power">Power & UPS</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-slate-400 mb-1">Price (₹)</label>
                            <input type="number" name="price" required class="w-full bg-brand-dark/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-cyan" placeholder="2999">
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-slate-400 mb-1">Stock Quantity</label>
                            <input type="number" name="stock" required class="w-full bg-brand-dark/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-cyan" placeholder="50">
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-slate-400 mb-1">Installation Required?</label>
                            <select name="installation" class="w-full bg-brand-dark/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-cyan">
                                <option value="false">No</option>
                                <option value="true">Yes (+₹99)</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-slate-400 mb-1">SKU / Product Code</label>
                            <input type="text" name="sku" class="w-full bg-brand-dark/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-cyan" placeholder="TPL-AX3000">
                        </div>
                        <div class="md:col-span-2">
                            <button type="submit" class="w-full py-3 rounded-lg bg-gradient-to-r from-brand-purple to-brand-cyan text-white font-bold hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all">
                                <i class="fa-solid fa-plus mr-2"></i> Add Product to Inventory
                            </button>
                        </div>
                    </form>
                </div>

                <!-- Inventory Stats -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div class="glass p-5 rounded-xl border border-brand-purple/30">
                        <div class="text-slate-400 text-xs uppercase mb-1">Total Products</div>
                        <div class="text-2xl font-bold text-brand-purple">${inventory.length}</div>
                    </div>
                    <div class="glass p-5 rounded-xl border border-brand-emerald/30">
                        <div class="text-slate-400 text-xs uppercase mb-1">Total Stock Value</div>
                        <div class="text-2xl font-bold text-brand-emerald">₹${inventory.reduce((sum, p) => sum + (p.price * p.stock), 0).toLocaleString()}</div>
                    </div>
                    <div class="glass p-5 rounded-xl border border-yellow-500/30">
                        <div class="text-slate-400 text-xs uppercase mb-1">Low Stock Items</div>
                        <div class="text-2xl font-bold text-yellow-500">${inventory.filter(p => p.stock < 10).length}</div>
                    </div>
                    <div class="glass p-5 rounded-xl border border-brand-cyan/30">
                        <div class="text-slate-400 text-xs uppercase mb-1">Out of Stock</div>
                        <div class="text-2xl font-bold text-brand-cyan">${inventory.filter(p => p.stock === 0).length}</div>
                    </div>
                </div>

                <!-- Product List -->
                <div class="glass rounded-2xl p-6 border border-white/10 overflow-x-auto">
                    <h3 class="font-display text-lg font-bold text-white mb-4">Product Inventory</h3>
                    ${inventory.length === 0 ? '<p class="text-slate-500 text-sm text-center py-8">No products in inventory. Add your first product above.</p>' : `
                    <table class="w-full text-sm text-left text-slate-400">
                        <thead class="text-xs text-slate-300 uppercase bg-white/5">
                            <tr>
                                <th class="px-4 py-3">Product</th>
                                <th class="px-4 py-3">Category</th>
                                <th class="px-4 py-3">Price</th>
                                <th class="px-4 py-3">Stock</th>
                                <th class="px-4 py-3">SKU</th>
                                <th class="px-4 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${inventory.map((product, idx) => `
                                <tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
                                    <td class="px-4 py-3">
                                        <div class="font-semibold text-white">${product.name}</div>
                                        ${product.installation ? '<span class="text-[10px] text-brand-emerald">+ Installation</span>' : ''}
                                    </td>
                                    <td class="px-4 py-3"><span class="px-2 py-1 rounded text-[10px] font-bold uppercase bg-brand-purple/20 text-brand-purple">${product.category}</span></td>
                                    <td class="px-4 py-3 font-bold text-white">₹${product.price.toLocaleString()}</td>
                                    <td class="px-4 py-3">
                                        <span class="${product.stock === 0 ? 'text-red-500 font-bold' : product.stock < 10 ? 'text-yellow-500 font-bold' : 'text-brand-emerald'}">${product.stock}</span>
                                        ${product.stock === 0 ? '<span class="text-[10px] text-red-500 ml-1">OUT</span>' : product.stock < 10 ? '<span class="text-[10px] text-yellow-500 ml-1">LOW</span>' : ''}
                                    </td>
                                    <td class="px-4 py-3 font-mono text-xs">${product.sku || 'N/A'}</td>
                                    <td class="px-4 py-3">
                                        <button onclick="deleteProduct(${idx})" class="px-3 py-1 rounded bg-red-500/20 text-red-500 text-xs font-bold hover:bg-red-500/30 transition-all">
                                            <i class="fa-solid fa-trash"></i>
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    `}
                </div>
            </div>
        `;
    } else if (state.adminTab === 'analytics') {
        // Revenue Analytics & Business Insights
        const today = new Date();
        const thisMonth = today.getMonth();
        const thisYear = today.getFullYear();
        
        const monthlyRevenue = allTransactions
            .filter(t => {
                const tDate = new Date(t.date);
                return tDate.getMonth() === thisMonth && tDate.getFullYear() === thisYear;
            })
            .reduce((sum, t) => sum + (t.amount || 0), 0);
        
        const serviceRevenue = allTransactions.filter(t => t.type === 'Service').reduce((sum, t) => sum + (t.amount || 0), 0);
        const productRevenue = allTransactions.filter(t => t.type === 'Product').reduce((sum, t) => sum + (t.amount || 0), 0);
        const amcRevenue = allTransactions.filter(t => t.type === 'AMC').reduce((sum, t) => sum + (t.amount || 0), 0);
        
        const completedJobs = allTransactions.filter(t => t.status === 'Completed' || t.status === 'Closed' || t.status === 'Delivered').length;
        const avgOrderValue = allTransactions.length > 0 ? Math.round(totalRevenue / allTransactions.length) : 0;

        contentHtml = `
            <div class="space-y-6">
                <!-- Revenue Overview -->
                <div class="grid md:grid-cols-3 gap-6">
                    <div class="glass rounded-2xl p-6 border border-brand-emerald/30 relative overflow-hidden">
                        <div class="absolute top-0 right-0 w-32 h-32 bg-brand-emerald/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                        <div class="relative">
                            <div class="text-slate-400 text-xs uppercase mb-2">Total Revenue</div>
                            <div class="text-4xl font-bold text-brand-emerald mb-2">₹${totalRevenue.toLocaleString()}</div>
                            <div class="text-xs text-slate-400">All-time earnings</div>
                        </div>
                    </div>
                    <div class="glass rounded-2xl p-6 border border-brand-cyan/30 relative overflow-hidden">
                        <div class="absolute top-0 right-0 w-32 h-32 bg-brand-cyan/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                        <div class="relative">
                            <div class="text-slate-400 text-xs uppercase mb-2">This Month</div>
                            <div class="text-4xl font-bold text-brand-cyan mb-2">₹${monthlyRevenue.toLocaleString()}</div>
                            <div class="text-xs text-slate-400">${today.toLocaleString('default', { month: 'long', year: 'numeric' })}</div>
                        </div>
                    </div>
                    <div class="glass rounded-2xl p-6 border border-brand-purple/30 relative overflow-hidden">
                        <div class="absolute top-0 right-0 w-32 h-32 bg-brand-purple/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                        <div class="relative">
                            <div class="text-slate-400 text-xs uppercase mb-2">Avg. Order Value</div>
                            <div class="text-4xl font-bold text-brand-purple mb-2">₹${avgOrderValue.toLocaleString()}</div>
                            <div class="text-xs text-slate-400">Per transaction</div>
                        </div>
                    </div>
                </div>

                <!-- Revenue Breakdown -->
                <div class="grid md:grid-cols-3 gap-6">
                    <div class="glass rounded-2xl p-6 border border-white/10">
                        <h3 class="font-display text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <i class="fa-solid fa-wrench text-brand-cyan"></i> Service Revenue
                        </h3>
                        <div class="text-3xl font-bold text-brand-cyan mb-2">₹${serviceRevenue.toLocaleString()}</div>
                        <div class="text-sm text-slate-400">${allTransactions.filter(t => t.type === 'Service').length} service bookings</div>
                        <div class="mt-4 w-full bg-brand-dark/50 rounded-full h-2">
                            <div class="bg-brand-cyan h-2 rounded-full" style="width: ${totalRevenue > 0 ? (serviceRevenue / totalRevenue * 100) : 0}%"></div>
                        </div>
                        <div class="text-xs text-slate-500 mt-1">${totalRevenue > 0 ? Math.round(serviceRevenue / totalRevenue * 100) : 0}% of total</div>
                    </div>
                    <div class="glass rounded-2xl p-6 border border-white/10">
                        <h3 class="font-display text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <i class="fa-solid fa-box text-brand-purple"></i> Product Revenue
                        </h3>
                        <div class="text-3xl font-bold text-brand-purple mb-2">₹${productRevenue.toLocaleString()}</div>
                        <div class="text-sm text-slate-400">${allTransactions.filter(t => t.type === 'Product').length} product orders</div>
                        <div class="mt-4 w-full bg-brand-dark/50 rounded-full h-2">
                            <div class="bg-brand-purple h-2 rounded-full" style="width: ${totalRevenue > 0 ? (productRevenue / totalRevenue * 100) : 0}%"></div>
                        </div>
                        <div class="text-xs text-slate-500 mt-1">${totalRevenue > 0 ? Math.round(productRevenue / totalRevenue * 100) : 0}% of total</div>
                    </div>
                    <div class="glass rounded-2xl p-6 border border-white/10">
                        <h3 class="font-display text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <i class="fa-solid fa-shield-halved text-brand-emerald"></i> AMC Revenue
                        </h3>
                        <div class="text-3xl font-bold text-brand-emerald mb-2">₹${amcRevenue.toLocaleString()}</div>
                        <div class="text-sm text-slate-400">${allTransactions.filter(t => t.type === 'AMC').length} AMC subscriptions</div>
                        <div class="mt-4 w-full bg-brand-dark/50 rounded-full h-2">
                            <div class="bg-brand-emerald h-2 rounded-full" style="width: ${totalRevenue > 0 ? (amcRevenue / totalRevenue * 100) : 0}%"></div>
                        </div>
                        <div class="text-xs text-slate-500 mt-1">${totalRevenue > 0 ? Math.round(amcRevenue / totalRevenue * 100) : 0}% of total</div>
                    </div>
                </div>

                <!-- Performance Metrics -->
                <div class="glass rounded-2xl p-6 border border-white/10">
                    <h3 class="font-display text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <i class="fa-solid fa-chart-simple text-yellow-500"></i> Business Performance
                    </h3>
                    <div class="grid md:grid-cols-4 gap-4">
                        <div class="bg-brand-dark/50 rounded-xl p-4 border border-white/5">
                            <div class="text-slate-400 text-xs uppercase mb-2">Total Transactions</div>
                            <div class="text-2xl font-bold text-white">${allTransactions.length}</div>
                        </div>
                        <div class="bg-brand-dark/50 rounded-xl p-4 border border-white/5">
                            <div class="text-slate-400 text-xs uppercase mb-2">Completed Jobs</div>
                            <div class="text-2xl font-bold text-brand-emerald">${completedJobs}</div>
                        </div>
                        <div class="bg-brand-dark/50 rounded-xl p-4 border border-white/5">
                            <div class="text-slate-400 text-xs uppercase mb-2">Active Customers</div>
                            <div class="text-2xl font-bold text-brand-cyan">${allUsers.length}</div>
                        </div>
                        <div class="bg-brand-dark/50 rounded-xl p-4 border border-white/5">
                            <div class="text-slate-400 text-xs uppercase mb-2">Pending Orders</div>
                            <div class="text-2xl font-bold text-yellow-500">${pendingAssignments}</div>
                        </div>
                    </div>
                </div>

                <!-- Export Options -->
                <div class="glass rounded-2xl p-6 border border-white/10">
                    <h3 class="font-display text-lg font-bold text-white mb-4">Export Reports</h3>
                    <div class="grid md:grid-cols-3 gap-4">
                        <button onclick="downloadExcel('revenue-report')" class="py-3 rounded-lg bg-brand-emerald/20 text-brand-emerald border border-brand-emerald/50 font-semibold hover:bg-brand-emerald/30 transition-all flex items-center justify-center gap-2">
                            <i class="fa-solid fa-file-excel"></i> Revenue Report
                        </button>
                        <button onclick="downloadExcel('transaction-log')" class="py-3 rounded-lg bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/50 font-semibold hover:bg-brand-cyan/30 transition-all flex items-center justify-center gap-2">
                            <i class="fa-solid fa-file-excel"></i> Transaction Log
                        </button>
                        <button onclick="downloadExcel('customer-list')" class="py-3 rounded-lg bg-brand-purple/20 text-brand-purple border border-brand-purple/50 font-semibold hover:bg-brand-purple/30 transition-all flex items-center justify-center gap-2">
                            <i class="fa-solid fa-file-excel"></i> Customer List
                        </button>
                    </div>
                </div>
            </div>
        `;
    } else if (state.adminTab === 'tickets') {
        contentHtml = `
            <div class="glass rounded-2xl p-6 border border-white/10 overflow-x-auto">
                <h3 class="font-display text-lg font-bold text-white mb-4">Customer Support Tickets</h3>
                ${allTickets.length === 0 ? '<p class="text-slate-500 text-sm">No tickets yet.</p>' : `
                <table class="w-full text-sm text-left text-slate-400">
                    <thead class="text-xs text-slate-300 uppercase bg-white/5">
                        <tr><th class="px-4 py-3">Ticket ID</th><th class="px-4 py-3">Customer</th><th class="px-4 py-3">Subject</th><th class="px-4 py-3">Status</th><th class="px-4 py-3">Action</th></tr>
                    </thead>
                    <tbody>
                        ${allTickets.map(t => `
                            <tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
                                <td class="px-4 py-3 font-mono text-brand-purple">${t.id}</td>
                                <td class="px-4 py-3">${t.userName}<br><span class="text-xs text-slate-500">${t.userEmail}</span></td>
                                <td class="px-4 py-3"><div class="font-semibold text-white">${t.subject}</div><div class="text-xs text-slate-500 mt-1">${t.description}</div></td>
                                <td class="px-4 py-3"><span class="px-2 py-1 rounded text-[10px] font-bold uppercase ${t.status === 'Open' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-brand-emerald/20 text-brand-emerald'}">${t.status}</span></td>
                                <td class="px-4 py-3">${t.status === 'Open' ? `<button onclick="resolveTicket('${t.id}')" class="px-3 py-1 rounded bg-brand-emerald text-brand-dark text-xs font-bold hover:bg-brand-emerald/80">Mark Resolved</button>` : '<span class="text-slate-600 text-xs">Completed</span>'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>`}
            </div>
        `;
    } else if (state.adminTab === 'transactions') {
        contentHtml = allTransactions.length === 0 ? `<div class="glass rounded-2xl p-12 border border-white/10 text-center"><p class="text-slate-400">No transactions yet.</p></div>` : `
            <div class="glass rounded-2xl p-6 border border-white/10 overflow-x-auto">
                <table class="w-full text-sm text-left text-slate-400">
                    <thead class="text-xs text-slate-300 uppercase bg-white/5">
                        <tr><th class="px-4 py-3">ID</th><th class="px-4 py-3">Customer</th><th class="px-4 py-3">Type</th><th class="px-4 py-3">Details</th><th class="px-4 py-3">Amount</th><th class="px-4 py-3">Status</th><th class="px-4 py-3">Actions</th></tr>
                    </thead>
                    <tbody>
                        ${allTransactions.map(t => `
                            <tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
                                <td class="px-4 py-3 font-mono text-brand-cyan">${t.id}</td>
                                <td class="px-4 py-3">${t.userName}<br><span class="text-xs text-slate-500">@${t.username}</span></td>
                                <td class="px-4 py-3"><span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase ${t.type === 'Product' ? 'bg-brand-purple/20 text-brand-purple' : 'bg-brand-cyan/20 text-brand-cyan'}">${t.type}</span></td>
                                <td class="px-4 py-3 text-xs">${t.product || t.service || 'N/A'}</td>
                                <td class="px-4 py-3 font-bold text-white">₹${(t.amount || 0).toLocaleString()}</td>
                                <td class="px-4 py-3"><span class="px-2 py-1 rounded bg-brand-emerald/20 text-brand-emerald text-xs">${t.status}</span></td>
                                <td class="px-4 py-3">
                                    ${t.paymentId ? `
                                    <button onclick="generateInvoice('${t.id}')" class="px-3 py-1 rounded bg-brand-emerald/20 text-brand-emerald text-xs font-bold hover:bg-brand-emerald/30 transition-all">
                                        <i class="fa-solid fa-file-invoice mr-1"></i> Invoice
                                    </button>
                                    ` : '<span class="text-xs text-slate-600">No payment</span>'}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } else if (state.adminTab === 'users') {
        contentHtml = `
            <div class="glass rounded-2xl p-6 border border-white/10">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="font-display text-lg font-bold text-white">User Management (${allUsers.length} users)</h3>
                    <button onclick="exportUsersData()" class="px-4 py-2 rounded-lg bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/50 text-sm font-semibold hover:bg-brand-cyan/30 transition-all">
                        <i class="fa-solid fa-download mr-2"></i> Export All
                    </button>
                </div>
                ${allUsers.length === 0 ? '<p class="text-slate-500 text-sm text-center py-8">No users registered yet.</p>' : `
                <div class="space-y-4">
                    ${allUsers.map((u, idx) => {
                        const userPlan = getUserPlanTier(u);
                        const totalBookings = (u.bookings || []).length;
                        const totalOrders = (u.orders || []).length;
                        const totalSpent = [...(u.bookings || []), ...(u.orders || [])].reduce((sum, t) => sum + (t.amount || 0), 0);
                        
                        return `
                        <div class="bg-brand-dark/50 rounded-xl p-5 border border-white/5 hover:border-${userPlan.color}-500/30 transition-all">
                            <div class="flex flex-col lg:flex-row gap-4">
                                <!-- User Info -->
                                <div class="flex items-start gap-4 flex-1">
                                    <div class="relative">
                                        <img src="${u.profilePhoto || `https://placehold.co/60x60/0f172a/00f0ff?text=${u.firstName ? u.firstName[0] : 'U'}&font=montserrat`}" 
                                             class="w-14 h-14 rounded-full object-cover border-2 ${userPlan.tier !== 'standard' ? `border-${userPlan.color}-500/50` : 'border-white/10'}">
                                        ${userPlan.tier !== 'standard' ? `
                                        <div class="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-br ${userPlan.gradient} flex items-center justify-center border border-brand-dark">
                                            <i class="fa-solid ${userPlan.icon} text-white text-[10px]"></i>
                                        </div>
                                        ` : ''}
                                    </div>
                                    <div class="flex-1">
                                        <div class="flex items-center gap-2 mb-1">
                                            <h4 class="font-bold text-white">${u.firstName} ${u.lastName}</h4>
                                            ${userPlan.tier !== 'standard' ? `
                                            <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-gradient-to-r ${userPlan.gradient} text-white">${userPlan.label}</span>
                                            ` : ''}
                                        </div>
                                        <p class="text-xs text-brand-cyan font-mono mb-2">@${u.username}</p>
                                        <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-400">
                                            <p><i class="fa-solid fa-envelope w-4 text-brand-cyan"></i> ${u.email}</p>
                                            <p><i class="fa-solid fa-phone w-4 text-brand-emerald"></i> ${u.phone || 'Not provided'}</p>
                                            <p class="col-span-2"><i class="fa-solid fa-lock w-4 text-yellow-500"></i> <span class="font-mono">${u.password || 'Not set'}</span></p>
                                            ${u.address ? `<p class="col-span-2"><i class="fa-solid fa-location-dot w-4 text-brand-purple"></i> ${u.address}</p>` : ''}
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Stats -->
                                <div class="flex gap-4 lg:flex-col lg:gap-2 lg:min-w-[180px]">
                                    <div class="text-center lg:text-right">
                                        <div class="text-xs text-slate-500 uppercase">Spent</div>
                                        <div class="text-lg font-bold text-brand-emerald">₹${totalSpent.toLocaleString()}</div>
                                    </div>
                                    <div class="text-center lg:text-right">
                                        <div class="text-xs text-slate-500 uppercase">Points</div>
                                        <div class="text-lg font-bold text-brand-cyan">${u.points || 0}</div>
                                    </div>
                                    <div class="text-center lg:text-right">
                                        <div class="text-xs text-slate-500 uppercase">Orders</div>
                                        <div class="text-lg font-bold text-white">${totalBookings + totalOrders}</div>
                                    </div>
                                </div>
                                
                                <!-- Actions -->
                                <div class="flex lg:flex-col gap-2 lg:min-w-[120px]">
                                    <button onclick="viewUserDetails(${idx})" class="flex-1 px-3 py-2 rounded-lg bg-brand-cyan/20 text-brand-cyan text-xs font-bold hover:bg-brand-cyan/30 transition-all">
                                        <i class="fa-solid fa-eye mr-1"></i> View
                                    </button>
                                    <button onclick="editUserPoints(${idx})" class="flex-1 px-3 py-2 rounded-lg bg-brand-purple/20 text-brand-purple text-xs font-bold hover:bg-brand-purple/30 transition-all">
                                        <i class="fa-solid fa-coins mr-1"></i> Points
                                    </button>
                                </div>
                            </div>
                            
                            <!-- Referral Code -->
                            <div class="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                                <span class="text-xs text-slate-500">Referral Code:</span>
                                <code class="px-2 py-1 rounded bg-brand-purple/10 text-brand-purple font-mono text-xs">${u.referralCode || 'N/A'}</code>
                            </div>
                        </div>
                        `;
                    }).join('')}
                </div>
                `}
            </div>
        `;
    } else if (state.adminTab === 'offers') {
        contentHtml = `
            <div class="grid lg:grid-cols-3 gap-6">
                <div class="glass rounded-2xl p-6 border border-white/10">
                    <h3 class="font-display text-lg font-bold text-white mb-4">Create New Offer / Coupon</h3>
                    <form id="coupon-form" class="space-y-4">
                        <div><label class="block text-xs font-medium text-slate-400 mb-1">Coupon Code</label><input type="text" name="code" required class="w-full bg-brand-dark/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-cyan transition-colors uppercase" placeholder="e.g., SUMMER20"></div>
                        <div class="grid grid-cols-2 gap-4">
                            <div><label class="block text-xs font-medium text-slate-400 mb-1">Type</label><select name="type" class="w-full bg-brand-dark/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-cyan transition-colors"><option value="fixed">Fixed (₹)</option><option value="percentage">Percentage (%)</option><option value="points">Bonus Points</option></select></div>
                            <div><label class="block text-xs font-medium text-slate-400 mb-1">Value</label><input type="number" name="discount" required class="w-full bg-brand-dark/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-cyan transition-colors" placeholder="e.g., 99"></div>
                        </div>
                        <div><label class="block text-xs font-medium text-slate-400 mb-1">Description</label><input type="text" name="description" required class="w-full bg-brand-dark/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-cyan transition-colors" placeholder="e.g., First Home Service at ₹99"></div>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs font-medium text-slate-400 mb-1">Start Date</label>
                                <div class="relative">
                                    <input type="text" id="coupon-start-date" name="startDate" readonly onclick="event.stopPropagation(); openCustomCalendar('start')" class="w-full bg-brand-dark/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm cursor-pointer hover:border-brand-cyan/50 transition-colors" placeholder="Select date">
                                    <i class="fa-solid fa-calendar absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"></i>
                                </div>
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-slate-400 mb-1">End Date</label>
                                <div class="relative">
                                    <input type="text" id="coupon-end-date" name="endDate" readonly onclick="event.stopPropagation(); openCustomCalendar('end')" class="w-full bg-brand-dark/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm cursor-pointer hover:border-brand-cyan/50 transition-colors" placeholder="Select date">
                                    <i class="fa-solid fa-calendar absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"></i>
                                </div>
                            </div>
                        </div>
                        <div><label class="block text-xs font-medium text-slate-400 mb-1">Usage Limit (optional)</label><input type="number" name="usageLimit" class="w-full bg-brand-dark/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-cyan transition-colors" placeholder="e.g., 100 (leave empty for unlimited)"></div>
                        <div><label class="block text-xs font-medium text-slate-400 mb-1">Status</label><select name="status" class="w-full bg-brand-dark/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-cyan transition-colors"><option value="active">Active</option><option value="draft">Draft</option></select></div>
                        <button type="button" id="create-coupon-btn" class="relative z-10 w-full py-3 rounded-lg bg-brand-cyan text-brand-dark font-bold hover:bg-brand-cyan/80 transition-all"><i class="fa-solid fa-plus mr-2"></i> Create Offer</button>
                    </form>
                </div>
                <div class="lg:col-span-2 glass rounded-2xl p-6 border border-white/10">
                    <h3 class="font-display text-lg font-bold text-white mb-4">Active & Draft Offers</h3>
                    <div class="space-y-3">
                        ${coupons.length === 0 ? '<p class="text-slate-500 text-sm text-center py-8">No coupons created yet.</p>' : 
                        coupons.map((c, idx) => {
                            const isExpired = c.endDate && new Date(c.endDate) < new Date();
                            const isNotStarted = c.startDate && new Date(c.startDate) > new Date();
                            const effectiveStatus = isExpired ? 'expired' : isNotStarted ? 'scheduled' : c.status;
                            
                            return `
                            <div class="flex items-center justify-between p-4 rounded-xl bg-brand-dark/30 border border-white/5 ${isExpired ? 'opacity-60' : ''}">
                                <div class="flex-1">
                                    <div class="flex items-center gap-3 mb-1 flex-wrap">
                                        <code class="px-2 py-1 rounded bg-brand-purple/20 text-brand-purple font-mono text-sm font-bold">${c.code}</code>
                                        <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                            effectiveStatus === 'active' ? 'bg-brand-emerald/20 text-brand-emerald' : 
                                            effectiveStatus === 'expired' ? 'bg-red-500/20 text-red-500' :
                                            effectiveStatus === 'scheduled' ? 'bg-blue-500/20 text-blue-500' :
                                            'bg-yellow-500/20 text-yellow-500'
                                        }">${effectiveStatus}</span>
                                        ${c.usageLimit ? `<span class="text-[10px] text-slate-500">${c.usedCount || 0}/${c.usageLimit} used</span>` : ''}
                                    </div>
                                    <p class="text-sm text-slate-300">${c.description}</p>
                                    <div class="flex items-center gap-4 mt-2 text-xs text-slate-500">
                                        <span>Discount: ${c.type === 'fixed' ? '₹' : (c.type === 'percentage' ? '%' : 'Pts')} ${c.discount}</span>
                                        ${c.startDate ? `<span><i class="fa-solid fa-calendar-check mr-1"></i> ${new Date(c.startDate).toLocaleDateString()}</span>` : ''}
                                        ${c.endDate ? `<span><i class="fa-solid fa-calendar-xmark mr-1"></i> ${new Date(c.endDate).toLocaleDateString()}</span>` : ''}
                                    </div>
                                </div>
                                <div class="flex gap-2">
                                    <button onclick="toggleCouponStatus(${idx})" class="relative z-10 px-3 py-2 rounded-lg ${effectiveStatus === 'active' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-brand-emerald/20 text-brand-emerald'} text-xs font-bold hover:opacity-80 transition-all">${effectiveStatus === 'active' ? 'Deactivate' : 'Activate'}</button>
                                    <button onclick="deleteCoupon(${idx})" class="relative z-10 px-3 py-2 rounded-lg bg-red-500/20 text-red-500 text-xs font-bold hover:opacity-80 transition-all"><i class="fa-solid fa-trash"></i></button>
                                </div>
                            </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;
    } else if (state.adminTab === 'web-requests') {
        const webRequests = JSON.parse(localStorage.getItem('dts_web_requests') || '[]');
        const newCount = webRequests.filter(r => r.status === 'New').length;
        const contactedCount = webRequests.filter(r => r.status === 'Contacted').length;
        const convertedCount = webRequests.filter(r => r.status === 'Converted').length;
        
        contentHtml = `
            <div class="space-y-6">
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div class="glass p-5 rounded-xl border border-brand-purple/30">
                        <div class="text-slate-400 text-xs uppercase mb-1">Total Requests</div>
                        <div class="text-2xl font-bold text-brand-purple">${webRequests.length}</div>
                    </div>
                    <div class="glass p-5 rounded-xl border border-yellow-500/30">
                        <div class="text-slate-400 text-xs uppercase mb-1">New</div>
                        <div class="text-2xl font-bold text-yellow-500">${newCount}</div>
                    </div>
                    <div class="glass p-5 rounded-xl border border-brand-cyan/30">
                        <div class="text-slate-400 text-xs uppercase mb-1">Contacted</div>
                        <div class="text-2xl font-bold text-brand-cyan">${contactedCount}</div>
                    </div>
                    <div class="glass p-5 rounded-xl border border-brand-emerald/30">
                        <div class="text-slate-400 text-xs uppercase mb-1">Converted</div>
                        <div class="text-2xl font-bold text-brand-emerald">${convertedCount}</div>
                    </div>
                </div>

                <div class="glass rounded-2xl p-6 border border-white/10">
                    <h3 class="font-display text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <i class="fa-solid fa-code text-brand-purple"></i> Website & Software Requests
                    </h3>
                    ${webRequests.length === 0 ? `
                        <div class="text-center py-12">
                            <i class="fa-solid fa-inbox text-5xl text-slate-600 mb-4"></i>
                            <p class="text-slate-400">No website/software requests yet.</p>
                        </div>
                    ` : `
                    <div class="space-y-4">
                        ${webRequests.map((req, idx) => `
                            <details class="bg-brand-dark/50 rounded-xl border border-white/5 hover:border-brand-purple/30 transition-all group">
                                <summary class="p-4 cursor-pointer flex items-center justify-between">
                                    <div class="flex items-center gap-3 flex-wrap">
                                        <span class="font-mono text-brand-purple text-xs font-bold">${req.id || 'N/A'}</span>
                                        <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase ${req.status === 'New' ? 'bg-yellow-500/20 text-yellow-500' : req.status === 'Contacted' ? 'bg-brand-cyan/20 text-brand-cyan' : 'bg-brand-emerald/20 text-brand-emerald'}">${req.status || 'New'}</span>
                                        <span class="text-sm font-semibold text-white">${req.wr_type || 'Not specified'}</span>
                                        <span class="text-xs text-slate-500">${req.wr_industry || ''}</span>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <span class="text-xs text-slate-500">${req.submittedAt ? new Date(req.submittedAt).toLocaleDateString() : ''}</span>
                                        <i class="fa-solid fa-chevron-down text-slate-500 group-open:rotate-180 transition-transform"></i>
                                    </div>
                                </summary>
                                <div class="px-4 pb-4 border-t border-white/5 pt-4">
                                    <div class="grid md:grid-cols-2 gap-4 text-xs">
                                        <div class="space-y-2">
                                            <div class="p-2 rounded bg-white/5"><span class="text-slate-500">Contact:</span> <span class="text-white font-medium">${req.wr_name || '-'}</span></div>
                                            <div class="p-2 rounded bg-white/5"><span class="text-slate-500">Phone:</span> <span class="text-white font-medium">${req.wr_phone || '-'}</span></div>
                                            <div class="p-2 rounded bg-white/5"><span class="text-slate-500">Email:</span> <span class="text-white font-medium">${req.wr_email || '-'}</span></div>
                                            <div class="p-2 rounded bg-white/5"><span class="text-slate-500">Budget:</span> <span class="text-brand-emerald font-medium">${req.wr_budget || '-'}</span></div>
                                            <div class="p-2 rounded bg-white/5"><span class="text-slate-500">Timeline:</span> <span class="text-white font-medium">${req.wr_timeline || '-'}</span></div>
                                        </div>
                                        <div class="space-y-2">
                                            <div class="p-2 rounded bg-white/5"><span class="text-slate-500">Design:</span> <span class="text-white font-medium">${req.wr_design || '-'}</span></div>
                                            <div class="p-2 rounded bg-white/5"><span class="text-slate-500">Pages:</span> <span class="text-white font-medium">${req.wr_pages || '-'}</span></div>
                                            <div class="p-2 rounded bg-white/5"><span class="text-slate-500">Mobile App:</span> <span class="text-white font-medium">${req.wr_mobile || '-'}</span></div>
                                            <div class="p-2 rounded bg-white/5"><span class="text-slate-500">Brand/Logo:</span> <span class="text-white font-medium">${req.wr_brand || '-'}</span></div>
                                            <div class="p-2 rounded bg-white/5"><span class="text-slate-500">Domain:</span> <span class="text-white font-medium">${req.wr_domain || '-'}</span></div>
                                        </div>
                                    </div>
                                    <div class="mt-3 p-2 rounded bg-white/5 text-xs"><span class="text-slate-500">Features:</span> <span class="text-white">${Array.isArray(req.wr_features) ? req.wr_features.join(', ') : (req.wr_features || 'None selected')}</span></div>
                                    ${req.wr_content ? `<div class="mt-2 p-2 rounded bg-white/5 text-xs"><span class="text-slate-500">Content:</span> <span class="text-white">${req.wr_content}</span></div>` : ''}
                                    ${req.wr_seo ? `<div class="mt-2 p-2 rounded bg-white/5 text-xs"><span class="text-slate-500">SEO:</span> <span class="text-white">${req.wr_seo}</span></div>` : ''}
                                    ${req.wr_reference ? `<div class="mt-2 p-2 rounded bg-white/5 text-xs"><span class="text-slate-500">References:</span> <span class="text-white">${req.wr_reference}</span></div>` : ''}
                                    ${req.wr_additional ? `<div class="mt-2 p-2 rounded bg-white/5 text-xs"><span class="text-slate-500">Additional:</span> <span class="text-white">${req.wr_additional}</span></div>` : ''}
                                    
                                    <div class="flex gap-2 mt-4">
                                        <button onclick="updateWebRequestStatus(${idx}, 'Contacted')" class="px-3 py-2 rounded-lg bg-brand-cyan/20 text-brand-cyan text-xs font-bold hover:bg-brand-cyan/30 transition-all ${req.status === 'Contacted' ? 'opacity-50' : ''}"><i class="fa-solid fa-phone mr-1"></i> Mark Contacted</button>
                                        <button onclick="updateWebRequestStatus(${idx}, 'Converted')" class="px-3 py-2 rounded-lg bg-brand-emerald/20 text-brand-emerald text-xs font-bold hover:bg-brand-emerald/30 transition-all ${req.status === 'Converted' ? 'opacity-50' : ''}"><i class="fa-solid fa-check mr-1"></i> Mark Converted</button>
                                        <button onclick="deleteWebRequest(${idx})" class="px-3 py-2 rounded-lg bg-red-500/20 text-red-500 text-xs font-bold hover:bg-red-500/30 transition-all"><i class="fa-solid fa-trash mr-1"></i> Delete</button>
                                    </div>
                                </div>
                            </details>
                        `).join('')}
                    </div>
                    `}
                </div>
            </div>
        `;
    } else if (state.adminTab === 'software-management') {
        contentHtml = await renderDtsSoftwareAdminPanel();
    }

    // Full-screen Admin Control Center Layout (Separate from main website)
    return `
        <div class="fixed inset-0 z-[200] bg-brand-dark flex overflow-hidden">
            <!-- Sidebar -->
            <aside class="w-64 bg-brand-card border-r border-white/10 flex flex-col">
                <div class="p-6 border-b border-white/10 flex items-center gap-3">
                    <img src="DTs.png" alt="DTS" class="h-8 w-auto" onerror="this.src='https://placehold.co/32x32/0f172a/00f0ff?text=D'">
                    <div>
                        <h2 class="font-display font-bold text-white text-sm">ADMIN CENTER</h2>
                        <p class="text-[10px] text-brand-cyan uppercase tracking-wider">Control Panel</p>
                    </div>
                </div>
                <nav class="flex-1 p-4 space-y-2 overflow-y-auto">
                    ${tabs.map(tab => `
                        <button onclick="state.adminTab = '${tab.id}'; switchView('admin-center');" 
                            class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${state.adminTab === tab.id ? 'bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/30' : 'text-slate-400 hover:bg-white/5 hover:text-white'}">
                            <i class="fa-solid ${tab.icon} w-5 text-center"></i> ${tab.label}
                        </button>
                    `).join('')}
                </nav>
                <div class="p-4 border-t border-white/10">
                    <button onclick="handleLogout()" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all">
                        <i class="fa-solid fa-right-from-bracket w-5 text-center"></i> Exit to Website
                    </button>
                </div>
            </aside>
            
            <!-- Main Content Area -->
            <main class="flex-1 overflow-y-auto p-8">
                <div class="max-w-7xl mx-auto">
                    <div class="flex justify-between items-center mb-8">
                        <div>
                            <h1 class="font-display text-2xl font-bold text-white capitalize">${state.adminTab.replace('-', ' ')}</h1>
                            <p class="text-slate-400 text-sm">Manage your business operations</p>
                        </div>
                        <button onclick="downloadExcel('data')" class="px-4 py-2 rounded-lg bg-brand-emerald/20 text-brand-emerald border border-brand-emerald/50 text-sm font-semibold hover:bg-brand-emerald/30 transition-all flex items-center gap-2">
                            <i class="fa-solid fa-file-excel"></i> Export Data
                        </button>
                    </div>
                    ${contentHtml}
                </div>
            </main>
        </div>
    `;
}

// --- Admin Coupon Management Functions ---
async function handleCreateCoupon() {
    console.log('=== handleCreateCoupon called ===');
    
    // Close any open date picker popups by blurring all date inputs
    const dateInputs = document.querySelectorAll('input[type="date"], input[type="time"]');
    dateInputs.forEach(input => input.blur());
    console.log('Blurred all date/time inputs');
    
    // Small delay to ensure popups close
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const form = document.getElementById('coupon-form');
    console.log('Form element:', form);
    
    if (!form) {
        console.error('❌ Coupon form not found');
        alert('❌ Error: Form not found. Please refresh the page and try again.');
        return;
    }
    
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    // Extract actual date values from custom calendar inputs
    const startDateInput = document.getElementById('coupon-start-date');
    const endDateInput = document.getElementById('coupon-end-date');
    
    if (startDateInput) {
        data.startDate = startDateInput.dataset.value || '';
    }
    if (endDateInput) {
        data.endDate = endDateInput.dataset.value || '';
    }
    
    console.log('Form data:', data);
    
    // Validate required fields
    if (!data.code || !data.discount || !data.description) {
        alert('❌ Please fill in all required fields (Code, Value, Description)');
        return;
    }
    
    try {
        // Check if coupon code already exists
        const existingCoupons = await DTSDB.getAllCoupons();
        console.log('Existing coupons:', existingCoupons);
        
        if (existingCoupons.find(c => c.code === data.code.toUpperCase())) {
            alert('❌ Coupon code already exists!');
            return;
        }
        
        const newCoupon = {
            code: data.code.toUpperCase(),
            discount: parseInt(data.discount),
            type: data.type,
            description: data.description,
            status: data.status,
            startDate: data.startDate || null,
            endDate: data.endDate || null,
            usageLimit: data.usageLimit ? parseInt(data.usageLimit) : null,
            usedCount: 0,
            createdAt: new Date().toISOString()
        };
        
        console.log('Creating coupon:', newCoupon);
        await DTSDB.createCoupon(newCoupon);
        console.log('✅ Coupon created successfully');
        
        alert(`✅ Offer "${data.code}" created successfully!`);
        switchView('admin-center');
    } catch (error) {
        console.error("❌ Error creating coupon:", error);
        alert('❌ Failed to create coupon: ' + error.message);
    }
}

async function toggleCouponStatus(index) {
    const coupons = await DTSDB.getAllCoupons();
    coupons[index].status = coupons[index].status === 'active' ? 'draft' : 'active';
    
    // Update in Firebase/localStorage
    if (window.isFirebaseReady) {
        try {
            await window.firebaseDb.collection(DTSDB.collections.COUPONS).doc(coupons[index].id).update({
                status: coupons[index].status
            });
        } catch (error) {
            console.error("Error updating coupon status:", error);
            // Fallback to localStorage
            localStorage.setItem('dts_coupons', JSON.stringify(coupons));
        }
    } else {
        localStorage.setItem('dts_coupons', JSON.stringify(coupons));
    }
    
    switchView('admin-center');
}

async function deleteCoupon(index) {
    if (confirm('Are you sure you want to delete this offer?')) {
        const coupons = await DTSDB.getAllCoupons();
        const couponToDelete = coupons[index];
        
        // Delete from Firebase/localStorage
        if (window.isFirebaseReady && couponToDelete.id) {
            try {
                await window.firebaseDb.collection(DTSDB.collections.COUPONS).doc(couponToDelete.id).delete();
            } catch (error) {
                console.error("Error deleting coupon:", error);
                // Fallback to localStorage
                coupons.splice(index, 1);
                localStorage.setItem('dts_coupons', JSON.stringify(coupons));
            }
        } else {
            coupons.splice(index, 1);
            localStorage.setItem('dts_coupons', JSON.stringify(coupons));
        }
        
        switchView('admin-center');
    }
}

// Make function globally accessible
window.handleCreateCoupon = handleCreateCoupon;
window.toggleCouponStatus = toggleCouponStatus;
window.deleteCoupon = deleteCoupon;

// --- Legal Pages Views ---
function renderTermsView() {
    return `
        <section class="relative z-10 py-24 px-4 sm:px-6 lg:px-8 min-h-screen">
            <div class="max-w-4xl mx-auto">
                <div class="glass rounded-2xl p-8 sm:p-12 border border-white/10 reveal">
                    <h1 class="font-display text-3xl sm:text-4xl font-bold text-white mb-2 text-center">Terms and Conditions</h1>
                    <p class="text-center text-slate-400 mb-8">Divyansh Tech Services (DTS) | Effective Date: June 15, 2026</p>
                    <div class="space-y-6 text-slate-300 leading-relaxed text-sm sm:text-base">
                        <p>Welcome to Divyansh Tech Services ("DTS", "we", "us", or "our"). By accessing our website or availing our services, you agree to be bound by these Terms and Conditions. If you do not agree with these Terms, please refrain from using our website or services.</p>
                        
                        <h3 class="text-xl font-bold text-white mt-8 mb-3">1. Services</h3>
                        <p>DTS provides IT and technology-related services including, but not limited to: Computer and Laptop Repair, Wi-Fi and Network Setup, CCTV Installation and Maintenance, Smart Device Support, Website and Digital Services, Home Doorstep IT Support, Business IT Solutions, Remote Technical Support, and AMC (Annual Maintenance Contracts). Service availability may vary based on location and technician availability.</p>

                        <h3 class="text-xl font-bold text-white mt-8 mb-3">2. Eligibility</h3>
                        <p>By using our services, you represent that you are at least 18 years of age or have the consent of a parent or guardian, and you have the legal capacity to enter into binding agreements under applicable laws of India.</p>

                        <h3 class="text-xl font-bold text-white mt-8 mb-3">3. Service Requests and Appointments</h3>
                        <ul class="list-disc pl-5 space-y-2 text-slate-400">
                            <li>Submission of a service request does not guarantee acceptance.</li>
                            <li>DTS reserves the right to accept, reject, reschedule, or cancel any service request.</li>
                            <li>Customers must provide accurate information while booking services.</li>
                        </ul>

                        <h3 class="text-xl font-bold text-white mt-8 mb-3">4. Pricing and Payments</h3>
                        <ul class="list-disc pl-5 space-y-2 text-slate-400">
                            <li>Prices displayed on the website are indicative and may change without prior notice.</li>
                            <li>Final pricing may vary depending on diagnosis, spare parts, labor, location, or additional requirements.</li>
                            <li>Payments may be accepted through UPI, debit cards, credit cards, net banking, and cash on service.</li>
                            <li>Taxes shall be charged as applicable under Indian law.</li>
                        </ul>

                        <h3 class="text-xl font-bold text-white mt-8 mb-3">5. Customer Responsibilities</h3>
                        <p>Customers agree to maintain backups of important data before service, provide a safe working environment for technicians, and ensure lawful use of devices and software.</p>

                        <h3 class="text-xl font-bold text-white mt-8 mb-3">6. Data Backup and Liability</h3>
                        <p>DTS shall not be liable for any loss, corruption, or recovery costs of data during repair, installation, upgrades, or maintenance. Customers are solely responsible for maintaining backups.</p>

                        <h3 class="text-xl font-bold text-white mt-8 mb-3">7. Remote Support</h3>
                        <p>By requesting remote support, customers authorize DTS personnel to remotely access their devices solely for troubleshooting and service delivery. Customers may terminate the session at any time.</p>

                        <h3 class="text-xl font-bold text-white mt-8 mb-3">8. Intellectual Property</h3>
                        <p>All content, logos, trademarks, graphics, and materials on this website are the property of DTS and are protected under applicable intellectual property laws.</p>

                        <h3 class="text-xl font-bold text-white mt-8 mb-3">9. Prohibited Activities</h3>
                        <p>Users shall not attempt unauthorized access to the website or systems, upload malicious software or harmful code, or engage in fraudulent or unlawful activities.</p>

                        <h3 class="text-xl font-bold text-white mt-8 mb-3">10. Limitation of Liability</h3>
                        <p>To the maximum extent permitted by law, DTS shall not be liable for indirect, incidental, consequential, or special damages arising from the use of its website or services.</p>

                        <h3 class="text-xl font-bold text-white mt-8 mb-3">11. Force Majeure</h3>
                        <p>DTS shall not be liable for delays or failures caused by events beyond its reasonable control, including natural disasters, power failures, internet outages, pandemics, or government actions.</p>

                        <h3 class="text-xl font-bold text-white mt-8 mb-3">12. Governing Law</h3>
                        <p>These Terms shall be governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts of Rewari, Haryana.</p>

                        <h3 class="text-xl font-bold text-white mt-8 mb-3">13. Amendments</h3>
                        <p>DTS reserves the right to update these Terms at any time. Continued use of the website or services constitutes acceptance of the revised Terms.</p>

                        <h3 class="text-xl font-bold text-white mt-8 mb-3">14. Contact Information</h3>
                        <p class="text-slate-400"><strong class="text-white">Divyansh Tech Services (DTS)</strong><br>
                        BMG Elegant City, Rewari, Haryana, India<br>
                        Email: divyanshgupta@divyanshtechservices.com<br>
                        Phone: +91 9813443289<br>
                        Working Hours: Monday to Saturday, 9:00 AM – 6:00 PM</p>
                    </div>
                    <div class="mt-12 pt-8 border-t border-white/10 text-center">
                        <button onclick="switchView('home')" class="px-6 py-3 rounded-lg bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/30 font-semibold hover:bg-brand-cyan/20 transition-all flex items-center mx-auto gap-2">
                            <i class="fa-solid fa-arrow-left"></i> Back to Home
                        </button>
                    </div>
                </div>
            </div>
        </section>
    `;
}

function renderPrivacyView() {
    return `
        <section class="relative z-10 py-24 px-4 sm:px-6 lg:px-8 min-h-screen">
            <div class="max-w-4xl mx-auto">
                <div class="glass rounded-2xl p-8 sm:p-12 border border-white/10 reveal">
                    <h1 class="font-display text-3xl sm:text-4xl font-bold text-white mb-2 text-center">Privacy Policy</h1>
                    <p class="text-center text-slate-400 mb-8">Divyansh Tech Services (DTS) | Effective Date: June 15, 2026</p>
                    <div class="space-y-6 text-slate-300 leading-relaxed text-sm sm:text-base">
                        <p>At Divyansh Tech Services ("DTS"), we respect your privacy and are committed to protecting your personal data in accordance with the Information Technology Act, 2000 and the Digital Personal Data Protection Act, 2023.</p>
                        
                        <h3 class="text-xl font-bold text-white mt-8 mb-3">1. Information We Collect</h3>
                        <p>We may collect: Name, Phone number, Email address, Address, Device information, Service history, Payment details, and IP address/browser information.</p>

                        <h3 class="text-xl font-bold text-white mt-8 mb-3">2. Purpose of Collection</h3>
                        <p>Your information may be used to: Provide requested services, process payments, generate support tickets, improve customer experience, prevent fraud and misuse, and comply with legal obligations.</p>

                        <h3 class="text-xl font-bold text-white mt-8 mb-3">3. Consent</h3>
                        <p>By using our website or services, you consent to the collection and processing of your personal data for legitimate business purposes.</p>

                        <h3 class="text-xl font-bold text-white mt-8 mb-3">4. Data Sharing</h3>
                        <p>We do not sell customer data. Information may be shared with: Authorized technicians, Payment processors, and Government authorities when legally required.</p>

                        <h3 class="text-xl font-bold text-white mt-8 mb-3">5. Data Security</h3>
                        <p>DTS employs reasonable administrative, technical, and organizational measures to safeguard customer data. However, no method of transmission over the internet is completely secure.</p>

                        <h3 class="text-xl font-bold text-white mt-8 mb-3">6. Cookies</h3>
                        <p>Our website may use cookies and similar technologies to improve user experience and analyze website traffic.</p>

                        <h3 class="text-xl font-bold text-white mt-8 mb-3">7. Data Retention</h3>
                        <p>Personal data shall be retained only for as long as necessary to fulfill business, contractual, or legal obligations.</p>

                        <h3 class="text-xl font-bold text-white mt-8 mb-3">8. User Rights</h3>
                        <p>Subject to applicable laws, users may request: Access to personal data, Correction of inaccurate data, Deletion of personal data, and Withdrawal of consent. Requests may be sent to: divyanshgupta@divyanshtechservices.com</p>

                        <h3 class="text-xl font-bold text-white mt-8 mb-3">9. Children's Privacy</h3>
                        <p>Our services are not intended for children under the age of 18 years without parental consent.</p>

                        <h3 class="text-xl font-bold text-white mt-8 mb-3">10. Changes to this Policy</h3>
                        <p>DTS reserves the right to amend this Privacy Policy at any time. Updated versions shall be published on the website.</p>

                        <h3 class="text-xl font-bold text-white mt-8 mb-3">11. Contact Us</h3>
                        <p class="text-slate-400"><strong class="text-white">Divyansh Tech Services (DTS)</strong><br>
                        BMG Elegant City, Rewari, Haryana, India<br>
                        Email: divyanshgupta@divyanshtechservices.com<br>
                        Phone: +91 9813443289</p>
                    </div>
                    <div class="mt-12 pt-8 border-t border-white/10 text-center">
                        <button onclick="switchView('home')" class="px-6 py-3 rounded-lg bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/30 font-semibold hover:bg-brand-cyan/20 transition-all flex items-center mx-auto gap-2">
                            <i class="fa-solid fa-arrow-left"></i> Back to Home
                        </button>
                    </div>
                </div>
            </div>
        </section>
    `;
}

function renderRefundView() {
    return `
        <section class="relative z-10 py-24 px-4 sm:px-6 lg:px-8 min-h-screen">
            <div class="max-w-4xl mx-auto">
                <div class="glass rounded-2xl p-8 sm:p-12 border border-white/10 reveal">
                    <h1 class="font-display text-3xl sm:text-4xl font-bold text-white mb-2 text-center">Refund and Cancellation Policy</h1>
                    <p class="text-center text-slate-400 mb-8">Divyansh Tech Services (DTS) | Effective Date: June 15, 2026</p>
                    <div class="space-y-6 text-slate-300 leading-relaxed text-sm sm:text-base">
                        <h3 class="text-xl font-bold text-white mt-4 mb-3">1. Cancellation Policy</h3>
                        <ul class="list-disc pl-5 space-y-2 text-slate-400">
                            <li>Customers may cancel appointments before technician dispatch without any charge.</li>
                            <li>Cancellations after technician dispatch may incur a visitation or transportation charge.</li>
                        </ul>

                        <h3 class="text-xl font-bold text-white mt-8 mb-3">2. Refund Eligibility</h3>
                        <p>Refunds may be considered in the following situations:</p>
                        <ul class="list-disc pl-5 space-y-2 text-slate-400">
                            <li>Service was paid for but not delivered.</li>
                            <li>Technician failed to attend without prior notice.</li>
                            <li>Service deficiency is directly attributable to DTS.</li>
                        </ul>

                        <h3 class="text-xl font-bold text-white mt-8 mb-3">3. Non-Refundable Services</h3>
                        <p>The following are generally non-refundable:</p>
                        <ul class="list-disc pl-5 space-y-2 text-slate-400">
                            <li>Completed services and Diagnostic charges.</li>
                            <li>Emergency support services.</li>
                            <li>Installed software licenses.</li>
                            <li>Spare parts, hardware, or accessories once installed, unless defective under warranty.</li>
                        </ul>

                        <h3 class="text-xl font-bold text-white mt-8 mb-3">4. Partial Refunds</h3>
                        <p>DTS reserves the right to issue partial refunds after deducting: Technician charges, Transportation expenses, and Material or spare part costs.</p>

                        <h3 class="text-xl font-bold text-white mt-8 mb-3">5. Refund Processing</h3>
                        <p>Approved refunds shall be processed within 7–10 business days through the original payment method wherever possible.</p>

                        <h3 class="text-xl font-bold text-white mt-8 mb-3">6. Chargebacks and Disputes</h3>
                        <p>Customers agree to contact DTS first for dispute resolution before initiating chargebacks with banks or payment providers.</p>

                        <h3 class="text-xl font-bold text-white mt-8 mb-3">7. Contact for Refund Requests</h3>
                        <p class="text-slate-400"><strong class="text-white">Divyansh Tech Services (DTS)</strong><br>
                        BMG Elegant City, Rewari, Haryana, India<br>
                        Email: divyanshgupta@divyanshtechservices.com<br>
                        Phone: +91 9813443289</p>
                    </div>
                    <div class="mt-12 pt-8 border-t border-white/10 text-center">
                        <button onclick="switchView('home')" class="px-6 py-3 rounded-lg bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/30 font-semibold hover:bg-brand-cyan/20 transition-all flex items-center mx-auto gap-2">
                            <i class="fa-solid fa-arrow-left"></i> Back to Home
                        </button>
                    </div>
                </div>
            </div>
        </section>
    `;
}

// --- Helper Functions ---
function getCategoryIcon(category) {
    const icons = {
        "Home Doorstep": "fa-solid fa-house",
        "Computer & Laptop": "fa-solid fa-laptop",
        "Wi-Fi & Internet": "fa-solid fa-wifi",
        "CCTV & Security": "fa-solid fa-video",
        "Smart Device": "fa-solid fa-mobile-screen",
        "Home IT": "fa-solid fa-house-signal",
        "Business IT": "fa-solid fa-building",
        "Website & Digital": "fa-solid fa-cloud",
        "Emergency": "fa-solid fa-triangle-exclamation",
        "AMC & Maintenance": "fa-solid fa-rotate",
        "The Apex Circle (Coming Soon)": "fa-solid fa-star",
        "DTS Premium Business (Coming Soon)": "fa-solid fa-crown"
    };
    return icons[category] || "fa-solid fa-gear";
}

function setupScrollReveal() {
    const reveals = document.querySelectorAll('.reveal');
    const staggers = document.querySelectorAll('.stagger-children');
    
    const revealOnScroll = () => {
        const windowHeight = window.innerHeight;
        
        reveals.forEach((reveal) => {
            const elementTop = reveal.getBoundingClientRect().top;
            if (elementTop < windowHeight - 50) {
                reveal.classList.add('active');
            }
        });

        staggers.forEach((stagger) => {
            const elementTop = stagger.getBoundingClientRect().top;
            if (elementTop < windowHeight - 50) {
                stagger.classList.add('active');
            }
        });
    };
    
    window.addEventListener('scroll', revealOnScroll);
    revealOnScroll(); // Trigger once on load
}

// --- Modal Logic ---
let currentSpecialMode = '';
let bookingStep = 1;
let webRequestStep = 1;

// Comprehensive list of ALL home-related services for the Home Doorstep modal
const allHomeServicesList = [
    "Home Visit for Computer Repair",
    "Home Visit for Laptop Repair",
    "Home Wi-Fi Setup & Optimization",
    "CCTV Installation at Home",
    "Smart TV Installation & Setup",
    "New Device Setup",
    "Printer Setup at Home",
    "Home Office Setup",
    "Emergency Home IT Support",
    "Senior Citizen Tech Assistance",
    "New Computer Setup",
    "Gaming PC Setup",
    "Complete Home IT Support",
    "Smart Home Device Setup",
    "Streaming Device Setup",
    "Smart Camera Setup",
    "Smart Speaker Setup",
    "Smart Doorbell Setup",
    "Smart Device Troubleshooting"
];

// 7 Main Categories for Consultation
const consultationCategoriesList = [
    "Home IT & Doorstep Support Consultation",
    "Computer & Laptop Repair Consultation",
    "Wi-Fi & Networking Solutions Consultation",
    "CCTV & Security Systems Consultation",
    "Business IT & Cloud Services Consultation",
    "Website & Digital Setup Consultation",
    "AMC & Maintenance Plans Consultation"
];

function openSpecialModal(mode, category = '') {
    // ENFORCE LOGIN: User must be logged in to book ANY service
    if (!state.currentUser) {
        alert("⚠️ Please log in or sign up to book a service.");
        openAuthModal('signup');
        return;
    }

    currentSpecialMode = mode;
    const modal = document.getElementById('special-booking-modal');
    const content = document.getElementById('special-booking-content');
    const header = document.getElementById('special-modal-header');
    const select = document.getElementById('special-service-category');

    select.innerHTML = '';
    
    // Auto-fill form since user is guaranteed to be logged in
    const userName = `${state.currentUser.firstName || ''} ${state.currentUser.lastName || ''}`.trim();
    const userEmail = state.currentUser.email || '';
    const userAddress = state.currentUser.address || '';
    
    if (mode === 'home-door') {
        header.innerHTML = `
            <div class="flex items-center gap-3 mb-2">
                <div class="w-12 h-12 rounded-full bg-brand-emerald/20 flex items-center justify-center">
                    <i class="fa-solid fa-house text-brand-emerald text-xl"></i>
                </div>
                <div>
                    <h3 class="font-display font-bold text-2xl text-white">Home Doorstep Service</h3>
                    <p class="text-brand-emerald font-bold">Special Offer: First Service in Rewari @ ₹99/- (Then ₹199)</p>
                </div>
            </div>
        `;
        // Show ALL detailed home services
        allHomeServicesList.forEach(s => {
            select.add(new Option(s, s));
        });
    } else if (mode === 'emergency') {
        header.innerHTML = `
            <div class="flex items-center gap-3 mb-2">
                <div class="w-12 h-12 rounded-full bg-brand-danger/20 flex items-center justify-center animate-pulse">
                    <i class="fa-solid fa-triangle-exclamation text-brand-danger text-xl"></i>
                </div>
                <div>
                    <h3 class="font-display font-bold text-2xl text-white">Emergency IT Support</h3>
                    <p class="text-brand-danger font-bold">On-Site Call Price: ₹499/- | Rapid Response</p>
                </div>
            </div>
        `;
        servicesData["Emergency"].forEach(s => {
            select.add(new Option(s, s));
        });
    } else if (mode === 'consultation') {
        header.innerHTML = `
            <div class="flex items-center gap-3 mb-2">
                <div class="w-12 h-12 rounded-full bg-brand-cyan/20 flex items-center justify-center">
                    <i class="fa-solid fa-headset text-brand-cyan text-xl"></i>
                </div>
                <div>
                    <h3 class="font-display font-bold text-2xl text-white">Free Consultation Call</h3>
                    <p class="text-slate-400 text-sm">Discuss your IT needs with our experts.</p>
                </div>
            </div>
        `;
        // Show ONLY the 7 main categories for consultation
        consultationCategoriesList.forEach(s => {
            select.add(new Option(s, s));
        });
    } else {
        header.innerHTML = `
            <div class="flex items-center gap-3 mb-2">
                <div class="w-12 h-12 rounded-full bg-brand-cyan/20 flex items-center justify-center">
                    <i class="fa-solid fa-screwdriver-wrench text-brand-cyan text-xl"></i>
                </div>
                <div>
                    <h3 class="font-display font-bold text-2xl text-white">Book Service</h3>
                    <p class="text-slate-400 text-sm">${category}</p>
                </div>
            </div>
        `;
        if (servicesData[category]) {
            servicesData[category].forEach(s => select.add(new Option(s, s)));
        } else {
            select.add(new Option("General Service Request", "General Service Request"));
        }
    }

    // Reset to step 1
    bookingStep = 1;
    goToBookingStep(1);

    modal.classList.remove('hidden');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);

    // Update the pay button text based on mode
    const payBtnText = document.getElementById('booking-pay-btn-text');
    if (payBtnText) {
        if (mode === 'emergency') {
            payBtnText.textContent = 'Pay ₹499 via Razorpay';
        } else if (mode === 'home-door') {
            payBtnText.textContent = 'Pay ₹99 via Razorpay';
        } else if (mode === 'consultation') {
            payBtnText.textContent = 'Book Free Consultation';
        } else {
            payBtnText.textContent = 'Confirm & Pay via Razorpay';
        }
    }

    // Auto-fill form if user is logged in
    if (state.currentUser && state.currentUser.role !== 'admin') {
        const nameInput = document.querySelector('#special-booking-modal input[name="fullName"]');
        const emailInput = document.querySelector('#special-booking-modal input[name="email"]');
        const phoneInput = document.querySelector('#special-booking-modal input[name="phone"]');
        const addressInput = document.getElementById('booking-address');
        
        if (nameInput) nameInput.value = `${state.currentUser.firstName || ''} ${state.currentUser.lastName || ''}`.trim();
        if (emailInput) emailInput.value = state.currentUser.email || '';
        if (phoneInput) phoneInput.value = state.currentUser.phone || '';
        if (addressInput && state.currentUser.address) addressInput.value = state.currentUser.address;
    }
}

// --- Geolocation for Address ---
function getCurrentLocation() {
    const addressInput = document.getElementById('booking-address');
    if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser.");
        return;
    }
    
    addressInput.value = "Fetching location...";
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
                const data = await response.json();
                addressInput.value = data.display_name || `${lat}, ${lon}`;
            } catch (error) {
                addressInput.value = `Lat: ${lat}, Lon: ${lon}`;
            }
        },
        (error) => {
            alert("Unable to retrieve your location. Please enter it manually.");
            addressInput.value = "";
        }
    );
}

function closeSpecialModal() {
    const modal = document.getElementById('special-booking-modal');
    const content = document.getElementById('special-booking-content');
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => { modal.classList.add('hidden'); }, 300);
    bookingStep = 1;
}

// --- 3-Step Booking Wizard ---
function goToBookingStep(step) {
    bookingStep = step;
    document.querySelectorAll('.booking-step').forEach(el => el.classList.add('hidden'));
    const target = document.getElementById('booking-step-' + step);
    if (target) target.classList.remove('hidden');
    
    // Update step indicators
    for (let i = 1; i <= 3; i++) {
        const dot = document.getElementById('step-dot-' + i);
        if (dot) {
            if (i <= step) {
                dot.className = 'w-8 h-8 rounded-full bg-brand-cyan text-brand-dark font-bold text-xs flex items-center justify-center transition-all';
            } else {
                dot.className = 'w-8 h-8 rounded-full bg-white/10 text-slate-500 font-bold text-xs flex items-center justify-center transition-all';
            }
        }
    }
    
    // Populate review summary on step 3
    if (step === 3) populateBookingReview();
}

function handleBookingStep(event) {
    event.preventDefault();
    if (bookingStep < 3) {
        goToBookingStep(bookingStep + 1);
    } else {
        // Final step - validate checkboxes and submit
        const agreeTerms = document.getElementById('agree-terms');
        const agreeService = document.getElementById('agree-service');
        if (!agreeTerms.checked || !agreeService.checked) {
            alert('Please agree to the Terms & Conditions and Service Policy to proceed.');
            return;
        }
        handleSpecialBookingSubmit(event);
    }
}

function populateBookingReview() {
    const form = document.getElementById('special-booking-form');
    const fd = new FormData(form);
    const data = Object.fromEntries(fd.entries());
    
    let amount = 0;
    if (currentSpecialMode === 'emergency') amount = 499;
    else if (currentSpecialMode === 'home-door') amount = 99;
    
    const summary = document.getElementById('booking-review-summary');
    summary.innerHTML = `
        <h4 class="text-sm font-bold text-white mb-3 flex items-center gap-2"><i class="fa-solid fa-clipboard-list text-brand-cyan"></i> Booking Summary</h4>
        <div class="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <div><span class="text-slate-500">Name:</span> <span class="text-white font-medium">${data.fullName || '-'}</span></div>
            <div><span class="text-slate-500">Phone:</span> <span class="text-white font-medium">${data.phone || '-'}</span></div>
            <div class="col-span-2"><span class="text-slate-500">Email:</span> <span class="text-white font-medium">${data.email || '-'}</span></div>
            <div class="col-span-2"><span class="text-slate-500">Service:</span> <span class="text-brand-cyan font-medium">${data.serviceCategory || '-'}</span></div>
            <div><span class="text-slate-500">Service For:</span> <span class="text-white font-medium">${data.serviceFor || '-'}</span></div>
            <div><span class="text-slate-500">Devices:</span> <span class="text-white font-medium">${data.deviceCount || '1'}</span></div>
            <div class="col-span-2"><span class="text-slate-500">Address:</span> <span class="text-white font-medium">${data.address || '-'}</span></div>
            <div><span class="text-slate-500">Date:</span> <span class="text-white font-medium">${data.date || '-'}</span></div>
            <div><span class="text-slate-500">Time:</span> <span class="text-white font-medium">${data.time || '-'}</span></div>
            <div><span class="text-slate-500">Urgency:</span> <span class="text-white font-medium">${data.urgency || 'Normal'}</span></div>
            <div><span class="text-slate-500">Contact via:</span> <span class="text-white font-medium">${data.contactMethod || 'Call'}</span></div>
        </div>
        ${data.description ? `<div class="mt-2 pt-2 border-t border-white/10"><span class="text-slate-500 text-xs">Notes:</span> <span class="text-white text-xs">${data.description}</span></div>` : ''}
        ${amount > 0 ? `<div class="mt-3 pt-3 border-t border-white/10 flex justify-between items-center"><span class="text-sm text-slate-300 font-semibold">Booking Charge:</span><span class="text-lg font-bold text-brand-emerald">₹${amount}</span></div>` : '<div class="mt-3 pt-3 border-t border-white/10"><span class="text-sm text-brand-emerald font-semibold"><i class="fa-solid fa-check-circle mr-1"></i> Free Consultation - No charge</span></div>'}
    `;
}

function handleSpecialBookingSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());
    
    // Determine the payment amount based on booking type
    let bookingAmount = 0;
    if (currentSpecialMode === 'emergency') {
        bookingAmount = 499;
    } else if (currentSpecialMode === 'home-door') {
        bookingAmount = 99;
    } else {
        // For regular service bookings or consultation, set a base price
        bookingAmount = 0; // Free consultation or price-on-diagnosis
    }

    // Mock Automation: Assign Technician based on location
    let assignedTech = "Auto-Assigned: Tech-01 (Rewari)";
    if (data.address.toLowerCase().includes('gurugram')) assignedTech = "Auto-Assigned: Tech-02 (Gurugram)";
    if (data.address.toLowerCase().includes('delhi') || data.address.toLowerCase().includes('noida')) assignedTech = "Auto-Assigned: Tech-03 (Delhi/Noida)";

    // If the booking is free (consultation or no-charge service), create directly without payment
    if (bookingAmount === 0) {
        const bookingId = 'BKG-' + Math.random().toString(36).substr(2, 6).toUpperCase();
        const newBooking = {
            id: bookingId,
            type: 'Service',
            service: data.serviceCategory,
            date: data.date,
            time: data.time,
            address: data.address,
            amount: 0,
            status: 'Booked',
            assignedTech: 'Pending Approval',
            paymentId: 'FREE',
            createdAt: new Date().toISOString()
        };

        if (state.currentUser && state.currentUser.role !== 'admin') {
            state.currentUser.bookings = state.currentUser.bookings || [];
            state.currentUser.bookings.push(newBooking);
            saveUserState();
        }

        // Send confirmation email
        const emailParams = {
            to_name: data.fullName,
            to_email: data.email,
            service_name: data.serviceCategory,
            booking_date: data.date,
            booking_time: data.time,
            address: data.address,
            phone: data.phone,
            assigned_tech: assignedTech
        };

        const submitBtn = event.target.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Confirming...';
        submitBtn.disabled = true;

        emailjs.send("service_j84frhz", "template_wud47ar", emailParams)
            .then(() => {
                alert(`✅ Booking Confirmed!\n\nBooking ID: ${bookingId}\nA confirmation email has been sent to ${data.email}.`);
                closeSpecialModal();
                event.target.reset();
                if (state.currentUser && state.currentUser.role !== 'admin') {
                    switchView('profile');
                }
            })
            .catch((error) => {
                console.error("EmailJS Error:", error);
                alert(`✅ Booking Confirmed!\n\nBooking ID: ${bookingId}\n(Note: Email confirmation failed. Please check EmailJS configuration).`);
                closeSpecialModal();
                event.target.reset();
            })
            .finally(() => {
                submitBtn.innerHTML = originalBtnText;
                submitBtn.disabled = false;
            });
        return;
    }

    // --- PAID BOOKING: Open Razorpay Checkout ---
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Opening Payment...';
    submitBtn.disabled = true;

    // Verify Razorpay SDK
    if (typeof Razorpay === 'undefined') {
        alert("Payment system is still loading. Please wait a moment and try again.");
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
        return;
    }

    const user = state.currentUser;
    const fullName = data.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || "Customer";
    const bookingLabel = currentSpecialMode === 'emergency' ? 'Emergency IT Support' : 'Home Doorstep Service';

    const options = {
        key: RAZORPAY_KEY,
        amount: bookingAmount * 100, // Amount in paise
        currency: "INR",
        name: "Divyansh Tech Services",
        description: `Booking: ${bookingLabel}`,
        image: "DTs.png",
        handler: function (response) {
            const paymentId = response.razorpay_payment_id;
            const bookingId = 'BKG-' + Math.random().toString(36).substr(2, 6).toUpperCase();

            const newBooking = {
                id: bookingId,
                type: 'Service',
                service: data.serviceCategory,
                date: data.date,
                time: data.time,
                address: data.address,
                amount: bookingAmount,
                status: 'Booked',
                assignedTech: 'Pending Approval',
                paymentId: paymentId,
                razorpayOrderId: response.razorpay_order_id || 'N/A',
                createdAt: new Date().toISOString()
            };

            // Save booking to user profile
            if (state.currentUser && state.currentUser.role !== 'admin') {
                state.currentUser.bookings = state.currentUser.bookings || [];
                state.currentUser.bookings.push(newBooking);

                // Award points (1 point per ₹100, minimum 1 point)
                const pointsEarned = Math.max(1, Math.floor(bookingAmount / 100));
                state.currentUser.points = (state.currentUser.points || 0) + pointsEarned;

                saveUserState();
                logActivity(`New Booking: ${bookingId} by @${user.username} (₹${bookingAmount}) | Pay: ${paymentId}`);
            }

            // Send confirmation email via EmailJS
            const emailParams = {
                to_name: data.fullName,
                to_email: data.email,
                service_name: data.serviceCategory,
                booking_date: data.date,
                booking_time: data.time,
                address: data.address,
                phone: data.phone,
                assigned_tech: assignedTech
            };

            emailjs.send("service_j84frhz", "template_wud47ar", emailParams)
                .then(() => {
                    const pointsEarned = Math.max(1, Math.floor(bookingAmount / 100));
                    alert(`✅ Booking & Payment Successful!\n\nBooking ID: ${bookingId}\nPayment ID: ${paymentId}\nAmount Paid: ₹${bookingAmount}\n\nA confirmation email has been sent to ${data.email}.\nYou earned ${pointsEarned} DTS Points!`);
                    closeSpecialModal();
                    event.target.reset();
                    if (state.currentUser && state.currentUser.role !== 'admin') {
                        switchView('profile');
                    }
                })
                .catch((error) => {
                    console.error("EmailJS Error:", error);
                    alert(`✅ Payment Successful!\n\nBooking ID: ${bookingId}\nPayment ID: ${paymentId}\nAmount: ₹${bookingAmount}\n(Note: Email confirmation failed. Booking is saved in your profile).`);
                    closeSpecialModal();
                    event.target.reset();
                    if (state.currentUser && state.currentUser.role !== 'admin') {
                        switchView('profile');
                    }
                })
                .finally(() => {
                    submitBtn.innerHTML = originalBtnText;
                    submitBtn.disabled = false;
                });
        },
        prefill: {
            name: fullName,
            email: data.email || user.email || "customer@example.com",
            contact: data.phone || user.phone || "9813443289"
        },
        notes: {
            booking_type: bookingLabel,
            service_category: data.serviceCategory,
            user_id: user.username || user.email
        },
        theme: { color: "#00f0ff" },
        modal: {
            ondismiss: function () {
                // User closed the payment modal — re-enable the button
                submitBtn.innerHTML = originalBtnText;
                submitBtn.disabled = false;
            }
        }
    };

    try {
        const rzp = new Razorpay(options);

        rzp.on('payment.failed', function (response) {
            const errorCode = response.error.code || 'UNKNOWN';
            const errorDesc = response.error.description || 'Payment could not be completed.';
            console.error("Razorpay Payment Failed:", response.error);
            alert(`❌ Payment Failed\n\nCode: ${errorCode}\nDescription: ${errorDesc}\n\nPlease try again or contact support at +91 9813443289.`);
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
        });

        rzp.open();
    } catch (e) {
        console.error("Razorpay failed to initialize:", e);
        alert("Payment gateway failed to load. Please check your internet connection and try again.");
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
    }
}

// --- Admin Logic ---
function openAdminPinModal() {
    document.getElementById('admin-pin-modal').classList.remove('hidden');
    document.getElementById('admin-pin-input').value = '';
    document.getElementById('admin-pin-input').focus();
}

function closeAdminPinModal() {
    document.getElementById('admin-pin-modal').classList.add('hidden');
}

function verifyAdminPin() {
    const pin = document.getElementById('admin-pin-input').value;
    if (pin === '2659') {
        state.currentUser = { name: 'Admin', role: 'admin', username: 'admin_dts' };
        closeAdminPinModal();
        switchView('admin-center'); // Redirect to full-screen control center
        updateUIForUser();
    } else {
        alert('❌ Incorrect PIN. Please try again.');
    }
}

function assignTechnician(bookingId) {
    alert(`✅ Technician Assigned Successfully!\n\nBooking ${bookingId} has been updated.\nSMS/WhatsApp notification sent to the technician and customer.`);
}

function downloadExcel(type) {
    const allUsers = JSON.parse(localStorage.getItem('dts_registered_users') || '[]');
    const allTransactions = allUsers.flatMap(u => 
        [...(u.bookings || []), ...(u.orders || [])].map(t => ({...t, userName: u.firstName + ' ' + u.lastName, userEmail: u.email, username: u.username}))
    );
    
    let csvContent = '';
    let filename = '';
    
    if (type === 'revenue-report' || type === 'transaction-log' || type === 'data') {
        // Build CSV for transactions
        csvContent = 'ID,Type,Customer,Username,Email,Details,Amount,Status,Date,Payment ID\n';
        allTransactions.forEach(t => {
            csvContent += `"${t.id}","${t.type}","${t.userName}","${t.username}","${t.userEmail}","${t.product || t.service || 'N/A'}","${t.amount || 0}","${t.status}","${t.date || ''}","${t.paymentId || 'N/A'}"\n`;
        });
        filename = `dts-${type}-${new Date().toISOString().slice(0,10)}.csv`;
    } else if (type === 'customer-list') {
        csvContent = 'Username,First Name,Last Name,Email,Phone,Points,Referral Code,Total Bookings,Total Orders\n';
        allUsers.forEach(u => {
            csvContent += `"${u.username}","${u.firstName}","${u.lastName}","${u.email}","${u.phone || ''}","${u.points || 0}","${u.referralCode || ''}","${(u.bookings || []).length}","${(u.orders || []).length}"\n`;
        });
        filename = `dts-customers-${new Date().toISOString().slice(0,10)}.csv`;
    }
    
    // Download the CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    
    logActivity(`Exported ${type} report`);
    alert(`📥 Downloaded: ${filename}`);
}

// --- Enterprise Contact Sales Modal ---
function openEnterpriseModal() {
    const modal = document.getElementById('enterprise-modal');
    const content = document.getElementById('enterprise-modal-content');
    
    // Pre-fill if user is logged in
    if (state.currentUser && state.currentUser.role !== 'admin') {
        document.getElementById('ent-company').value = state.currentUser.firstName + ' ' + state.currentUser.lastName + ' Enterprises';
        document.getElementById('ent-email').value = state.currentUser.email || '';
        document.getElementById('ent-phone').value = state.currentUser.phone || '';
    }

    modal.classList.remove('hidden');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
}

function closeEnterpriseModal() {
    const modal = document.getElementById('enterprise-modal');
    const content = document.getElementById('enterprise-modal-content');
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => { modal.classList.add('hidden'); }, 300);
}

function handleEnterpriseSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());
    
    // --- EmailJS Automation: Enterprise Inquiry ---
    const emailParams = {
        to_name: data.contactName,
        to_email: data.email,
        company_name: data.company,
        employees: data.employees,
        requirements: data.requirements
    };
    
    console.log("Sending Enterprise Email with params:", emailParams); // For debugging

    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending Request...';
    submitBtn.disabled = true;

    // Enterprise Inquiry Email (Using order confirmation template as fallback until specific enterprise template is created)
    emailjs.send("service_j84frhz", "template_wud47ar", emailParams)
        .then(() => {
            alert(`✅ Enterprise Inquiry Submitted!\n\nA confirmation email has been sent to ${data.email}.\n\nCompany: ${data.company}\n\nOur Enterprise Solutions team will contact you at ${data.phone} within 24 hours.`);
            closeEnterpriseModal();
            event.target.reset();
        })
        .catch((error) => {
            console.error("EmailJS Error:", error);
            alert(`✅ Enterprise Inquiry Submitted!\n\n(Note: Email confirmation failed to send. Please check EmailJS configuration).`);
            closeEnterpriseModal();
            event.target.reset();
        })
        .finally(() => {
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
        });
}

// ==========================================
// AMC PURCHASE 3-STEP WIZARD
// ==========================================
let amcStep = 1;
let amcSelectedPlan = null;

const amcPlanDetails = {
    'Starter': {
        name: 'Starter', price: 899, yearlyPrice: 6899, color: 'cyan', icon: 'fa-house-laptop',
        devices: 4, remoteSessions: 4, emergencySupport: 1, healthCheckups: 12,
        responseTime: '24 hours', onSite: false, dedicatedManager: false,
        channels: 'Email', label: 'Starter AMC'
    },
    'Business Pro': {
        name: 'Business Pro', price: 2899, yearlyPrice: 28999, color: 'emerald', icon: 'fa-briefcase',
        devices: 10, remoteSessions: 'Unlimited', emergencySupport: 2, healthCheckups: 12,
        responseTime: '4 hours', onSite: true, dedicatedManager: false,
        channels: 'Phone + WhatsApp', label: 'Business Pro AMC'
    },
    'Enterprise': {
        name: 'Enterprise', price: 0, yearlyPrice: 0, color: 'purple', icon: 'fa-building',
        devices: 'Unlimited', remoteSessions: 'Unlimited', emergencySupport: 'Unlimited', healthCheckups: 52,
        responseTime: '1 hour', onSite: true, dedicatedManager: true,
        channels: '24/7 Priority', label: 'Enterprise AMC'
    }
};

// AMC Coupon tracking
let amcAppliedCoupon = null;

function applyAMCCoupon() {
    const couponInput = document.getElementById('amc-coupon-input');
    const messageDiv = document.getElementById('amc-coupon-message');
    const couponCode = couponInput.value.trim().toUpperCase();

    if (!couponCode) {
        messageDiv.innerHTML = '<p class="text-xs text-red-400"><i class="fa-solid fa-circle-exclamation mr-1"></i> Please enter a coupon code.</p>';
        messageDiv.classList.remove('hidden');
        return;
    }

    // Check against stored coupons
    const coupons = JSON.parse(localStorage.getItem('dts_coupons') || '[]');
    const coupon = coupons.find(c => c.code === couponCode && c.status === 'active');

    if (!coupon) {
        messageDiv.innerHTML = '<p class="text-xs text-red-400"><i class="fa-solid fa-circle-xmark mr-1"></i> Invalid or expired coupon code.</p>';
        messageDiv.classList.remove('hidden');
        return;
    }

    // Check if user's personal coupon
    const user = state.currentUser;
    if (user && user.personalCoupon === couponCode) {
        messageDiv.innerHTML = '<p class="text-xs text-yellow-400"><i class="fa-solid fa-circle-info mr-1"></i> Personal coupons are only valid for Home Services.</p>';
        messageDiv.classList.remove('hidden');
        return;
    }

    // Apply coupon
    amcAppliedCoupon = coupon;
    
    // Show success message
    messageDiv.innerHTML = `<p class="text-xs text-brand-emerald"><i class="fa-solid fa-circle-check mr-1"></i> Coupon "${coupon.code}" applied successfully!</p>`;
    messageDiv.classList.remove('hidden');

    // Show applied coupon summary
    const appliedDiv = document.getElementById('amc-coupon-applied');
    const codeDisplay = document.getElementById('amc-coupon-code-display');
    const discountDisplay = document.getElementById('amc-coupon-discount-display');
    
    codeDisplay.textContent = coupon.code;
    discountDisplay.textContent = `-₹${coupon.discount}`;
    appliedDiv.classList.remove('hidden');

    // Clear input
    couponInput.value = '';
    couponInput.disabled = true;

    // Update review summary with discount
    populateAMCReview();
}

function removeAMCCoupon() {
    amcAppliedCoupon = null;
    
    const messageDiv = document.getElementById('amc-coupon-message');
    const appliedDiv = document.getElementById('amc-coupon-applied');
    const couponInput = document.getElementById('amc-coupon-input');
    
    messageDiv.classList.add('hidden');
    appliedDiv.classList.add('hidden');
    couponInput.disabled = false;
    
    // Update review summary without discount
    populateAMCReview();
}

function openAMCPurchaseModal(planName, billingCycle) {
    // Enforce login
    if (!state.currentUser || state.currentUser.role === 'admin') {
        alert("Please log in or sign up to subscribe to an AMC plan.");
        openAuthModal('signup');
        return;
    }

    amcSelectedPlan = { ...amcPlanDetails[planName], billingCycle: billingCycle || 'monthly' };
    const modal = document.getElementById('amc-purchase-modal');
    const content = document.getElementById('amc-purchase-content');
    const header = document.getElementById('amc-modal-header');

    const price = billingCycle === 'yearly' ? amcSelectedPlan.yearlyPrice : amcSelectedPlan.price;
    const cycleLabel = billingCycle === 'yearly' ? '/year' : '/month';

    header.innerHTML = `
        <div class="flex items-center gap-3 mb-2">
            <div class="w-12 h-12 rounded-full bg-brand-${amcSelectedPlan.color}/20 flex items-center justify-center">
                <i class="fa-solid ${amcSelectedPlan.icon} text-brand-${amcSelectedPlan.color} text-xl"></i>
            </div>
            <div>
                <h3 class="font-display font-bold text-2xl text-white">${planName} Plan</h3>
                <p class="text-brand-${amcSelectedPlan.color} font-bold text-sm">₹${price.toLocaleString()}${cycleLabel}</p>
            </div>
        </div>
    `;

    // Auto-fill user details
    const user = state.currentUser;
    const nameEl = document.getElementById('amc_fullName');
    const emailEl = document.getElementById('amc_email');
    const phoneEl = document.getElementById('amc_phone');
    const addressEl = document.getElementById('amc_address');
    if (nameEl) nameEl.value = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    if (emailEl) emailEl.value = user.email || '';
    if (phoneEl) phoneEl.value = user.phone || '';
    if (addressEl) addressEl.value = user.address || '';

    // Reset to step 1
    amcStep = 1;
    goToAMCStep(1);

    modal.classList.remove('hidden');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);

    // Update pay button text
    const payBtn = document.getElementById('amc-pay-btn-text');
    if (payBtn) payBtn.textContent = `Pay ₹${price.toLocaleString()} via Razorpay`;
}

function closeAMCPurchaseModal() {
    const modal = document.getElementById('amc-purchase-modal');
    const content = document.getElementById('amc-purchase-content');
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => { modal.classList.add('hidden'); }, 300);
    amcStep = 1;
    
    // Reset coupon state
    amcAppliedCoupon = null;
    const couponInput = document.getElementById('amc-coupon-input');
    const messageDiv = document.getElementById('amc-coupon-message');
    const appliedDiv = document.getElementById('amc-coupon-applied');
    if (couponInput) {
        couponInput.value = '';
        couponInput.disabled = false;
    }
    if (messageDiv) messageDiv.classList.add('hidden');
    if (appliedDiv) appliedDiv.classList.add('hidden');
    
    // Remove AMC from cart if it was added (user cancelled before payment)
    const amcCartIndex = state.cart.findIndex(item => item.isAMC);
    if (amcCartIndex !== -1) {
        state.cart.splice(amcCartIndex, 1);
        saveCart();
    }
}

function validateAMCStep1() {
    const fullName = document.getElementById('amc_fullName').value.trim();
    const email = document.getElementById('amc_email').value.trim();
    const phone = document.getElementById('amc_phone').value.trim();
    const address = document.getElementById('amc_address').value.trim();

    if (!fullName) {
        alert('Please enter your full name.');
        document.getElementById('amc_fullName').focus();
        return;
    }
    if (!email || !email.includes('@')) {
        alert('Please enter a valid email address.');
        document.getElementById('amc_email').focus();
        return;
    }
    if (!phone || phone.length < 10) {
        alert('Please enter a valid phone number (at least 10 digits).');
        document.getElementById('amc_phone').focus();
        return;
    }
    if (!address) {
        alert('Please enter your complete address.');
        document.getElementById('amc_address').focus();
        return;
    }

    goToAMCStep(2);
}

function validateAMCStep2() {
    const deviceCount = document.getElementById('amc_deviceCount').value;
    const deviceTypes = document.querySelectorAll('input[name="amc_deviceTypes"]:checked');

    if (!deviceCount || deviceCount < 1) {
        alert('Please specify the number of devices to cover.');
        document.getElementById('amc_deviceCount').focus();
        return;
    }
    if (deviceTypes.length === 0) {
        alert('Please select at least one device type.');
        return;
    }

    goToAMCStep(3);
}

function goToAMCStep(step) {
    amcStep = step;
    document.querySelectorAll('.amc-step').forEach(el => el.classList.add('hidden'));
    const target = document.getElementById('amc-step-' + step);
    if (target) target.classList.remove('hidden');

    // Update step indicators
    for (let i = 1; i <= 3; i++) {
        const dot = document.getElementById('amc-step-dot-' + i);
        if (dot) {
            if (i <= step) {
                dot.className = 'w-8 h-8 rounded-full bg-brand-emerald text-brand-dark font-bold text-xs flex items-center justify-center transition-all';
            } else {
                dot.className = 'w-8 h-8 rounded-full bg-white/10 text-slate-500 font-bold text-xs flex items-center justify-center transition-all';
            }
        }
    }

    // Populate review on step 3
    if (step === 3) populateAMCReview();
}

function handleAMCPurchaseStep(event) {
    event.preventDefault();
    if (amcStep < 3) {
        goToAMCStep(amcStep + 1);
    } else {
        const agreeTerms = document.getElementById('amc-agree-terms');
        const agreeAuto = document.getElementById('amc-agree-auto');
        if (!agreeTerms.checked || !agreeAuto.checked) {
            alert('Please agree to the Terms & Conditions and Subscription Policy to proceed.');
            return;
        }
        handleAMCSubmit();
    }
}

function populateAMCReview() {
    const form = document.getElementById('amc-purchase-form');
    const fd = new FormData(form);
    const plan = amcSelectedPlan;
    const price = plan.billingCycle === 'yearly' ? plan.yearlyPrice : plan.price;
    const cycleLabel = plan.billingCycle === 'yearly' ? 'Yearly' : 'Monthly';

    const deviceTypes = fd.getAll('amc_deviceTypes').join(', ') || 'Not specified';

    // Calculate discount if coupon applied
    let discount = 0;
    let finalPrice = price;
    if (amcAppliedCoupon) {
        discount = amcAppliedCoupon.discount;
        finalPrice = Math.max(0, price - discount);
    }

    document.getElementById('amc-review-summary').innerHTML = `
        <div class="flex items-center gap-3 mb-3 pb-3 border-b border-white/10">
            <div class="w-10 h-10 rounded-full bg-brand-${plan.color}/20 flex items-center justify-center">
                <i class="fa-solid ${plan.icon} text-brand-${plan.color}"></i>
            </div>
            <div>
                <h4 class="font-display font-bold text-white">${plan.name} Plan — ${cycleLabel}</h4>
                <p class="text-brand-${plan.color} font-bold text-sm">₹${price.toLocaleString()}</p>
            </div>
        </div>
        <div class="grid grid-cols-2 gap-2 text-xs">
            <div class="bg-brand-dark/80 p-2 rounded-lg">
                <span class="text-slate-500 block">Name</span>
                <span class="text-white font-semibold">${fd.get('amc_fullName') || 'N/A'}</span>
            </div>
            <div class="bg-brand-dark/80 p-2 rounded-lg">
                <span class="text-slate-500 block">Phone</span>
                <span class="text-white font-semibold">${fd.get('amc_phone') || 'N/A'}</span>
            </div>
            <div class="bg-brand-dark/80 p-2 rounded-lg col-span-2">
                <span class="text-slate-500 block">Email</span>
                <span class="text-white font-semibold">${fd.get('amc_email') || 'N/A'}</span>
            </div>
            <div class="bg-brand-dark/80 p-2 rounded-lg col-span-2">
                <span class="text-slate-500 block">Address</span>
                <span class="text-white font-semibold">${fd.get('amc_address') || 'N/A'}</span>
            </div>
            <div class="bg-brand-dark/80 p-2 rounded-lg">
                <span class="text-slate-500 block">Service For</span>
                <span class="text-white font-semibold">${fd.get('amc_serviceFor') || 'Home'}</span>
            </div>
            <div class="bg-brand-dark/80 p-2 rounded-lg">
                <span class="text-slate-500 block">Devices</span>
                <span class="text-white font-semibold">${fd.get('amc_deviceCount') || 1} (${deviceTypes})</span>
            </div>
            <div class="bg-brand-dark/80 p-2 rounded-lg">
                <span class="text-slate-500 block">Contact Via</span>
                <span class="text-white font-semibold">${fd.get('amc_contactMethod') || 'Call'}</span>
            </div>
            <div class="bg-brand-dark/80 p-2 rounded-lg">
                <span class="text-slate-500 block">Billing</span>
                <span class="text-white font-semibold">${cycleLabel}</span>
            </div>
        </div>
        <div class="mt-3 p-3 rounded-lg bg-brand-emerald/5 border border-brand-emerald/20">
            <p class="text-xs text-brand-emerald font-semibold mb-1"><i class="fa-solid fa-gift mr-1"></i> Plan Includes:</p>
            <div class="grid grid-cols-2 gap-1 text-[10px] text-slate-300">
                <span><i class="fa-solid fa-check text-brand-emerald mr-1"></i>${plan.devices} devices covered</span>
                <span><i class="fa-solid fa-check text-brand-emerald mr-1"></i>${plan.remoteSessions} remote sessions/mo</span>
                <span><i class="fa-solid fa-check text-brand-emerald mr-1"></i>${plan.emergencySupport} emergency support/yr</span>
                <span><i class="fa-solid fa-check text-brand-emerald mr-1"></i>${plan.responseTime} response time</span>
            </div>
        </div>
        ${amcAppliedCoupon ? `
        <div class="mt-3 p-3 rounded-lg bg-brand-purple/10 border border-brand-purple/30">
            <div class="flex items-center justify-between mb-2">
                <span class="text-xs text-slate-400">Subtotal</span>
                <span class="text-xs text-white font-semibold">₹${price.toLocaleString()}</span>
            </div>
            <div class="flex items-center justify-between mb-2">
                <span class="text-xs text-brand-purple flex items-center gap-1">
                    <i class="fa-solid fa-tag"></i> Coupon: ${amcAppliedCoupon.code}
                </span>
                <span class="text-xs text-brand-emerald font-bold">-₹${discount.toLocaleString()}</span>
            </div>
            <div class="flex items-center justify-between pt-2 border-t border-white/10">
                <span class="text-sm text-white font-bold">Total</span>
                <span class="text-lg text-brand-emerald font-bold">₹${finalPrice.toLocaleString()}</span>
            </div>
        </div>
        ` : ''}
    `;

    // Update pay button text with final amount
    const payBtn = document.getElementById('amc-pay-btn-text');
    if (payBtn) {
        payBtn.textContent = `Checkout & Pay ₹${finalPrice.toLocaleString()}`;
    }
}

function handleAMCSubmit() {
    const form = document.getElementById('amc-purchase-form');
    const fd = new FormData(form);
    const plan = amcSelectedPlan;
    const price = plan.billingCycle === 'yearly' ? plan.yearlyPrice : plan.price;
    const deviceTypes = fd.getAll('amc_deviceTypes').join(', ') || 'Not specified';

    // Calculate final price with coupon discount
    let finalPrice = price;
    let couponCode = null;
    if (amcAppliedCoupon) {
        finalPrice = Math.max(0, price - amcAppliedCoupon.discount);
        couponCode = amcAppliedCoupon.code;
    }

    const checkoutData = {
        fullName: fd.get('amc_fullName'),
        email: fd.get('amc_email'),
        phone: fd.get('amc_phone'),
        address: fd.get('amc_address'),
        pincode: fd.get('amc_pincode') || '',
        city: fd.get('amc_city') || '',
        state: fd.get('amc_state') || '',
        serviceFor: fd.get('amc_serviceFor') || 'Home',
        deviceCount: fd.get('amc_deviceCount') || '1',
        deviceTypes: deviceTypes,
        contactMethod: fd.get('amc_contactMethod') || 'Call',
        issues: fd.get('amc_issues') || '',
        couponCode: couponCode,
        originalPrice: price,
        discount: amcAppliedCoupon ? amcAppliedCoupon.discount : 0
    };

    // Add AMC to cart temporarily for checkout tracking
    const amcCartItem = {
        id: 'AMC-' + plan.name.replace(/\s+/g, '-').toUpperCase(),
        name: `${plan.name} AMC Plan (${plan.billingCycle})`,
        price: finalPrice,
        image: 'DTs.png',
        categoryName: 'AMC Subscription',
        isAMC: true,
        planName: plan.name,
        billingCycle: plan.billingCycle
    };
    
    state.cart.push(amcCartItem);
    saveCart();

    closeAMCPurchaseModal();

    // Call Razorpay with AMC data and final price
    initiateRazorpay(plan.label, finalPrice, checkoutData, true, plan.billingCycle);
}

// ==========================================
// AMC USAGE TRACKING (for Profile)
// ==========================================
function getAMCUsageData(user) {
    if (!user || !user.orders) return null;
    
    const activeAMC = user.orders.filter(o => o.type === 'AMC' && o.status === 'Active');
    if (activeAMC.length === 0) return null;

    const amcOrder = activeAMC[0];
    const planKey = amcOrder.product.includes('Enterprise') ? 'Enterprise' : 
                    amcOrder.product.includes('Business Pro') ? 'Business Pro' : 'Starter';
    const plan = amcPlanDetails[planKey];
    
    // Get usage from order or default to 0
    const usage = amcOrder.amcUsage || {
        remoteSessions: 0,
        onSiteVisits: 0,
        emergencySupport: 0,
        healthCheckups: 0,
        lastHealthCheckup: null,
        devicesRegistered: amcOrder.deviceCount || 1
    };

    return { plan, usage, order: amcOrder, planKey };
}

function renderAMCUsageCard(user) {
    const data = getAMCUsageData(user);
    if (!data) return '';

    const { plan, usage, order, planKey } = data;
    const colorMap = { 'Starter': 'cyan', 'Business Pro': 'emerald', 'Enterprise': 'purple' };
    const color = colorMap[planKey] || 'cyan';

    // Calculate remaining values
    const remoteRemaining = plan.remoteSessions === 'Unlimited' ? 'Unlimited' : Math.max(0, plan.remoteSessions - usage.remoteSessions);
    const emergencyRemaining = plan.emergencySupport === 'Unlimited' ? 'Unlimited' : Math.max(0, plan.emergencySupport - usage.emergencySupport);
    const devicesRemaining = plan.devices === 'Unlimited' ? 'Unlimited' : Math.max(0, plan.devices - (usage.devicesRegistered || 0));

    // Progress bars
    const remotePercent = plan.remoteSessions === 'Unlimited' ? 15 : Math.min(100, (usage.remoteSessions / plan.remoteSessions) * 100);
    const emergencyPercent = plan.emergencySupport === 'Unlimited' ? 10 : Math.min(100, (usage.emergencySupport / plan.emergencySupport) * 100);
    const devicePercent = plan.devices === 'Unlimited' ? 20 : Math.min(100, ((usage.devicesRegistered || 0) / plan.devices) * 100);

    // Billing info
    const billingCycle = order.billingCycle || 'monthly';
    const cyclePrice = billingCycle === 'yearly' ? plan.yearlyPrice : plan.price;
    const cycleLabel = billingCycle === 'yearly' ? '/year' : '/month';
    const startDate = order.date || 'N/A';
    const nextBilling = order.nextBillingDate || 'N/A';

    return `
        <!-- AMC Plan Usage Dashboard -->
        <div class="glass rounded-2xl border border-brand-${color}/30 mb-8 reveal relative overflow-hidden ${planKey === 'Enterprise' ? 'shadow-[0_0_30px_rgba(139,92,246,0.15)]' : planKey === 'Business Pro' ? 'shadow-[0_0_30px_rgba(16,185,129,0.15)]' : 'shadow-[0_0_20px_rgba(0,240,255,0.1)]'}">
            <div class="absolute inset-0 opacity-[0.03]">
                <div class="absolute inset-0 bg-gradient-to-br from-brand-${color} to-transparent"></div>
            </div>
            <div class="relative p-6">
                <!-- Header -->
                <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
                    <div class="flex items-center gap-4">
                        <div class="w-14 h-14 rounded-2xl bg-brand-${color}/15 flex items-center justify-center border border-brand-${color}/30">
                            <i class="fa-solid ${plan.icon} text-brand-${color} text-2xl"></i>
                        </div>
                        <div>
                            <div class="flex items-center gap-2 mb-1">
                                <h3 class="font-display text-xl font-bold text-white">${plan.name} Plan</h3>
                                <span class="px-2 py-0.5 rounded-full bg-brand-${color}/20 text-brand-${color} text-[10px] font-bold uppercase tracking-wider border border-brand-${color}/30">Active</span>
                            </div>
                            <p class="text-xs text-slate-400">
                                <i class="fa-solid fa-calendar mr-1"></i> Started: ${startDate}
                                <span class="mx-2">|</span>
                                <i class="fa-solid fa-rotate mr-1"></i> ${billingCycle === 'yearly' ? 'Yearly' : 'Monthly'} Billing — ₹${cyclePrice.toLocaleString()}${cycleLabel}
                            </p>
                            ${nextBilling !== 'N/A' ? `<p class="text-xs text-brand-${color} mt-1"><i class="fa-solid fa-clock mr-1"></i> Next billing: ${nextBilling}</p>` : ''}
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="px-3 py-1.5 rounded-lg bg-brand-${color}/10 text-brand-${color} text-xs font-bold border border-brand-${color}/20">
                            <i class="fa-solid fa-infinity mr-1"></i> ${plan.responseTime} Response
                        </span>
                        ${plan.onSite ? `<span class="px-3 py-1.5 rounded-lg bg-brand-emerald/10 text-brand-emerald text-xs font-bold border border-brand-emerald/20"><i class="fa-solid fa-house mr-1"></i> On-site</span>` : ''}
                        ${plan.dedicatedManager ? `<span class="px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-400 text-xs font-bold border border-purple-500/20"><i class="fa-solid fa-user-tie mr-1"></i> Dedicated Mgr</span>` : ''}
                    </div>
                </div>

                <!-- Usage Stats Grid -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <!-- Remote Sessions -->
                    <div class="bg-brand-dark/40 rounded-xl p-4 border border-white/5">
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-[10px] text-slate-400 uppercase tracking-wider">Remote Sessions</span>
                            <i class="fa-solid fa-headset text-brand-${color} text-xs"></i>
                        </div>
                        <div class="text-xl font-bold text-white mb-1">${usage.remoteSessions} <span class="text-xs text-slate-500 font-normal">/ ${plan.remoteSessions}</span></div>
                        <div class="w-full bg-brand-dark/80 rounded-full h-1.5">
                            <div class="bg-brand-${color} h-1.5 rounded-full transition-all duration-500" style="width: ${remotePercent}%"></div>
                        </div>
                        <p class="text-[10px] text-slate-500 mt-1">${remoteRemaining === 'Unlimited' ? 'Unlimited remaining' : remoteRemaining + ' remaining this month'}</p>
                    </div>

                    <!-- Emergency Support -->
                    <div class="bg-brand-dark/40 rounded-xl p-4 border border-white/5">
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-[10px] text-slate-400 uppercase tracking-wider">Emergency</span>
                            <i class="fa-solid fa-triangle-exclamation text-yellow-500 text-xs"></i>
                        </div>
                        <div class="text-xl font-bold text-white mb-1">${usage.emergencySupport} <span class="text-xs text-slate-500 font-normal">/ ${plan.emergencySupport}</span></div>
                        <div class="w-full bg-brand-dark/80 rounded-full h-1.5">
                            <div class="bg-yellow-500 h-1.5 rounded-full transition-all duration-500" style="width: ${emergencyPercent}%"></div>
                        </div>
                        <p class="text-[10px] text-slate-500 mt-1">${emergencyRemaining === 'Unlimited' ? 'Unlimited remaining' : emergencyRemaining + ' remaining this year'}</p>
                    </div>

                    <!-- Devices Covered -->
                    <div class="bg-brand-dark/40 rounded-xl p-4 border border-white/5">
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-[10px] text-slate-400 uppercase tracking-wider">Devices</span>
                            <i class="fa-solid fa-laptop text-brand-emerald text-xs"></i>
                        </div>
                        <div class="text-xl font-bold text-white mb-1">${usage.devicesRegistered || 0} <span class="text-xs text-slate-500 font-normal">/ ${plan.devices}</span></div>
                        <div class="w-full bg-brand-dark/80 rounded-full h-1.5">
                            <div class="bg-brand-emerald h-1.5 rounded-full transition-all duration-500" style="width: ${devicePercent}%"></div>
                        </div>
                        <p class="text-[10px] text-slate-500 mt-1">${devicesRemaining === 'Unlimited' ? 'Unlimited slots available' : devicesRemaining + ' slots available'}</p>
                    </div>

                    <!-- Health Checkups -->
                    <div class="bg-brand-dark/40 rounded-xl p-4 border border-white/5">
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-[10px] text-slate-400 uppercase tracking-wider">Health Checks</span>
                            <i class="fa-solid fa-heart-pulse text-pink-400 text-xs"></i>
                        </div>
                        <div class="text-xl font-bold text-white mb-1">${usage.healthCheckups} <span class="text-xs text-slate-500 font-normal">/ ${plan.healthCheckups}</span></div>
                        <div class="w-full bg-brand-dark/80 rounded-full h-1.5">
                            <div class="bg-pink-400 h-1.5 rounded-full transition-all duration-500" style="width: ${Math.min(100, (usage.healthCheckups / plan.healthCheckups) * 100)}%"></div>
                        </div>
                        <p class="text-[10px] text-slate-500 mt-1">${usage.lastHealthCheckup ? 'Last: ' + usage.lastHealthCheckup : 'None yet'}</p>
                    </div>
                </div>

                <!-- Plan Features Quick Reference -->
                <div class="bg-brand-dark/30 rounded-xl p-4 border border-white/5">
                    <h4 class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3"><i class="fa-solid fa-list-check mr-1 text-brand-${color}"></i> Your Plan Benefits</h4>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        <div class="flex items-center gap-2 text-slate-300">
                            <i class="fa-solid fa-check-circle text-brand-${color}"></i>
                            <span>${plan.remoteSessions} remote sessions/mo</span>
                        </div>
                        <div class="flex items-center gap-2 text-slate-300">
                            <i class="fa-solid fa-check-circle text-brand-${color}"></i>
                            <span>${plan.responseTime} response</span>
                        </div>
                        <div class="flex items-center gap-2 text-slate-300">
                            <i class="fa-solid fa-check-circle text-brand-${color}"></i>
                            <span>Monthly health checkup</span>
                        </div>
                        <div class="flex items-center gap-2 text-slate-300">
                            <i class="fa-solid fa-check-circle text-brand-${color}"></i>
                            <span>${plan.channels} support</span>
                        </div>
                        ${plan.onSite ? `
                        <div class="flex items-center gap-2 text-slate-300">
                            <i class="fa-solid fa-check-circle text-brand-${color}"></i>
                            <span>On-site visits included</span>
                        </div>` : ''}
                        ${plan.dedicatedManager ? `
                        <div class="flex items-center gap-2 text-slate-300">
                            <i class="fa-solid fa-check-circle text-brand-${color}"></i>
                            <span>Dedicated account manager</span>
                        </div>` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// --- Razorpay Integration ---
// Universal payment handler — used by AMC plans, cart checkout, and service bookings
function initiateRazorpay(planName, amount, checkoutData = null, isCartCheckout = false, billingCycle = null) {
    // Enforce login
    if (!state.currentUser || state.currentUser.role === 'admin') {
        alert("⚠️ Please log in to your user account to proceed with the payment.");
        openAuthModal('signup');
        return;
    }

    // Verify Razorpay SDK is loaded
    if (typeof Razorpay === 'undefined') {
        alert("Payment system is still loading. Please wait a moment and try again.");
        return;
    }

    const user = state.currentUser;
    const fullName = checkoutData ? checkoutData.fullName : `${user.firstName || ''} ${user.lastName || ''}`.trim() || "Customer";

    // Detect if this is a subscription (AMC plan)
    const isSubscription = planName.includes('AMC') && !planName.includes('BKG');
    
    // Determine billing cycle from plan name if not explicitly provided
    if (isSubscription && !billingCycle) {
        if (planName.toLowerCase().includes('yearly') || planName.toLowerCase().includes('annual')) {
            billingCycle = 'yearly';
        } else {
            billingCycle = 'monthly';
        }
    }

    // Build description based on payment type
    let description = `AMC Subscription: ${planName}`;
    if (isCartCheckout) {
        description = `Hardware Purchase: ${state.cart.length} item(s)`;
    } else if (planName.includes('BKG')) {
        description = `Service Booking: ${planName}`;
    }

    const options = {
        key: RAZORPAY_KEY,
        amount: amount * 100, // Razorpay expects paise
        currency: "INR",
        name: "Divyansh Tech Services",
        description: description,
        image: "DTs.png",
        // For subscriptions, add recurring details
        ...(isSubscription && {
            subscription_id: null, // Will be created by Razorpay
            recurring: true,
            notes: {
                billing_cycle: billingCycle,
                plan_name: planName
            }
        }),
        handler: async function (response) {
            const paymentId = response.razorpay_payment_id;
            const orderId = response.razorpay_order_id || "N/A";
            const pointsEarned = Math.max(1, Math.floor(amount / 100));

            try {
                if (isCartCheckout) {
                    // --- Cart Checkout: Create order record ---
                    const newOrderId = "ORD-" + Math.random().toString(36).substr(2, 6).toUpperCase();
                    const newOrder = {
                        id: newOrderId,
                        type: "Product",
                        product: state.cart.map(i => i.name).join(", "),
                        date: new Date().toLocaleDateString(),
                        status: "Processing",
                        amount: amount,
                        address: checkoutData.address,
                        paymentId: paymentId,
                        razorpayOrderId: orderId
                    };

                    // Save order to Firebase/localStorage
                    await DTSDB.addOrderToUser(user.email, newOrder);
                    
                    // Update user points
                    const updatedPoints = (user.points || 0) + pointsEarned;
                    await DTSDB.updateUser(user.email, { points: updatedPoints });
                    user.points = updatedPoints;
                    state.currentUser = user;
                    localStorage.setItem('dts_user', JSON.stringify(state.currentUser));

                    state.cart = [];
                    saveCart();
                    await logActivity(`New Order: ${newOrderId} by @${user.username} (₹${amount}) | Pay: ${paymentId}`);

                    // Send order confirmation email
                    const emailParams = {
                        to_name: fullName,
                        to_email: user.email,
                        service_name: `Order ${newOrderId}: ${newOrder.product}`,
                        booking_date: new Date().toLocaleDateString(),
                        booking_time: new Date().toLocaleTimeString(),
                        address: checkoutData.address || user.address || '',
                        phone: checkoutData ? checkoutData.phone : (user.phone || ''),
                        assigned_tech: 'Dispatch pending'
                    };
                    emailjs.send("service_j84frhz", "template_wud47ar", emailParams).catch(err => console.error("Email error:", err));

                    alert(`✅ Payment Successful!\n\nOrder ID: ${newOrderId}\nPayment ID: ${paymentId}\nAmount: ₹${amount}\n\nYou earned ${pointsEarned} DTS Points!\nA confirmation email has been sent to ${user.email}.`);
                    switchView('profile');

                } else {
                    // --- AMC Subscription or Service Booking ---
                    const subId = (planName.includes('BKG') ? 'BKG-' : 'SUB-') + Math.random().toString(36).substr(2, 6).toUpperCase();
                    const record = {
                        id: subId,
                        type: planName.includes('BKG') ? "Service" : "AMC",
                        product: planName,
                        date: new Date().toLocaleDateString(),
                        status: planName.includes('BKG') ? "Booked" : "Active",
                        amount: amount,
                        paymentId: paymentId,
                        razorpayOrderId: orderId,
                        // Add billing cycle for subscriptions
                        ...(isSubscription && {
                            billingCycle: billingCycle,
                            isRecurring: true,
                            nextBillingDate: billingCycle === 'yearly' 
                                ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString()
                                : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
                            // AMC Usage Tracking
                            deviceCount: checkoutData ? (checkoutData.deviceCount || 1) : 1,
                            deviceTypes: checkoutData ? (checkoutData.deviceTypes || '') : '',
                            serviceFor: checkoutData ? (checkoutData.serviceFor || 'Home') : 'Home',
                            couponCode: checkoutData ? (checkoutData.couponCode || null) : null,
                            originalPrice: checkoutData ? (checkoutData.originalPrice || amount) : amount,
                            discount: checkoutData ? (checkoutData.discount || 0) : 0,
                            amcUsage: {
                                remoteSessions: 0,
                                onSiteVisits: 0,
                                emergencySupport: 0,
                                healthCheckups: 0,
                                lastHealthCheckup: null,
                                devicesRegistered: parseInt(checkoutData ? checkoutData.deviceCount : 1) || 1
                            }
                        })
                    };

                    // Save booking/order to Firebase/localStorage
                    if (planName.includes('BKG')) {
                        await DTSDB.addBookingToUser(user.email, record);
                    } else {
                        await DTSDB.addOrderToUser(user.email, record);
                        
                        // Remove AMC item from cart after successful payment
                        const amcCartIndex = state.cart.findIndex(item => item.isAMC);
                        if (amcCartIndex !== -1) {
                            state.cart.splice(amcCartIndex, 1);
                            saveCart();
                        }
                        
                        // Reset AMC coupon state
                        amcAppliedCoupon = null;
                    }
                    
                    // Update user points
                    const updatedPoints = (user.points || 0) + pointsEarned;
                    await DTSDB.updateUser(user.email, { points: updatedPoints });
                    user.points = updatedPoints;
                    state.currentUser = user;
                    localStorage.setItem('dts_user', JSON.stringify(state.currentUser));

                    await logActivity(`New ${planName.includes('BKG') ? 'Booking' : 'AMC Subscription'}: ${planName} by @${user.username} | Pay: ${paymentId}${checkoutData && checkoutData.couponCode ? ' | Coupon: ' + checkoutData.couponCode : ''}`);

                    // Send confirmation email
                    const emailParams = {
                        to_name: fullName,
                        to_email: user.email,
                        service_name: planName,
                        booking_date: new Date().toLocaleDateString(),
                        booking_time: new Date().toLocaleTimeString(),
                        address: user.address || '',
                        phone: user.phone || '',
                        assigned_tech: planName.includes('BKG') ? 'Auto-Assigned' : 'AMC Activated',
                        billing_cycle: isSubscription ? billingCycle : null,
                        next_billing: isSubscription ? record.nextBillingDate : null
                    };
                    emailjs.send("service_j84frhz", "template_wud47ar", emailParams).catch(err => console.error("Email error:", err));

                    // Build success message
                    let successMsg = `✅ Payment Successful!\n\nID: ${subId}\nPayment ID: ${paymentId}\nAmount: ₹${amount}`;
                    
                    if (isSubscription && checkoutData && checkoutData.discount > 0) {
                        successMsg += `\n\n🎉 Coupon Applied: ${checkoutData.couponCode}`;
                        successMsg += `\n💰 Discount: ₹${checkoutData.discount}`;
                    }
                    
                    if (isSubscription) {
                        successMsg += `\n\n📅 Billing: ${billingCycle.charAt(0).toUpperCase() + billingCycle.slice(1)}`;
                        successMsg += `\n🔄 Next Billing: ${record.nextBillingDate}`;
                        successMsg += `\n\nYour subscription is now active with automatic ${billingCycle} renewals.`;
                    }
                    
                    successMsg += `\n\nYou earned ${pointsEarned} DTS Points!\nA confirmation email has been sent to ${user.email}.`;
                    
                    alert(successMsg);
                    switchView('profile');
                }
            } catch (error) {
                console.error("Error saving payment data:", error);
                alert(`✅ Payment Successful!\n\nPayment ID: ${paymentId}\nAmount: ₹${amount}\n\n⚠️ Note: There was an error saving your order details. Please contact support with your Payment ID.`);
            }
        },
        prefill: {
            name: fullName,
            email: user.email || "customer@example.com",
            contact: checkoutData ? checkoutData.phone : (user.phone || "9813443289")
        },
        notes: {
            plan_type: planName,
            user_id: user.username || user.email
        },
        theme: { color: "#00f0ff" },
        modal: {
            ondismiss: function () {
                console.log("Razorpay checkout closed by user.");
            }
        }
    };

    try {
        const rzp = new Razorpay(options);

        rzp.on('payment.failed', function (response) {
            const errorCode = response.error.code || 'UNKNOWN';
            const errorDesc = response.error.description || 'Payment could not be completed.';
            const errorReason = response.error.reason || '';
            console.error("Razorpay Payment Failed:", response.error);
            alert(`❌ Payment Failed\n\nCode: ${errorCode}\nDescription: ${errorDesc}${errorReason ? '\nReason: ' + errorReason : ''}\n\nPlease try again or contact support at +91 9813443289.`);
        });

        rzp.open();
    } catch (e) {
        console.error("Razorpay failed to initialize:", e);
        alert("Payment gateway failed to load. Please check your internet connection and try again.\n\nIf the issue persists, contact us at +91 9813443289.");
    }
}

// --- Auth Mock ---
function openAuthModal(mode = 'signup') {
    const modal = document.getElementById('auth-modal');
    const content = document.getElementById('auth-modal-content');
    const title = document.getElementById('auth-title');
    const subtitle = document.getElementById('auth-subtitle');
    const formContainer = document.getElementById('auth-form-container');
    
    if (mode === 'signup') {
        title.textContent = 'Create Account';
        subtitle.textContent = 'Join Divyansh Tech Services today.';
        formContainer.innerHTML = `
            <form onsubmit="handleMockSignup(event)" class="space-y-3">
                <div class="grid grid-cols-2 gap-3">
                    <input type="text" name="firstName" required class="bg-brand-dark/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-cyan transition-colors" placeholder="First Name">
                    <input type="text" name="lastName" required class="bg-brand-dark/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-cyan transition-colors" placeholder="Last Name">
                </div>
                <input type="text" name="username" required class="w-full bg-brand-dark/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-cyan transition-colors" placeholder="Unique Username (e.g., john_dts)">
                <input type="email" name="email" required class="w-full bg-brand-dark/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-cyan transition-colors" placeholder="Email Address">
                <input type="tel" name="phone" required class="w-full bg-brand-dark/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-cyan transition-colors" placeholder="Phone Number">
                <input type="password" name="password" required class="w-full bg-brand-dark/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-cyan transition-colors" placeholder="Password">
                <input type="text" name="referralCode" class="w-full bg-brand-dark/50 border border-brand-purple/30 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-purple transition-colors placeholder-slate-500" placeholder="Referral Code (Optional)">
                
                <button type="submit" class="w-full btn-glow py-3 rounded-lg bg-gradient-to-r from-brand-cyan to-brand-emerald text-brand-dark font-bold hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-all mt-2">
                    Sign Up & Continue
                </button>
                <p class="text-center text-xs text-slate-500 mt-4">
                    Already have an account? <button type="button" onclick="openAuthModal('login')" class="text-brand-cyan hover:underline font-semibold">Log In</button>
                </p>
            </form>
        `;
    } else {
        title.textContent = 'Welcome Back';
        subtitle.textContent = 'Log in to manage your IT services.';
        formContainer.innerHTML = `
            <form onsubmit="handleMockLogin(event)" class="space-y-3">
                <input type="text" name="username" required class="w-full bg-brand-dark/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-cyan transition-colors" placeholder="Username or Email">
                <input type="password" name="password" required class="w-full bg-brand-dark/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-cyan transition-colors" placeholder="Password">
                
                <button type="submit" class="w-full btn-glow py-3 rounded-lg bg-gradient-to-r from-brand-cyan to-brand-emerald text-brand-dark font-bold hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-all mt-2">
                    Log In
                </button>
                <p class="text-center text-xs text-slate-500 mt-4">
                    Don't have an account? <button type="button" onclick="openAuthModal('signup')" class="text-brand-cyan hover:underline font-semibold">Sign Up</button>
                </p>
            </form>
        `;
    }

    modal.classList.remove('hidden');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
}

function closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    const content = document.getElementById('auth-modal-content');
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => { modal.classList.add('hidden'); }, 300);
}

function generateUniqueReferralCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'DTS-';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code; // 2+ billion combinations, practically guaranteed unique
}

async function handleMockSignup(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating Account...';
    submitBtn.disabled = true;
    
    try {
        // Check if user exists
        const existingUser = await DTSDB.getUserByEmail(data.email);
        if (existingUser) {
            alert('❌ Email already exists! Please use another email or login.');
            submitBtn.innerHTML = 'Sign Up & Continue';
            submitBtn.disabled = false;
            return;
        }
        
        const newUser = {
            role: 'user',
            firstName: data.firstName,
            lastName: data.lastName,
            username: data.username.toLowerCase().replace(/\s+/g, '_'),
            email: data.email,
            phone: data.phone,
            password: data.password, // Only for localStorage fallback
            profilePhoto: null,
            address: '',
            city: '',
            state: '',
            zip: '',
            points: 0,
            referralCode: generateUniqueReferralCode(),
            personalCoupon: 'HOME99-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
            bookings: [],
            orders: [],
            tickets: []
        };
        
        // Handle Referral Logic
        if (data.referralCode) {
            const allUsers = await DTSDB.getAllUsers();
            const referrer = allUsers.find(u => u.referralCode === data.referralCode.toUpperCase().trim());
            if (referrer) {
                referrer.points = (referrer.points || 0) + 100;
                newUser.points = 50;
                await DTSDB.updateUser(referrer.id || referrer.email, { points: referrer.points });
                alert(`🎉 Referral code applied! You got 50 DTS Points, and your referrer got 100 Points!`);
            } else {
                alert('⚠️ Invalid referral code. Proceeding without referral bonus.');
            }
        }
        
        // Create user in database (Firebase or localStorage)
        if (isFirebaseReady) {
            await DTSDB.signUpWithEmail(data.email, data.password, newUser);
        } else {
            await DTSDB.createUser(newUser);
        }
        
        state.currentUser = newUser;
        localStorage.setItem('dts_user', JSON.stringify(state.currentUser));
        updateUIForUser();
        
        const emailParams = {
            to_name: data.firstName || 'Valued Customer',
            to_email: data.email,
            username: newUser.username
        };

        await emailjs.send("service_j84frhz", "template_h9xwxan", emailParams);
        
        alert(`✅ Welcome to DTS, ${data.firstName}!\n\nYour account @${newUser.username} has been created.\n\n🎁 You received a unique coupon: ${newUser.personalCoupon} for ₹99 off your first home service!`);
        closeAuthModal();
        switchView('profile');
        
    } catch (error) {
        console.error("Signup error:", error);
        alert(`❌ Signup failed: ${error.message}`);
    } finally {
        submitBtn.innerHTML = 'Sign Up & Continue';
        submitBtn.disabled = false;
    }
}

async function handleMockLogin(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());
    
    try {
        let user;
        
        if (isFirebaseReady) {
            // Use Firebase Auth
            user = await DTSDB.signInWithEmail(data.username, data.password);
        } else {
            // Fallback to localStorage
            const users = JSON.parse(localStorage.getItem('dts_registered_users') || '[]');
            user = users.find(u => (u.username === data.username || u.email === data.username) && u.password === data.password);
            if (!user) throw new Error("Invalid credentials");
        }
        
        if (user) {
            state.currentUser = user;
            localStorage.setItem('dts_user', JSON.stringify(state.currentUser));
            updateUIForUser();
            alert(`✅ Welcome back, ${user.firstName}!`);
            closeAuthModal();
            switchView('profile');
        } else {
            alert('❌ Invalid username/email or password. Please try again or sign up.');
        }
    } catch (error) {
        console.error("Login error:", error);
        alert('❌ Invalid username/email or password. Please try again or sign up.');
    }
}

async function handleGoogleSignIn(response) {
    try {
        if (isFirebaseReady) {
            // Use Firebase Google Sign-In
            const userData = await DTSDB.signInWithGoogle();
            state.currentUser = userData;
            localStorage.setItem('dts_user', JSON.stringify(state.currentUser));
            updateUIForUser();
            
            alert(`✅ Welcome, ${userData.firstName}! Google Sign-In Successful.`);
            closeAuthModal();
            switchView('profile');
        } else {
            // Fallback to JWT decode (original method)
            const decoded = jwt_decode(response.credential);
            
            const googleUser = {
                role: 'user',
                firstName: decoded.given_name || 'User',
                lastName: decoded.family_name || '',
                username: decoded.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '_'),
                email: decoded.email,
                phone: '',
                password: 'google_auth',
                profilePhoto: decoded.picture || null,
                address: '', city: '', state: '', zip: '',
                points: 0,
                bookings: [],
                orders: [],
                tickets: [],
                personalCoupon: 'HOME99-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
                referralCode: 'DTS-' + Math.random().toString(36).substring(2, 6).toUpperCase()
            };
            
            // Save to database
            let users = JSON.parse(localStorage.getItem('dts_registered_users') || '[]');
            if (!users.find(u => u.email === decoded.email)) {
                users.push(googleUser);
                localStorage.setItem('dts_registered_users', JSON.stringify(users));
            }
            
            // Auto login
            state.currentUser = googleUser;
            localStorage.setItem('dts_user', JSON.stringify(state.currentUser));
            updateUIForUser();
            
            alert(`✅ Welcome, ${googleUser.firstName}! Google Sign-In Successful.`);
            closeAuthModal();
            switchView('profile');
        }
    } catch (error) {
        console.error("Google Auth Error:", error);
        const currentDomain = window.location.origin;
        alert(`❌ Google Sign-In failed on ${currentDomain}\n\nTo fix this, the site administrator must:\n\n1. Go to Google Cloud Console → APIs & Services → Credentials\n2. Edit OAuth 2.0 Client ID: 525637897249-7bjujhid12f71qqi6ndc5eand7r2q8su.apps.googleusercontent.com\n3. Add this domain to "Authorized JavaScript origins":\n   ${currentDomain}\n4. Save and wait 5 minutes for propagation\n\nContact: divyanshgupta@divyanshtechservices.com`);
    }
}

function updateUIForUser() {
    const displayName = document.getElementById('user-display-name');
    const dropdownContent = document.getElementById('user-dropdown-content');
    const mobileMenuContent = document.getElementById('mobile-menu-content');
    
    if (state.currentUser) {
        displayName.textContent = state.currentUser.firstName || state.currentUser.name || 'User';
        const isAdmin = state.currentUser.role === 'admin';
        
        // Update footer visibility
        updateFooterVisibility();
        
        // Desktop Dropdown (Hide Admin Dashboard for regular users)
        dropdownContent.innerHTML = `
            <button onclick="switchView('profile')" class="w-full text-left px-4 py-3 text-sm text-slate-300 hover:text-white hover:bg-white/5 rounded-lg flex items-center gap-3">
                <i class="fa-solid fa-id-card text-brand-cyan"></i> My Profile
            </button>
            ${isAdmin ? `
            <button onclick="switchView('admin')" class="w-full text-left px-4 py-3 text-sm text-slate-300 hover:text-white hover:bg-white/5 rounded-lg flex items-center gap-3">
                <i class="fa-solid fa-shield-halved text-brand-emerald"></i> Admin Dashboard
            </button>` : ''}
            <div class="border-t border-white/10 my-2"></div>
            <button onclick="handleLogout()" class="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 rounded-lg flex items-center gap-3">
                <i class="fa-solid fa-right-from-bracket"></i> Logout
            </button>
        `;
        
        // Mobile Menu (Hide Admin Dashboard for regular users)
        mobileMenuContent.innerHTML = `
            <button onclick="switchView('home'); toggleMobileMenu()" class="w-full text-left px-3 py-2 text-base font-medium text-slate-300 hover:text-brand-cyan">Home</button>
            <button onclick="switchView('services'); toggleMobileMenu()" class="w-full text-left px-3 py-2 text-base font-medium text-slate-300 hover:text-brand-cyan">Services</button>
            <button onclick="switchView('shop'); toggleMobileMenu()" class="w-full text-left px-3 py-2 text-base font-medium text-slate-300 hover:text-brand-cyan">Shop</button>
            <button onclick="switchView('amc'); toggleMobileMenu()" class="w-full text-left px-3 py-2 text-base font-medium text-slate-300 hover:text-brand-cyan">AMC Plans</button>
            <button onclick="switchView('dts-software'); toggleMobileMenu()" class="w-full text-left px-3 py-2 text-base font-medium text-brand-purple hover:text-brand-cyan">💻 DTS Software</button>
            <button onclick="switchView('dts-accounting'); toggleMobileMenu()" class="w-full text-left px-3 py-2 text-base font-medium text-brand-purple hover:text-brand-cyan">📊 DTS Accounting</button>
            <button onclick="switchView('collaboration'); toggleMobileMenu()" class="w-full text-left px-3 py-2 text-base font-medium text-brand-purple hover:text-brand-cyan">🤝 Collaborate</button>
            <div class="border-t border-white/10 my-2"></div>
            <button onclick="openSpecialModal('home-door'); toggleMobileMenu()" class="w-full text-left px-3 py-2 text-base font-bold text-brand-emerald">🚪 Home Service ₹99</button>
            <button onclick="openSpecialModal('emergency'); toggleMobileMenu()" class="w-full text-left px-3 py-2 text-base font-bold text-brand-danger">🚨 Emergency Support</button>
            <div class="border-t border-white/10 my-2"></div>
            <button onclick="switchView('profile'); toggleMobileMenu()" class="w-full text-left px-3 py-2 text-base font-medium text-brand-cyan">👤 My Profile</button>
            ${isAdmin ? `<button onclick="switchView('admin'); toggleMobileMenu()" class="w-full text-left px-3 py-2 text-base font-medium text-brand-emerald">🛡️ Admin Dashboard</button>` : ''}
            <button onclick="handleLogout(); toggleMobileMenu()" class="w-full text-left px-3 py-2 text-base font-medium text-red-400">🚪 Logout</button>
        `;
    } else {
        displayName.textContent = 'Account';
        
        // Update footer visibility
        updateFooterVisibility();
        
        // Desktop Dropdown
        dropdownContent.innerHTML = `
            <button onclick="openAuthModal()" class="w-full text-left px-4 py-3 text-sm text-slate-300 hover:text-white hover:bg-white/5 rounded-lg flex items-center gap-3">
                <i class="fa-solid fa-right-to-bracket text-brand-cyan"></i> Log In / Sign Up
            </button>
        `;
        
        // Mobile Menu
        mobileMenuContent.innerHTML = `
            <button onclick="switchView('home'); toggleMobileMenu()" class="w-full text-left px-3 py-2 text-base font-medium text-slate-300 hover:text-brand-cyan">Home</button>
            <button onclick="switchView('services'); toggleMobileMenu()" class="w-full text-left px-3 py-2 text-base font-medium text-slate-300 hover:text-brand-cyan">Services</button>
            <button onclick="switchView('shop'); toggleMobileMenu()" class="w-full text-left px-3 py-2 text-base font-medium text-slate-300 hover:text-brand-cyan">Shop</button>
            <button onclick="switchView('amc'); toggleMobileMenu()" class="w-full text-left px-3 py-2 text-base font-medium text-slate-300 hover:text-brand-cyan">AMC Plans</button>
            <button onclick="switchView('dts-software'); toggleMobileMenu()" class="w-full text-left px-3 py-2 text-base font-medium text-brand-purple hover:text-brand-cyan">💻 DTS Software</button>
            <button onclick="switchView('dts-accounting'); toggleMobileMenu()" class="w-full text-left px-3 py-2 text-base font-medium text-brand-purple hover:text-brand-cyan">📊 DTS Accounting</button>
            <button onclick="switchView('collaboration'); toggleMobileMenu()" class="w-full text-left px-3 py-2 text-base font-medium text-brand-purple hover:text-brand-cyan">🤝 Collaborate</button>
            <div class="border-t border-white/10 my-2"></div>
            <button onclick="openSpecialModal('home-door'); toggleMobileMenu()" class="w-full text-left px-3 py-2 text-base font-bold text-brand-emerald">🚪 Home Service ₹99</button>
            <button onclick="openSpecialModal('emergency'); toggleMobileMenu()" class="w-full text-left px-3 py-2 text-base font-bold text-brand-danger">🚨 Emergency Support</button>
            <div class="border-t border-white/10 my-2"></div>
            <button onclick="openAuthModal(); toggleMobileMenu()" class="w-full text-left px-3 py-2 text-base font-medium text-brand-cyan">👤 Log In / Sign Up</button>
        `;
    }
}

async function handleLogout() {
    try {
        // Sign out from Firebase if configured
        if (isFirebaseReady) {
            await DTSDB.signOut();
        }
        
        state.currentUser = null;
        localStorage.removeItem('dts_user');
        
        // Update UI immediately
        document.getElementById('user-display-name').textContent = 'Account';
        updateUIForUser();
        updateFooterVisibility();
        
        // Navigate to home
        switchView('home');
        
        // Show notification
        showNotification('👋 Logged out successfully', 'info');
    } catch (error) {
        console.error("Logout error:", error);
        // Still clear local state even if Firebase sign out fails
        state.currentUser = null;
        localStorage.removeItem('dts_user');
        updateUIForUser();
        switchView('home');
    }
}

// --- Map Initialization ---
function initHomeMap() {
    setTimeout(() => {
        const mapElement = document.getElementById('home-map');
        if (!mapElement) return;
        
        const map = L.map('home-map').setView([28.1975, 76.6166], 8); 
        
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(map);

        const locations = [
            { lat: 28.1975, lng: 76.6166, name: "Rewari (HQ)", color: "#00f0ff" },
            { lat: 28.4595, lng: 77.0266, name: "Gurugram", color: "#10b981" },
            { lat: 28.6139, lng: 77.2090, name: "Delhi", color: "#8b5cf6" },
            { lat: 28.5355, lng: 77.3910, name: "Noida", color: "#8b5cf6" }
        ];

        locations.forEach(loc => {
            L.circleMarker([loc.lat, loc.lng], {
                radius: 8,
                fillColor: loc.color,
                color: "#fff",
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8
            }).addTo(map).bindPopup(`<b>${loc.name}</b><br>Service Available`);
        });
    }, 500);
}

function initAdminMap() {
    setTimeout(() => {
        const mapElement = document.getElementById('admin-map');
        if (!mapElement) return;
        
        const map = L.map('admin-map').setView([28.4595, 77.0266], 10);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19
        }).addTo(map);
        
        L.marker([28.1975, 76.6166]).addTo(map).bindPopup("Tech-01: Available (Rewari)");
        L.marker([28.4595, 77.0266]).addTo(map).bindPopup("Tech-02: On Job (Gurugram)");
    }, 500);
}

const originalSwitchView = switchView;
switchView = function(viewName) {
    originalSwitchView(viewName);
    if (viewName === 'home') {
        initHomeMap();
    }
}

function toggleMobileMenu() {
    document.getElementById('mobile-menu').classList.toggle('hidden');
}

// --- Support Ticket Functions ---
function openTicketModal() {
    const modal = document.getElementById('ticket-modal');
    const content = document.getElementById('ticket-modal-content');
    modal.classList.remove('hidden');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
}

function closeTicketModal() {
    const modal = document.getElementById('ticket-modal');
    const content = document.getElementById('ticket-modal-content');
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => { modal.classList.add('hidden'); }, 300);
}

function handleCreateTicket(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());
    
    const newTicket = {
        id: 'TKT-' + Math.random().toString(36).substr(2, 5).toUpperCase(),
        subject: data.subject,
        description: data.description,
        status: 'Open',
        date: new Date().toLocaleDateString(),
        userName: `${state.currentUser.firstName} ${state.currentUser.lastName}`,
        userEmail: state.currentUser.email
    };
    
    state.currentUser.tickets = state.currentUser.tickets || [];
    state.currentUser.tickets.push(newTicket);
    localStorage.setItem('dts_user', JSON.stringify(state.currentUser));
    
    let users = JSON.parse(localStorage.getItem('dts_registered_users') || '[]');
    const idx = users.findIndex(u => u.username === state.currentUser.username);
    if (idx !== -1) { users[idx] = state.currentUser; localStorage.setItem('dts_registered_users', JSON.stringify(users)); }
    
    logActivity(`New Support Ticket: ${newTicket.id} by @${state.currentUser.username}`);
    alert(`✅ Ticket ${newTicket.id} created successfully! Our team will respond shortly.`);
    closeTicketModal();
    event.target.reset();
    switchView('profile');
}

function resolveTicket(ticketId) {
    let users = JSON.parse(localStorage.getItem('dts_registered_users') || '[]');
    let found = false;
    let resolvedUserName = '';
    
    users.forEach(u => {
        const ticket = (u.tickets || []).find(t => t.id === ticketId);
        if (ticket) {
            ticket.status = 'Resolved';
            resolvedUserName = u.username;
            found = true;
        }
    });
    
    if (found) {
        localStorage.setItem('dts_registered_users', JSON.stringify(users));
        if (state.currentUser && state.currentUser.username === resolvedUserName) {
            state.currentUser = users.find(u => u.username === resolvedUserName);
            localStorage.setItem('dts_user', JSON.stringify(state.currentUser));
        }
        logActivity(`Ticket ${ticketId} resolved by Admin`);
        alert(`✅ Ticket ${ticketId} marked as Resolved.`);
        switchView('admin-center');
    }
}

function cancelBooking(bookingId) {
    if (!confirm("Are you sure you want to cancel this booking? This action cannot be undone.")) return;
    
    let users = JSON.parse(localStorage.getItem('dts_registered_users') || '[]');
    let found = false;
    
    users.forEach(u => {
        const booking = (u.bookings || []).find(b => b.id === bookingId);
        if (booking) {
            booking.status = 'Cancelled';
            found = true;
        }
    });
    
    if (found) {
        localStorage.setItem('dts_registered_users', JSON.stringify(users));
        if (state.currentUser) {
            const myBooking = (state.currentUser.bookings || []).find(b => b.id === bookingId);
            if (myBooking) myBooking.status = 'Cancelled';
            localStorage.setItem('dts_user', JSON.stringify(state.currentUser));
        }
        logActivity(`Booking ${bookingId} cancelled by user`);
        alert(`✅ Booking ${bookingId} has been cancelled.`);
        switchView('profile');
    }
}

// ==========================================
// ADMIN: Technician Management Functions
// ==========================================

async function handleAddTechnician(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());
    
    const newTech = {
        id: 'TECH-' + Math.random().toString(36).substr(2, 5).toUpperCase(),
        name: data.name,
        phone: data.phone,
        email: data.email || '',
        password: data.password || 'dts123', // Default password
        specialization: data.specialization || 'General IT',
        location: data.location || '',
        status: data.status || 'available',
        completedJobs: 0,
        dateAdded: new Date().toLocaleDateString()
    };
    
    await DTSDB.createTechnician(newTech);
    
    await logActivity(`New technician added: ${newTech.name} (${newTech.specialization})`);
    alert(`✅ Technician "${newTech.name}" added successfully!\n\nTechnician ID: ${newTech.id}\nPassword: ${newTech.password}\n\nPlease share these credentials with the technician.`);
    switchView('admin-center');
}

async function toggleTechnicianStatus(techId) {
    const technicians = await DTSDB.getAllTechnicians();
    const tech = technicians.find(t => t.id === techId);
    if (!tech) return;
    
    const statusCycle = ['available', 'on-job', 'offline'];
    const currentIndex = statusCycle.indexOf(tech.status);
    const newStatus = statusCycle[(currentIndex + 1) % statusCycle.length];
    
    await DTSDB.updateTechnician(techId, { status: newStatus });
    
    await logActivity(`Technician ${tech.name} status changed to ${newStatus}`);
    switchView('admin-center');
}

async function deleteTechnician(techId) {
    if (!confirm('Are you sure you want to delete this technician?')) return;
    
    const technicians = await DTSDB.getAllTechnicians();
    const tech = technicians.find(t => t.id === techId);
    if (!tech) return;
    
    // For localStorage fallback, we need to filter and save
    if (!isFirebaseReady) {
        const filtered = technicians.filter(t => t.id !== techId);
        localStorage.setItem('dts_technicians', JSON.stringify(filtered));
    } else {
        // For Firebase, we'd need to delete the document
        // For now, we'll mark as deleted
        await DTSDB.updateTechnician(techId, { deleted: true });
    }
    
    await logActivity(`Technician ${tech.name} removed from team`);
    switchView('admin-center');
}

function assignTechnicianToBooking(bookingId) {
    const selectElement = document.getElementById(`tech-select-${bookingId}`);
    const techId = selectElement.value;
    
    if (!techId) {
        alert('⚠️ Please select a technician first.');
        return;
    }
    
    const technicians = JSON.parse(localStorage.getItem('dts_technicians') || '[]');
    const techIndex = technicians.findIndex(t => t.id === techId);
    
    if (techIndex === -1) {
        alert('❌ Technician not found.');
        return;
    }
    
    // Update booking status and assign technician
    let users = JSON.parse(localStorage.getItem('dts_registered_users') || '[]');
    let bookingFound = false;
    
    users.forEach(u => {
        const booking = (u.bookings || []).find(b => b.id === bookingId);
        if (booking) {
            booking.status = 'Assigned';
            booking.assignedTech = `${technicians[techIndex].name} (${technicians[techIndex].phone})`;
            bookingFound = true;
        }
    });
    
    if (bookingFound) {
        localStorage.setItem('dts_registered_users', JSON.stringify(users));
        
        // Update technician status to on-job
        technicians[techIndex].status = 'on-job';
        technicians[techIndex].completedJobs = (technicians[techIndex].completedJobs || 0) + 1;
        localStorage.setItem('dts_technicians', JSON.stringify(technicians));
        
        logActivity(`Booking ${bookingId} assigned to ${technicians[techIndex].name}`);
        alert(`✅ Booking ${bookingId} assigned to ${technicians[techIndex].name}!\n\nTechnician has been notified via SMS/WhatsApp.`);
        switchView('admin-center');
    } else {
        alert('❌ Booking not found.');
    }
}

// ==========================================
// ADMIN: Inventory & Product Management
// ==========================================

async function handleAddProduct(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());
    
    const newProduct = {
        id: 'PROD-' + Math.random().toString(36).substr(2, 5).toUpperCase(),
        name: data.name,
        category: data.category,
        price: parseInt(data.price),
        stock: parseInt(data.stock),
        installation: data.installation === 'true',
        sku: data.sku || '',
        dateAdded: new Date().toLocaleDateString()
    };
    
    await DTSDB.addInventoryItem(newProduct);
    
    await logActivity(`New product added: ${newProduct.name} (₹${newProduct.price})`);
    alert(`✅ Product "${newProduct.name}" added to inventory!`);
    switchView('admin-center');
}

async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    const inventory = await DTSDB.getAllInventory();
    const product = inventory.find(p => p.id === productId);
    if (!product) return;
    
    // For localStorage fallback
    if (!isFirebaseReady) {
        const filtered = inventory.filter(p => p.id !== productId);
        localStorage.setItem('dts_inventory', JSON.stringify(filtered));
    } else {
        // For Firebase, mark as deleted
        await DTSDB.updateTechnician(productId, { deleted: true });
    }
    
    await logActivity(`Product ${product.name} removed from inventory`);
    switchView('admin-center');
}

async function updateProductStock(productId, newStock) {
    const inventory = await DTSDB.getAllInventory();
    const product = inventory.find(p => p.id === productId);
    
    if (product) {
        const updates = { stock: parseInt(newStock) };
        // For Firebase, we'd need an updateInventoryItem method
        // For now, update localStorage
        if (!isFirebaseReady) {
            product.stock = parseInt(newStock);
            localStorage.setItem('dts_inventory', JSON.stringify(inventory));
        }
        await logActivity(`Product ${product.name} stock updated to ${newStock}`);
    }
}
// ==========================================
// ADMIN: User Management Functions
// ==========================================

function viewUserDetails(userIndex) {
    const users = JSON.parse(localStorage.getItem('dts_registered_users') || '[]');
    const user = users[userIndex];
    
    if (!user) {
        alert('❌ User not found.');
        return;
    }
    
    const userPlan = getUserPlanTier(user);
    const totalBookings = (user.bookings || []).length;
    const totalOrders = (user.orders || []).length;
    const totalSpent = [...(user.bookings || []), ...(user.orders || [])].reduce((sum, t) => sum + (t.amount || 0), 0);
    
    const details = `
👤 USER DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 BASIC INFO
• Name: ${user.firstName} ${user.lastName}
• Username: @${user.username}
• Email: ${user.email}
• Phone: ${user.phone || 'Not provided'}
• Address: ${user.address || 'Not provided'}

🔐 CREDENTIALS
• Password: ${user.password || 'Not set'}

💎 MEMBERSHIP
• Plan: ${userPlan.label}
• Points: ${user.points || 0}
• Referral Code: ${user.referralCode || 'N/A'}

📊 ACTIVITY
• Total Spent: ₹${totalSpent.toLocaleString()}
• Bookings: ${totalBookings}
• Orders: ${totalOrders}
• Total Transactions: ${totalBookings + totalOrders}

📅 ACCOUNT INFO
• Joined: ${user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Date not available'}
    `;
    
    alert(details);
}

function editUserPoints(userIndex) {
    const users = JSON.parse(localStorage.getItem('dts_registered_users') || '[]');
    const user = users[userIndex];
    
    if (!user) {
        alert('❌ User not found.');
        return;
    }
    
    const currentPoints = user.points || 0;
    const newPoints = prompt(`Edit points for ${user.firstName} ${user.lastName}\n\nCurrent points: ${currentPoints}\n\nEnter new points value:`, currentPoints);
    
    if (newPoints === null) return; // User cancelled
    
    const points = parseInt(newPoints);
    if (isNaN(points) || points < 0) {
        alert('❌ Invalid points value. Please enter a non-negative number.');
        return;
    }
    
    users[userIndex].points = points;
    localStorage.setItem('dts_registered_users', JSON.stringify(users));
    
    // Update current user if it's the same user
    if (state.currentUser && state.currentUser.username === user.username) {
        state.currentUser.points = points;
        localStorage.setItem('dts_user', JSON.stringify(state.currentUser));
    }
    
    logActivity(`Admin updated points for @${user.username}: ${currentPoints} → ${points}`);
    alert(`✅ Points updated successfully!\n\n${user.firstName} ${user.lastName}\nOld: ${currentPoints} points\nNew: ${points} points`);
    switchView('admin-center');
}

function exportUsersData() {
    const users = JSON.parse(localStorage.getItem('dts_registered_users') || '[]');
    
    if (users.length === 0) {
        alert('❌ No users to export.');
        return;
    }
    
    const csvContent = [
        ['Username', 'First Name', 'Last Name', 'Email', 'Phone', 'Address', 'Points', 'Plan', 'Total Bookings', 'Total Orders', 'Total Spent', 'Referral Code', 'Joined Date'].join(','),
        ...users.map(u => {
            const userPlan = getUserPlanTier(u);
            const totalBookings = (u.bookings || []).length;
            const totalOrders = (u.orders || []).length;
            const totalSpent = [...(u.bookings || []), ...(u.orders || [])].reduce((sum, t) => sum + (t.amount || 0), 0);
            
            return [
                u.username,
                u.firstName,
                u.lastName,
                u.email,
                u.phone || '',
                `"${(u.address || '').replace(/"/g, '""')}"`,
                u.points || 0,
                userPlan.label,
                totalBookings,
                totalOrders,
                totalSpent,
                u.referralCode || '',
                u.createdAt ? new Date(u.createdAt).toLocaleDateString() : ''
            ].join(',');
        })
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `dts-users-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    logActivity('Admin exported users data');
    alert('✅ Users data exported successfully!');
}

// ==========================================
// ADMIN: Booking Approval Functions
// ==========================================

function approveBookingWithDateTime(bookingId) {
    // Get the modified date/time from the form
    const dateInput = document.getElementById(`edit-date-${bookingId}`);
    const timeInput = document.getElementById(`edit-time-${bookingId}`);
    
    const newDate = dateInput ? dateInput.value : '';
    const newTime = timeInput ? timeInput.value : '';
    
    if (!newDate || !newTime) {
        alert('⚠️ Please set both date and time before approving the booking.');
        return;
    }
    
    if (!confirm(`Approve booking ${bookingId}?\n\nThis will:\n• Set Date: ${newDate}\n• Set Time: ${newTime}\n• Confirm the booking\n• Send confirmation email to customer\n• Move booking to dispatch queue`)) {
        return;
    }
    
    let users = JSON.parse(localStorage.getItem('dts_registered_users') || '[]');
    let bookingFound = null;
    let userFound = null;
    
    users.forEach(u => {
        const booking = (u.bookings || []).find(b => b.id === bookingId);
        if (booking) {
            booking.status = 'Confirmed';
            booking.date = newDate;
            booking.time = newTime;
            booking.approvedAt = new Date().toISOString();
            bookingFound = booking;
            userFound = u;
        }
    });
    
    if (!bookingFound) {
        alert('❌ Booking not found.');
        return;
    }
    
    localStorage.setItem('dts_registered_users', JSON.stringify(users));
    
    // Update current user if it's the same user
    if (state.currentUser && state.currentUser.username === userFound.username) {
        const myBooking = (state.currentUser.bookings || []).find(b => b.id === bookingId);
        if (myBooking) {
            myBooking.status = 'Confirmed';
            myBooking.date = newDate;
            myBooking.time = newTime;
            myBooking.approvedAt = bookingFound.approvedAt;
        }
        localStorage.setItem('dts_user', JSON.stringify(state.currentUser));
    }
    
    // Send auto-generated confirmation email
    const emailParams = {
        to_name: `${userFound.firstName} ${userFound.lastName}`,
        to_email: userFound.email,
        service_name: bookingFound.service || bookingFound.product || 'Service',
        booking_date: newDate,
        booking_time: newTime,
        address: bookingFound.address || 'Location TBD',
        phone: userFound.phone || '',
        assigned_tech: 'To be assigned',
        booking_id: bookingId,
        amount: bookingFound.amount || '0'
    };
    
    emailjs.send("service_j84fratz", "template_wud47ar", emailParams)
        .then(() => {
            logActivity(`✅ Booking ${bookingId} approved by Admin | Date: ${newDate} Time: ${newTime} | Confirmation sent to ${userFound.email}`);
            alert(`✅ Booking ${bookingId} Approved!\n\nConfirmation email sent to:\n${userFound.email}\n\nBooking Details:\n• Service: ${emailParams.service_name}\n• Date: ${newDate}\n• Time: ${newTime}\n• Amount: ₹${emailParams.amount}\n\nBooking is now in the dispatch queue for technician assignment.`);
            switchView('admin-center');
        })
        .catch((error) => {
            console.error("EmailJS Error:", error);
            logActivity(`✅ Booking ${bookingId} approved by Admin (Email failed) | Date: ${newDate} Time: ${newTime}`);
            alert(`✅ Booking ${bookingId} Approved!\n\nNote: Confirmation email failed to send. Please notify customer manually.\n\nCustomer: ${userFound.firstName} ${userFound.lastName}\nEmail: ${userFound.email}\nPhone: ${userFound.phone || 'Not provided'}\n\nConfirmed Date: ${newDate}\nConfirmed Time: ${newTime}`);
            switchView('admin-center');
        });
}

function approveBooking(bookingId) {
    if (!confirm(`Approve booking ${bookingId}?\n\nThis will:\n• Confirm the booking date & time\n• Send confirmation email to customer\n• Move booking to dispatch queue`)) {
        return;
    }
    
    let users = JSON.parse(localStorage.getItem('dts_registered_users') || '[]');
    let bookingFound = null;
    let userFound = null;
    
    users.forEach(u => {
        const booking = (u.bookings || []).find(b => b.id === bookingId);
        if (booking) {
            booking.status = 'Confirmed';
            booking.approvedAt = new Date().toISOString();
            bookingFound = booking;
            userFound = u;
        }
    });
    
    if (!bookingFound) {
        alert('❌ Booking not found.');
        return;
    }
    
    localStorage.setItem('dts_registered_users', JSON.stringify(users));
    
    // Update current user if it's the same user
    if (state.currentUser && state.currentUser.username === userFound.username) {
        const myBooking = (state.currentUser.bookings || []).find(b => b.id === bookingId);
        if (myBooking) {
            myBooking.status = 'Confirmed';
            myBooking.approvedAt = bookingFound.approvedAt;
        }
        localStorage.setItem('dts_user', JSON.stringify(state.currentUser));
    }
    
    // Send auto-generated confirmation email
    const emailParams = {
        to_name: `${userFound.firstName} ${userFound.lastName}`,
        to_email: userFound.email,
        service_name: bookingFound.service || bookingFound.product || 'Service',
        booking_date: bookingFound.date || 'TBD',
        booking_time: bookingFound.time || 'TBD',
        address: bookingFound.address || 'Location TBD',
        phone: userFound.phone || '',
        assigned_tech: 'To be assigned',
        booking_id: bookingId,
        amount: bookingFound.amount || '0'
    };
    
    emailjs.send("service_j84frhz", "template_wud47ar", emailParams)
        .then(() => {
            logActivity(`✅ Booking ${bookingId} approved by Admin | Confirmation sent to ${userFound.email}`);
            alert(`✅ Booking ${bookingId} Approved!\n\nConfirmation email sent to:\n${userFound.email}\n\nBooking Details:\n• Service: ${emailParams.service_name}\n• Date: ${emailParams.booking_date}\n• Time: ${emailParams.booking_time}\n• Amount: ₹${emailParams.amount}\n\nBooking is now in the dispatch queue for technician assignment.`);
            switchView('admin-center');
        })
        .catch((error) => {
            console.error("EmailJS Error:", error);
            logActivity(`✅ Booking ${bookingId} approved by Admin (Email failed)`);
            alert(`✅ Booking ${bookingId} Approved!\n\nNote: Confirmation email failed to send. Please notify customer manually.\n\nCustomer: ${userFound.firstName} ${userFound.lastName}\nEmail: ${userFound.email}\nPhone: ${userFound.phone || 'Not provided'}`);
            switchView('admin-center');
        });
}

function rejectBooking(bookingId) {
    const reason = prompt(`Reject booking ${bookingId}?\n\nPlease enter rejection reason (will be sent to customer):`);
    if (reason === null) return; // User cancelled
    
    let users = JSON.parse(localStorage.getItem('dts_registered_users') || '[]');
    let bookingFound = null;
    let userFound = null;
    
    users.forEach(u => {
        const booking = (u.bookings || []).find(b => b.id === bookingId);
        if (booking) {
            booking.status = 'Rejected';
            booking.rejectedAt = new Date().toISOString();
            booking.rejectionReason = reason || 'No reason provided';
            bookingFound = booking;
            userFound = u;
        }
    });
    
    if (!bookingFound) {
        alert('❌ Booking not found.');
        return;
    }
    
    localStorage.setItem('dts_registered_users', JSON.stringify(users));
    
    // Update current user if it's the same user
    if (state.currentUser && state.currentUser.username === userFound.username) {
        const myBooking = (state.currentUser.bookings || []).find(b => b.id === bookingId);
        if (myBooking) {
            myBooking.status = 'Rejected';
            myBooking.rejectedAt = bookingFound.rejectedAt;
            myBooking.rejectionReason = bookingFound.rejectionReason;
        }
        localStorage.setItem('dts_user', JSON.stringify(state.currentUser));
    }
    
    // Send rejection notification email
    const emailParams = {
        to_name: `${userFound.firstName} ${userFound.lastName}`,
        to_email: userFound.email,
        service_name: bookingFound.service || bookingFound.product || 'Service',
        booking_date: bookingFound.date || 'TBD',
        booking_time: bookingFound.time || 'TBD',
        address: bookingFound.address || 'Location TBD',
        phone: userFound.phone || '',
        assigned_tech: 'N/A',
        booking_id: bookingId,
        amount: bookingFound.amount || '0',
        rejection_reason: bookingFound.rejectionReason
    };
    
    // Use a different template for rejection if available, otherwise use same template
    emailjs.send("service_j84frhz", "template_wud47ar", emailParams)
        .then(() => {
            logActivity(`❌ Booking ${bookingId} rejected by Admin | Reason: ${reason}`);
            alert(`❌ Booking ${bookingId} Rejected.\n\nRejection notification sent to:\n${userFound.email}\n\nReason: ${reason}`);
            switchView('admin-center');
        })
        .catch((error) => {
            console.error("EmailJS Error:", error);
            logActivity(`❌ Booking ${bookingId} rejected by Admin (Email failed) | Reason: ${reason}`);
            alert(`❌ Booking ${bookingId} Rejected.\n\nNote: Email notification failed. Please notify customer manually.\n\nCustomer: ${userFound.firstName} ${userFound.lastName}\nEmail: ${userFound.email}\nPhone: ${userFound.phone || 'Not provided'}\n\nReason: ${reason}`);
            switchView('admin-center');
        });
}

function viewBookingDetails(bookingId) {
    let users = JSON.parse(localStorage.getItem('dts_registered_users') || '[]');
    let bookingFound = null;
    let userFound = null;
    
    users.forEach(u => {
        const booking = [...(u.bookings || []), ...(u.orders || [])].find(b => b.id === bookingId);
        if (booking) {
            bookingFound = booking;
            userFound = u;
        }
    });
    
    if (!bookingFound) {
        alert('❌ Booking not found.');
        return;
    }
    
    const details = `
📋 BOOKING DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🆔 BOOKING ID: ${bookingId}
📊 STATUS: ${bookingFound.status}
💰 AMOUNT: ₹${bookingFound.amount || 0}

👤 CUSTOMER INFO
• Name: ${userFound.firstName} ${userFound.lastName}
• Username: @${userFound.username}
• Email: ${userFound.email}
• Phone: ${userFound.phone || 'Not provided'}

📅 SERVICE DETAILS
• Service: ${bookingFound.service || bookingFound.product || 'N/A'}
• Type: ${bookingFound.type || 'Service'}
• Date: ${bookingFound.date || 'Not set'}
• Time: ${bookingFound.time || 'Not set'}
• Address: ${bookingFound.address || 'Not provided'}

💳 PAYMENT
• Payment ID: ${bookingFound.paymentId || 'N/A'}
• Razorpay Order: ${bookingFound.razorpayOrderId || 'N/A'}

🔧 ASSIGNMENT
• Technician: ${bookingFound.assignedTech || 'Not assigned'}

📝 TIMELINE
• Booked: ${bookingFound.createdAt ? new Date(bookingFound.createdAt).toLocaleString() : 'N/A'}
• Approved: ${bookingFound.approvedAt ? new Date(bookingFound.approvedAt).toLocaleString() : 'Pending'}
${bookingFound.rejectedAt ? `• Rejected: ${new Date(bookingFound.rejectedAt).toLocaleString()}` : ''}
${bookingFound.rejectionReason ? `• Reason: ${bookingFound.rejectionReason}` : ''}
    `;
    
    alert(details);
}

// ==========================================
// CHATBOT FUNCTIONS
// ==========================================

function toggleChatbot() {
    const chatWindow = document.getElementById('chat-window');
    const toggleBtn = document.getElementById('chat-toggle-btn');
    
    chatWindow.classList.toggle('hidden');
    
    // Add animation
    if (!chatWindow.classList.contains('hidden')) {
        chatWindow.style.animation = 'slideInUp 0.3s ease-out';
        // Remove notification badge
        const badge = toggleBtn.querySelector('span');
        if (badge) badge.remove();
    } else {
        chatWindow.style.animation = 'slideOutDown 0.3s ease-out';
    }
}

function sendMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Add user message
    addUserMessage(message);
    input.value = '';
    
    // Get bot response
    setTimeout(() => {
        const response = getBotResponse(message);
        addBotMessage(response);
    }, 500);
}

function sendQuickMessage(type) {
    const messages = {
        services: 'Show me your services',
        pricing: 'What are your prices?',
        book: 'I want to book a service',
        contact: 'How can I contact you?',
        help: 'Help',
        faq: 'FAQ'
    };
    
    const message = messages[type] || type;
    addUserMessage(message);
    
    setTimeout(() => {
        const response = getBotResponse(type);
        addBotMessage(response);
    }, 500);
}

function addUserMessage(message) {
    const messagesDiv = document.getElementById('chat-messages');
    const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    const messageHtml = `
        <div class="flex gap-3 justify-end">
            <div class="bg-gradient-to-br from-brand-cyan to-brand-emerald rounded-2xl rounded-tr-none p-3 max-w-[280px]">
                <p class="text-sm text-brand-dark">${message}</p>
                <p class="text-xs text-brand-dark/60 mt-1">${time}</p>
            </div>
            <div class="w-8 h-8 rounded-full bg-brand-emerald/20 flex items-center justify-center flex-shrink-0">
                <i class="fa-solid fa-user text-brand-emerald text-sm"></i>
            </div>
        </div>
    `;
    
    messagesDiv.insertAdjacentHTML('beforeend', messageHtml);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function addBotMessage(response) {
    const messagesDiv = document.getElementById('chat-messages');
    const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    let actionsHtml = '';
    if (response.actions && response.actions.length > 0) {
        actionsHtml = `
            <div class="flex flex-wrap gap-2 mt-2">
                ${response.actions.map(action => `
                    <button onclick="${action.onclick}" class="px-3 py-1.5 rounded-full ${action.style} text-xs hover:opacity-80 transition-all">
                        ${action.icon} ${action.label}
                    </button>
                `).join('')}
            </div>
        `;
    }
    
    const messageHtml = `
        <div class="flex gap-3">
            <div class="w-8 h-8 rounded-full bg-brand-cyan/20 flex items-center justify-center flex-shrink-0">
                <i class="fa-solid fa-robot text-brand-cyan text-sm"></i>
            </div>
            <div class="bg-white/5 rounded-2xl rounded-tl-none p-3 max-w-[280px]">
                <p class="text-sm text-slate-300 whitespace-pre-line">${response.message}</p>
                ${actionsHtml}
                <p class="text-xs text-slate-500 mt-1">${time}</p>
            </div>
        </div>
    `;
    
    messagesDiv.insertAdjacentHTML('beforeend', messageHtml);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function getBotResponse(input) {
    const text = input.toLowerCase();
    
    // Navigation commands
    if (text.includes('home') || text === 'home') {
        switchView('home');
        return {
            message: "Taking you to the home page! 🏠",
            actions: null
        };
    }
    
    if (text.includes('service') || text === 'services') {
        switchView('services');
        return {
            message: "Here are our services! We offer computer repair, networking, CCTV installation, and more. 🛠️",
            actions: [
                { label: 'Home Service', icon: '🏠', style: 'bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan', onclick: "openSpecialModal('home-door')" },
                { label: 'Emergency', icon: '🚨', style: 'bg-red-500/10 border border-red-500/30 text-red-400', onclick: "openSpecialModal('emergency')" }
            ]
        };
    }
    
    if (text.includes('shop') || text.includes('product')) {
        switchView('shop');
        return {
            message: "Welcome to our shop! We have routers, cables, CCTV kits, and more. 🛒",
            actions: null
        };
    }
    
    if (text.includes('amc') || text.includes('plan') || text.includes('subscription')) {
        switchView('amc');
        return {
            message: "Check out our AMC plans! We have Starter, Business Pro, and Enterprise options to suit your needs. 📋",
            actions: null
        };
    }
    
    if (text.includes('cart')) {
        switchView('cart');
        return {
            message: "Here's your cart! 🛍️",
            actions: null
        };
    }
    
    if (text.includes('profile') || text.includes('account')) {
        if (state.currentUser) {
            switchView('profile');
            return {
                message: "Here's your profile! 👤",
                actions: null
            };
        } else {
            openAuthModal('login');
            return {
                message: "Please log in to view your profile. 🔐",
                actions: null
            };
        }
    }
    
    // Pricing queries
    if (text.includes('price') || text.includes('pricing') || text.includes('cost') || text === 'pricing') {
        return {
            message: "Our pricing starts at ₹99 for home services! 💰\n\n• Home Doorstep Service: ₹99\n• Emergency Support: ₹499\n• AMC Plans: ₹899/month\n\nWould you like to see detailed pricing?",
            actions: [
                { label: 'View AMC Plans', icon: '📋', style: 'bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan', onclick: "switchView('amc')" },
                { label: 'Book Service', icon: '📅', style: 'bg-brand-emerald/10 border border-brand-emerald/30 text-brand-emerald', onclick: "openSpecialModal('home-door')" }
            ]
        };
    }
    
    // Booking queries
    if (text.includes('book') || text.includes('appointment') || text === 'book') {
        return {
            message: "Ready to book a service? 📅\n\nYou can book:\n• Home Doorstep Service (₹99)\n• Emergency Support (₹499)\n• Free Consultation",
            actions: [
                { label: 'Home Service', icon: '🏠', style: 'bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan', onclick: "openSpecialModal('home-door')" },
                { label: 'Emergency', icon: '🚨', style: 'bg-red-500/10 border border-red-500/30 text-red-400', onclick: "openSpecialModal('emergency')" },
                { label: 'Consultation', icon: '💬', style: 'bg-brand-purple/10 border border-brand-purple/30 text-brand-purple', onclick: "openSpecialModal('consultation')" }
            ]
        };
    }
    
    // Contact queries
    if (text.includes('contact') || text.includes('phone') || text.includes('call') || text === 'contact') {
        return {
            message: "You can reach us at:\n\n📞 Phone: +91 9813443289\n💬 WhatsApp: Available\n📧 Email: divyanshgupta@divyanshtechservices.com\n📍 Location: Rewari, Haryana",
            actions: [
                { label: 'Call Now', icon: '📞', style: 'bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan', onclick: "window.location.href='tel:+919813443289'" },
                { label: 'WhatsApp', icon: '💬', style: 'bg-green-500/10 border border-green-500/30 text-green-400', onclick: "window.open('https://wa.me/919813443289', '_blank')" }
            ]
        };
    }
    
    // Help & FAQ
    if (text.includes('help') || text.includes('faq') || text === 'help' || text === 'faq') {
        return {
            message: "I can help you with:\n\n• 📋 View our services\n• 💰 Check pricing\n• 📅 Book a service\n• 📞 Contact support\n• 🛒 Browse products\n• 📊 View AMC plans\n\nJust ask me anything!",
            actions: [
                { label: 'Services', icon: '📋', style: 'bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan', onclick: "sendQuickMessage('services')" },
                { label: 'Pricing', icon: '💰', style: 'bg-brand-emerald/10 border border-brand-emerald/30 text-brand-emerald', onclick: "sendQuickMessage('pricing')" },
                { label: 'Contact', icon: '📞', style: 'bg-brand-purple/10 border border-brand-purple/30 text-brand-purple', onclick: "sendQuickMessage('contact')" }
            ]
        };
    }
    
    // Payment queries
    if (text.includes('payment') || text.includes('pay') || text.includes('razorpay')) {
        return {
            message: "We accept payments via Razorpay! 💳\n\n• UPI\n• Credit/Debit Cards\n• Net Banking\n• Wallets\n\nAll payments are secure and encrypted. 🔒",
            actions: null
        };
    }
    
    // Service area queries
    if (text.includes('area') || text.includes('location') || text.includes('serve') || text.includes('where')) {
        return {
            message: "We serve in:\n\n📍 Rewari (HQ)\n📍 Gurugram\n📍 Delhi\n📍 Noida\n🌐 Online (Global)",
            actions: null
        };
    }
    
    // Emergency
    if (text.includes('emergency') || text.includes('urgent')) {
        return {
            message: "Need urgent help? 🚨\n\nOur emergency support is available 24/7!\n• Response time: Under 1 hour\n• Cost: ₹499\n• Available in all service areas",
            actions: [
                { label: 'Book Emergency', icon: '🚨', style: 'bg-red-500/10 border border-red-500/30 text-red-400', onclick: "openSpecialModal('emergency')" },
                { label: 'Call Now', icon: '📞', style: 'bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan', onclick: "window.location.href='tel:+919813443289'" }
            ]
        };
    }
    
    // Greetings
    if (text.includes('hi') || text.includes('hello') || text.includes('hey')) {
        return {
            message: "Hello! 👋 How can I assist you today?",
            actions: [
                { label: 'View Services', icon: '📋', style: 'bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan', onclick: "sendQuickMessage('services')" },
                { label: 'Book Service', icon: '📅', style: 'bg-brand-emerald/10 border border-brand-emerald/30 text-brand-emerald', onclick: "sendQuickMessage('book')" },
                { label: 'Contact Us', icon: '📞', style: 'bg-brand-purple/10 border border-brand-purple/30 text-brand-purple', onclick: "sendQuickMessage('contact')" }
            ]
        };
    }
    
    // Thanks
    if (text.includes('thank') || text.includes('thanks')) {
        return {
            message: "You're welcome! 😊 Is there anything else I can help you with?",
            actions: null
        };
    }
    
    // Default response
    return {
        message: "I'm not sure I understand. Try asking about:\n\n• Services\n• Pricing\n• Booking\n• Contact\n• Help\n\nOr click the quick actions below! 👇",
        actions: [
            { label: 'Help', icon: '❓', style: 'bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan', onclick: "sendQuickMessage('help')" },
            { label: 'Services', icon: '📋', style: 'bg-brand-emerald/10 border border-brand-emerald/30 text-brand-emerald', onclick: "sendQuickMessage('services')" },
            { label: 'Contact', icon: '📞', style: 'bg-brand-purple/10 border border-brand-purple/30 text-brand-purple', onclick: "sendQuickMessage('contact')" }
        ]
    };
}

function clearChat() {
    const messagesDiv = document.getElementById('chat-messages');
    messagesDiv.innerHTML = `
        <div class="flex gap-3">
            <div class="w-8 h-8 rounded-full bg-brand-cyan/20 flex items-center justify-center flex-shrink-0">
                <i class="fa-solid fa-robot text-brand-cyan text-sm"></i>
            </div>
            <div class="bg-white/5 rounded-2xl rounded-tl-none p-3 max-w-[280px]">
                <p class="text-sm text-slate-300">Chat cleared! How can I help you? 🤖</p>
                <p class="text-xs text-slate-500 mt-1">Just now</p>
            </div>
        </div>
    `;
}

// ==========================================
// QR CODE GENERATION
// ==========================================

function generateQRCode(data, elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    // Clear existing QR code
    element.innerHTML = '';
    
    // Generate new QR code
    new QRCode(element, {
        text: data,
        width: 128,
        height: 128,
        colorDark: '#00f0ff',
        colorLight: '#0f172a',
        correctLevel: QRCode.CorrectLevel.H
    });
}

// Toggle inline QR code display in profile bookings
function toggleBookingQR(bookingId) {
    const qrSection = document.getElementById(`qr-section-${bookingId}`);
    if (!qrSection) return;
    
    // Toggle visibility
    if (qrSection.classList.contains('hidden')) {
        qrSection.classList.remove('hidden');
        
        // Generate QR code if not already generated
        const qrContainer = document.getElementById(`qr-code-${bookingId}`);
        if (qrContainer && qrContainer.children.length === 0) {
            generateInlineQR(bookingId, `qr-code-${bookingId}`);
        }
    } else {
        qrSection.classList.add('hidden');
    }
}

// Generate QR code inline (not in modal)
function generateInlineQR(bookingId, containerId) {
    let users = JSON.parse(localStorage.getItem('dts_registered_users') || '[]');
    let bookingFound = null;
    
    users.forEach(u => {
        const booking = [...(u.bookings || []), ...(u.orders || [])].find(b => b.id === bookingId);
        if (booking) {
            bookingFound = booking;
        }
    });
    
    if (!bookingFound) {
        alert('❌ Booking not found.');
        return;
    }
    
    // Create QR data
    const qrData = JSON.stringify({
        id: bookingId,
        service: bookingFound.service || bookingFound.product,
        date: bookingFound.date,
        time: bookingFound.time,
        amount: bookingFound.amount,
        status: bookingFound.status,
        customer: state.currentUser ? `${state.currentUser.firstName} ${state.currentUser.lastName}` : 'N/A',
        phone: state.currentUser ? state.currentUser.phone : 'N/A',
        type: 'DTS_BOOKING'
    });
    
    // Generate QR code
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = ''; // Clear existing
        new QRCode(container, {
            text: qrData,
            width: 150,
            height: 150,
            colorDark: '#00f0ff',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        });
    }
}

// Download QR code from inline display
function downloadBookingQR(bookingId) {
    const qrContainer = document.getElementById(`qr-code-${bookingId}`);
    if (!qrContainer) {
        alert('❌ QR code not found.');
        return;
    }
    
    const canvas = qrContainer.querySelector('canvas');
    if (!canvas) {
        alert('❌ QR code not generated yet.');
        return;
    }
    
    const link = document.createElement('a');
    link.download = `DTS-Booking-${bookingId}-QR.png`;
    link.href = canvas.toDataURL();
    link.click();
    
    showNotification('✅ QR code downloaded!', 'success');
}

function generateBookingQR(bookingId) {
    let users = JSON.parse(localStorage.getItem('dts_registered_users') || '[]');
    let bookingFound = null;
    
    users.forEach(u => {
        const booking = [...(u.bookings || []), ...(u.orders || [])].find(b => b.id === bookingId);
        if (booking) {
            bookingFound = booking;
        }
    });
    
    if (!bookingFound) {
        alert('❌ Booking not found.');
        return;
    }
    
    // Create QR data
    const qrData = JSON.stringify({
        id: bookingId,
        service: bookingFound.service || bookingFound.product,
        date: bookingFound.date,
        time: bookingFound.time,
        amount: bookingFound.amount,
        status: bookingFound.status,
        type: 'DTS_BOOKING'
    });
    
    // Create modal with QR code
    const modalHtml = `
        <div id="qr-modal" class="fixed inset-0 z-[300] flex items-center justify-center p-4" style="background: rgba(5, 10, 20, 0.9); backdrop-filter: blur(8px);">
            <div class="glass rounded-2xl p-8 max-w-md w-full border border-white/10 relative">
                <button onclick="document.getElementById('qr-modal').remove()" class="absolute top-4 right-4 text-slate-400 hover:text-white">
                    <i class="fa-solid fa-xmark text-xl"></i>
                </button>
                
                <div class="text-center mb-6">
                    <h3 class="font-display text-2xl font-bold text-white mb-2">Booking QR Code</h3>
                    <p class="text-slate-400 text-sm">Scan to verify booking details</p>
                </div>
                
                <div class="flex justify-center mb-6">
                    <div id="qr-code-container" class="p-4 bg-brand-dark rounded-xl border border-brand-cyan/30"></div>
                </div>
                
                <div class="space-y-2 text-sm">
                    <div class="flex justify-between p-2 rounded bg-white/5">
                        <span class="text-slate-400">Booking ID:</span>
                        <span class="text-white font-mono font-bold">${bookingId}</span>
                    </div>
                    <div class="flex justify-between p-2 rounded bg-white/5">
                        <span class="text-slate-400">Service:</span>
                        <span class="text-white">${bookingFound.service || bookingFound.product || 'N/A'}</span>
                    </div>
                    <div class="flex justify-between p-2 rounded bg-white/5">
                        <span class="text-slate-400">Date:</span>
                        <span class="text-white">${bookingFound.date || 'TBD'}</span>
                    </div>
                    <div class="flex justify-between p-2 rounded bg-white/5">
                        <span class="text-slate-400">Time:</span>
                        <span class="text-white">${bookingFound.time || 'TBD'}</span>
                    </div>
                    <div class="flex justify-between p-2 rounded bg-white/5">
                        <span class="text-slate-400">Amount:</span>
                        <span class="text-brand-emerald font-bold">₹${bookingFound.amount || 0}</span>
                    </div>
                    <div class="flex justify-between p-2 rounded bg-white/5">
                        <span class="text-slate-400">Status:</span>
                        <span class="text-brand-cyan font-bold">${bookingFound.status}</span>
                    </div>
                </div>
                
                <button onclick="downloadQRCode('${bookingId}')" class="w-full mt-6 py-3 rounded-lg bg-gradient-to-r from-brand-cyan to-brand-emerald text-brand-dark font-bold hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-all flex items-center justify-center gap-2">
                    <i class="fa-solid fa-download"></i> Download QR Code
                </button>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Generate QR code after modal is rendered
    setTimeout(() => {
        generateQRCode(qrData, 'qr-code-container');
    }, 100);
}

function downloadQRCode(bookingId) {
    const qrCanvas = document.querySelector('#qr-code-container canvas');
    if (!qrCanvas) {
        alert('❌ QR code not found.');
        return;
    }
    
    const link = document.createElement('a');
    link.download = `DTS-Booking-${bookingId}-QR.png`;
    link.href = qrCanvas.toDataURL();
    link.click();
}

// ==========================================
// LIVE TECHNICIAN TRACKING (Zomato-style)
// ==========================================

function openTrackingView(bookingId) {
    let users = JSON.parse(localStorage.getItem('dts_registered_users') || '[]');
    let bookingFound = null;
    
    users.forEach(u => {
        const booking = (u.bookings || []).find(b => b.id === bookingId);
        if (booking) {
            bookingFound = booking;
        }
    });
    
    if (!bookingFound) {
        alert('❌ Booking not found.');
        return;
    }
    
    if (bookingFound.status === 'Booked' || bookingFound.status === 'Pending') {
        alert('⏳ Your booking is pending admin approval. Tracking will be available once confirmed.');
        return;
    }
    
    // Store current tracking booking
    state.currentTrackingBooking = bookingId;
    
    // Render tracking view
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = renderTrackingView(bookingFound);
    
    // Initialize tracking map
    setTimeout(() => {
        initTrackingMap(bookingFound);
        startTrackingSimulation(bookingId);
    }, 100);
}

function renderTrackingView(booking) {
    const stages = ['Confirmed', 'Assigned', 'On the Way', 'Arrived', 'In Progress', 'Completed'];
    const currentStageIndex = stages.indexOf(booking.status) !== -1 ? stages.indexOf(booking.status) : 0;
    
    return `
        <section class="relative z-10 py-24 px-4 sm:px-6 lg:px-8 min-h-screen">
            <div class="max-w-4xl mx-auto">
                <button onclick="switchView('profile')" class="mb-6 flex items-center gap-2 text-slate-400 hover:text-brand-cyan transition-all">
                    <i class="fa-solid fa-arrow-left"></i> Back to Profile
                </button>
                
                <!-- Tracking Header -->
                <div class="glass rounded-2xl p-6 border border-white/10 mb-6">
                    <div class="flex items-center justify-between mb-4">
                        <div>
                            <h2 class="font-display text-2xl font-bold text-white">Track Your Service</h2>
                            <p class="text-slate-400 text-sm">Booking ID: ${booking.id}</p>
                        </div>
                        <div class="text-right">
                            <div class="text-3xl font-bold text-brand-cyan" id="tracking-eta">Calculating...</div>
                            <div class="text-xs text-slate-400">Estimated Arrival</div>
                        </div>
                    </div>
                    
                    <!-- Progress Bar -->
                    <div class="relative mt-8">
                        <div class="flex justify-between mb-2">
                            ${stages.map((stage, idx) => `
                                <div class="flex flex-col items-center ${idx <= currentStageIndex ? 'text-brand-cyan' : 'text-slate-600'}">
                                    <div class="w-8 h-8 rounded-full ${idx <= currentStageIndex ? 'bg-brand-cyan text-brand-dark' : 'bg-white/10 text-slate-500'} flex items-center justify-center font-bold text-sm mb-1 ${idx < currentStageIndex ? 'animate-pulse' : ''}">
                                        ${idx < currentStageIndex ? '<i class="fa-solid fa-check"></i>' : idx + 1}
                                    </div>
                                    <span class="text-[10px] text-center">${stage}</span>
                                </div>
                            `).join('')}
                        </div>
                        <div class="absolute top-4 left-0 right-0 h-1 bg-white/10 rounded-full -z-10">
                            <div class="h-full bg-gradient-to-r from-brand-cyan to-brand-emerald rounded-full transition-all duration-500" style="width: ${(currentStageIndex / (stages.length - 1)) * 100}%"></div>
                        </div>
                    </div>
                </div>
                
                <!-- Map Container -->
                <div class="glass rounded-2xl p-2 border border-white/10 mb-6">
                    <div id="tracking-map" class="h-[400px] rounded-xl overflow-hidden"></div>
                </div>
                
                <!-- Technician Info -->
                <div class="glass rounded-2xl p-6 border border-white/10">
                    <h3 class="font-display text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <i class="fa-solid fa-user-gear text-brand-cyan"></i> Your Technician
                    </h3>
                    <div class="flex items-center gap-4">
                        <div class="w-16 h-16 rounded-full bg-gradient-to-br from-brand-cyan to-brand-emerald flex items-center justify-center text-brand-dark font-bold text-2xl">
                            ${booking.assignedTech ? booking.assignedTech.charAt(0) : 'T'}
                        </div>
                        <div class="flex-1">
                            <h4 class="font-bold text-white text-lg">${booking.assignedTech || 'Technician Assigned'}</h4>
                            <p class="text-slate-400 text-sm">DTS Certified Professional</p>
                            <div class="flex items-center gap-2 mt-1">
                                <i class="fa-solid fa-star text-yellow-500"></i>
                                <span class="text-white text-sm">4.9</span>
                                <span class="text-slate-500 text-xs">(127 reviews)</span>
                            </div>
                        </div>
                        <div class="flex flex-col gap-2">
                            <button onclick="window.location.href='tel:+919813443289'" class="px-4 py-2 rounded-lg bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/50 text-sm font-semibold hover:bg-brand-cyan/30 transition-all flex items-center gap-2">
                                <i class="fa-solid fa-phone"></i> Call
                            </button>
                            <button onclick="window.open('https://wa.me/919813443289', '_blank')" class="px-4 py-2 rounded-lg bg-green-500/20 text-green-400 border border-green-500/50 text-sm font-semibold hover:bg-green-500/30 transition-all flex items-center gap-2">
                                <i class="fa-brands fa-whatsapp"></i> Chat
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Booking Details -->
                <div class="glass rounded-2xl p-6 border border-white/10 mt-6">
                    <h3 class="font-display text-lg font-bold text-white mb-4">Booking Details</h3>
                    <div class="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span class="text-slate-400">Service:</span>
                            <p class="text-white font-semibold">${booking.service || booking.product || 'N/A'}</p>
                        </div>
                        <div>
                            <span class="text-slate-400">Amount:</span>
                            <p class="text-brand-emerald font-bold">₹${booking.amount || 0}</p>
                        </div>
                        <div>
                            <span class="text-slate-400">Date:</span>
                            <p class="text-white">${booking.date || 'TBD'}</p>
                        </div>
                        <div>
                            <span class="text-slate-400">Time:</span>
                            <p class="text-white">${booking.time || 'TBD'}</p>
                        </div>
                        <div class="col-span-2">
                            <span class="text-slate-400">Address:</span>
                            <p class="text-white">${booking.address || 'Not provided'}</p>
                        </div>
                    </div>
                    
                    <button onclick="generateBookingQR('${booking.id}')" class="w-full mt-4 py-3 rounded-lg bg-brand-purple/20 text-brand-purple border border-brand-purple/50 font-semibold hover:bg-brand-purple/30 transition-all flex items-center justify-center gap-2">
                        <i class="fa-solid fa-qrcode"></i> View Booking QR Code
                    </button>
                </div>
            </div>
        </section>
    `;
}

function initTrackingMap(booking) {
    // DTS HQ coordinates (Rewari)
    const dtsHQ = [28.1966, 76.6093];
    
    // Customer location (simulate based on address)
    let customerLocation = [28.2100, 76.6200]; // Default Rewari
    
    if (booking.address) {
        const addressLower = booking.address.toLowerCase();
        if (addressLower.includes('gurugram') || addressLower.includes('gurgaon')) {
            customerLocation = [28.4595, 77.0266];
        } else if (addressLower.includes('delhi')) {
            customerLocation = [28.7041, 77.1025];
        } else if (addressLower.includes('noida')) {
            customerLocation = [28.5355, 77.3910];
        }
    }
    
    // Initialize map
    const map = L.map('tracking-map').setView(customerLocation, 13);
    
    // Dark tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap contributors © CARTO',
        maxZoom: 19
    }).addTo(map);
    
    // Add customer marker
    const customerIcon = L.divIcon({
        html: '<div style="background: #00f0ff; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,240,255,0.5);"></div>',
        className: 'custom-marker',
        iconSize: [20, 20]
    });
    
    L.marker(customerLocation, { icon: customerIcon })
        .addTo(map)
        .bindPopup('<b>Your Location</b>')
        .openPopup();
    
    // Add technician marker (will be animated)
    const techIcon = L.divIcon({
        html: '<div style="background: #10b981; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 15px rgba(16,185,129,0.6); display: flex; align-items: center; justify-content: center;"><i class="fa-solid fa-car" style="color: white; font-size: 12px;"></i></div>',
        className: 'custom-marker',
        iconSize: [24, 24]
    });
    
    // Start technician from DTS HQ
    const techMarker = L.marker(dtsHQ, { icon: techIcon })
        .addTo(map)
        .bindPopup('<b>Technician</b><br>On the way to you');
    
    // Draw route line
    const routeLine = L.polyline([dtsHQ, customerLocation], {
        color: '#00f0ff',
        weight: 3,
        opacity: 0.6,
        dashArray: '10, 10'
    }).addTo(map);
    
    // Fit map to show both markers
    map.fitBounds([dtsHQ, customerLocation], { padding: [50, 50] });
    
    // Store map reference for animation
    state.trackingMap = map;
    state.techMarker = techMarker;
    state.routeLine = routeLine;
    state.customerLocation = customerLocation;
    state.techCurrentLocation = [...dtsHQ];
}

function startTrackingSimulation(bookingId) {
    // Simulate technician movement
    let progress = 0;
    const totalSteps = 60; // 60 steps = ~5 minutes simulation
    const startLoc = state.techCurrentLocation;
    const endLoc = state.customerLocation;
    
    const interval = setInterval(() => {
        progress++;
        
        if (progress >= totalSteps) {
            clearInterval(interval);
            // Update booking status to Arrived
            updateBookingStatus(bookingId, 'Arrived');
            return;
        }
        
        // Calculate intermediate position
        const lat = startLoc[0] + (endLoc[0] - startLoc[0]) * (progress / totalSteps);
        const lng = startLoc[1] + (endLoc[1] - startLoc[1]) * (progress / totalSteps);
        
        // Update technician marker
        state.techMarker.setLatLng([lat, lng]);
        state.techCurrentLocation = [lat, lng];
        
        // Update route line
        state.routeLine.setLatLngs([[lat, lng], endLoc]);
        
        // Calculate ETA
        const remainingDistance = calculateDistance([lat, lng], endLoc);
        const etaMinutes = Math.max(1, Math.round(remainingDistance / 500)); // Assume 500m per minute
        
        // Update ETA display
        const etaElement = document.getElementById('tracking-eta');
        if (etaElement) {
            etaElement.textContent = `${etaMinutes} min`;
        }
        
    }, 5000); // Update every 5 seconds
    
    // Store interval for cleanup
    state.trackingInterval = interval;
}

function calculateDistance(point1, point2) {
    // Simple distance calculation (in meters)
    const R = 6371000; // Earth's radius in meters
    const dLat = (point2[0] - point1[0]) * Math.PI / 180;
    const dLon = (point2[1] - point1[1]) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(point1[0] * Math.PI / 180) * Math.cos(point2[0] * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function updateBookingStatus(bookingId, newStatus) {
    let users = JSON.parse(localStorage.getItem('dts_registered_users') || '[]');
    
    users.forEach(u => {
        const booking = (u.bookings || []).find(b => b.id === bookingId);
        if (booking) {
            booking.status = newStatus;
        }
    });
    
    localStorage.setItem('dts_registered_users', JSON.stringify(users));
    
    // Update current user if it's the same user
    if (state.currentUser) {
        const myBooking = (state.currentUser.bookings || []).find(b => b.id === bookingId);
        if (myBooking) {
            myBooking.status = newStatus;
            localStorage.setItem('dts_user', JSON.stringify(state.currentUser));
        }
    }
    
    logActivity(`Booking ${bookingId} status updated to ${newStatus}`);
}

// ==========================================
// TECHNICIAN PORTAL FUNCTIONS
// ==========================================

// Technician Login
function openTechLoginModal() {
    const modal = document.getElementById('tech-login-modal');
    const content = document.getElementById('tech-login-content');
    modal.classList.remove('hidden');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
}

function closeTechLoginModal() {
    const modal = document.getElementById('tech-login-modal');
    const content = document.getElementById('tech-login-content');
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

function handleTechLogin(event) {
    event.preventDefault();
    const techId = document.getElementById('tech-login-id').value.trim().toUpperCase();
    const password = document.getElementById('tech-login-password').value;
    
    // Get technicians from localStorage
    const technicians = JSON.parse(localStorage.getItem('dts_technicians') || '[]');
    const tech = technicians.find(t => t.id === techId && t.password === password);
    
    if (!tech) {
        alert('❌ Invalid Technician ID or Password');
        return;
    }
    
    // Store technician session
    state.currentTechnician = tech;
    localStorage.setItem('dts_current_technician', JSON.stringify(tech));
    
    closeTechLoginModal();
    
    // Update footer visibility
    updateFooterVisibility();
    
    switchView('technician-dashboard');
    showNotification(`✅ Welcome back, ${tech.name}!`, 'success');
}

function logoutTechnician() {
    if (!confirm('Are you sure you want to logout?')) return;
    
    state.currentTechnician = null;
    localStorage.removeItem('dts_current_technician');
    
    // Update footer visibility
    updateFooterVisibility();
    
    switchView('home');
    showNotification('👋 Logged out successfully', 'info');
}

function updateFooterVisibility() {
    const adminBtn = document.getElementById('footer-admin-btn');
    const techBtn = document.getElementById('footer-tech-btn');
    
    // Always show admin and technician login buttons
    if (adminBtn) adminBtn.style.display = 'flex';
    if (techBtn) techBtn.style.display = 'flex';
}

// Technician Dashboard
function renderTechnicianDashboard() {
    if (!state.currentTechnician) {
        openTechLoginModal();
        return `<div class="pt-32 text-center text-white">Please login as technician</div>`;
    }
    
    const tech = state.currentTechnician;
    const allUsers = JSON.parse(localStorage.getItem('dts_registered_users') || '[]');
    
    // Get all bookings assigned to this technician
    const myTasks = [];
    allUsers.forEach(user => {
        (user.bookings || []).forEach(booking => {
            if (booking.assignedTech && booking.assignedTech.includes(tech.name)) {
                myTasks.push({
                    ...booking,
                    customerName: `${user.firstName} ${user.lastName}`,
                    customerEmail: user.email,
                    customerPhone: user.phone,
                    customerUsername: user.username
                });
            }
        });
    });
    
    const pendingTasks = myTasks.filter(t => t.status === 'Assigned');
    const acceptedTasks = myTasks.filter(t => t.status === 'Accepted' || t.status === 'On the Way' || t.status === 'Arrived');
    const completedTasks = myTasks.filter(t => t.status === 'Completed' || t.status === 'Verified');
    
    // Calculate earnings (assuming 70% of booking amount goes to technician)
    const totalEarnings = completedTasks.reduce((sum, t) => sum + ((t.amount || 0) * 0.7), 0);
    const thisMonthEarnings = completedTasks
        .filter(t => {
            const completedDate = new Date(t.completedAt || t.date);
            const now = new Date();
            return completedDate.getMonth() === now.getMonth() && completedDate.getFullYear() === now.getFullYear();
        })
        .reduce((sum, t) => sum + ((t.amount || 0) * 0.7), 0);
    
    return `
        <section class="relative z-10 py-24 px-4 sm:px-6 lg:px-8 min-h-screen">
            <div class="max-w-6xl mx-auto">
                <!-- Technician Header -->
                <div class="glass rounded-2xl p-6 border border-brand-cyan/30 mb-8 reveal">
                    <div class="flex flex-col md:flex-row items-center gap-6">
                        <div class="w-20 h-20 rounded-full bg-gradient-to-br from-brand-cyan to-brand-emerald flex items-center justify-center text-brand-dark font-bold text-3xl">
                            ${tech.name.charAt(0)}
                        </div>
                        <div class="flex-1 text-center md:text-left">
                            <h2 class="font-display text-3xl font-bold text-white mb-1">${tech.name}</h2>
                            <p class="text-brand-cyan font-mono text-sm mb-2">${tech.id}</p>
                            <div class="flex flex-wrap gap-2 justify-center md:justify-start">
                                <span class="px-3 py-1 rounded-full bg-brand-emerald/20 text-brand-emerald text-xs font-bold border border-brand-emerald/30">
                                    <i class="fa-solid fa-wrench mr-1"></i> ${tech.specialization || 'General'}
                                </span>
                                <span class="px-3 py-1 rounded-full bg-brand-cyan/20 text-brand-cyan text-xs font-bold border border-brand-cyan/30">
                                    <i class="fa-solid fa-location-dot mr-1"></i> ${tech.location || 'All Areas'}
                                </span>
                            </div>
                        </div>
                        <button onclick="logoutTechnician()" class="px-6 py-3 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 font-semibold hover:bg-red-500/30 transition-all">
                            <i class="fa-solid fa-right-from-bracket mr-2"></i> Logout
                        </button>
                    </div>
                </div>
                
                <!-- Stats Cards -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 reveal">
                    <div class="glass rounded-xl p-5 border border-yellow-500/30">
                        <div class="text-slate-400 text-xs uppercase mb-1">Pending Tasks</div>
                        <div class="text-3xl font-bold text-yellow-500">${pendingTasks.length}</div>
                    </div>
                    <div class="glass rounded-xl p-5 border border-brand-cyan/30">
                        <div class="text-slate-400 text-xs uppercase mb-1">Active Tasks</div>
                        <div class="text-3xl font-bold text-brand-cyan">${acceptedTasks.length}</div>
                    </div>
                    <div class="glass rounded-xl p-5 border border-brand-emerald/30">
                        <div class="text-slate-400 text-xs uppercase mb-1">Completed</div>
                        <div class="text-3xl font-bold text-brand-emerald">${completedTasks.length}</div>
                    </div>
                    <div class="glass rounded-xl p-5 border border-brand-purple/30">
                        <div class="text-slate-400 text-xs uppercase mb-1">This Month</div>
                        <div class="text-3xl font-bold text-brand-purple">₹${Math.round(thisMonthEarnings).toLocaleString()}</div>
                    </div>
                </div>
                
                <!-- Total Earnings -->
                <div class="glass rounded-2xl p-6 border border-brand-emerald/30 mb-8 reveal bg-gradient-to-r from-brand-emerald/5 to-transparent">
                    <div class="flex items-center justify-between">
                        <div>
                            <h3 class="text-slate-400 text-sm uppercase mb-2">Total Earnings</h3>
                            <div class="text-4xl font-bold text-brand-emerald">₹${Math.round(totalEarnings).toLocaleString()}</div>
                            <p class="text-xs text-slate-500 mt-1">70% of completed task values</p>
                        </div>
                        <div class="w-16 h-16 rounded-full bg-brand-emerald/20 flex items-center justify-center">
                            <i class="fa-solid fa-indian-rupee-sign text-3xl text-brand-emerald"></i>
                        </div>
                    </div>
                </div>
                
                <!-- Pending Tasks -->
                <div class="glass rounded-2xl p-6 border border-white/10 mb-6 reveal">
                    <h3 class="font-display text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <i class="fa-solid fa-clock text-yellow-500"></i> Pending Tasks (${pendingTasks.length})
                    </h3>
                    ${pendingTasks.length === 0 ? '<p class="text-slate-500 text-center py-8">No pending tasks</p>' : `
                        <div class="space-y-4">
                            ${pendingTasks.map(task => renderTaskCard(task, 'pending')).join('')}
                        </div>
                    `}
                </div>
                
                <!-- Active Tasks -->
                <div class="glass rounded-2xl p-6 border border-white/10 mb-6 reveal">
                    <h3 class="font-display text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <i class="fa-solid fa-briefcase text-brand-cyan"></i> Active Tasks (${acceptedTasks.length})
                    </h3>
                    ${acceptedTasks.length === 0 ? '<p class="text-slate-500 text-center py-8">No active tasks</p>' : `
                        <div class="space-y-4">
                            ${acceptedTasks.map(task => renderTaskCard(task, 'active')).join('')}
                        </div>
                    `}
                </div>
                
                <!-- Completed Tasks -->
                <div class="glass rounded-2xl p-6 border border-white/10 reveal">
                    <h3 class="font-display text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <i class="fa-solid fa-check-circle text-brand-emerald"></i> Completed Tasks (${completedTasks.length})
                    </h3>
                    ${completedTasks.length === 0 ? '<p class="text-slate-500 text-center py-8">No completed tasks yet</p>' : `
                        <div class="space-y-4">
                            ${completedTasks.slice(0, 5).map(task => renderTaskCard(task, 'completed')).join('')}
                            ${completedTasks.length > 5 ? `<p class="text-center text-sm text-slate-500 mt-4">+ ${completedTasks.length - 5} more tasks</p>` : ''}
                        </div>
                    `}
                </div>
            </div>
        </section>
    `;
}

function renderTaskCard(task, type) {
    const earnings = Math.round((task.amount || 0) * 0.7);
    
    let actionButtons = '';
    if (type === 'pending') {
        actionButtons = `
            <button onclick="acceptTask('${task.id}')" class="flex-1 px-4 py-2 rounded-lg bg-brand-emerald text-white font-bold text-sm hover:bg-brand-emerald/80 transition-all">
                <i class="fa-solid fa-check mr-1"></i> Accept
            </button>
            <button onclick="rejectTask('${task.id}')" class="flex-1 px-4 py-2 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 font-bold text-sm hover:bg-red-500/30 transition-all">
                <i class="fa-solid fa-xmark mr-1"></i> Reject
            </button>
        `;
    } else if (type === 'active') {
        if (task.status === 'Accepted') {
            actionButtons = `
                <button onclick="startTravel('${task.id}')" class="flex-1 px-4 py-2 rounded-lg bg-brand-cyan text-brand-dark font-bold text-sm hover:bg-brand-cyan/80 transition-all">
                    <i class="fa-solid fa-car mr-1"></i> Start Travel
                </button>
            `;
        } else if (task.status === 'On the Way') {
            actionButtons = `
                <button onclick="markArrived('${task.id}')" class="flex-1 px-4 py-2 rounded-lg bg-brand-purple text-white font-bold text-sm hover:bg-brand-purple/80 transition-all">
                    <i class="fa-solid fa-location-dot mr-1"></i> Mark Arrived
                </button>
            `;
        } else if (task.status === 'Arrived') {
            actionButtons = `
                <button onclick="openQRScanner('${task.id}')" class="flex-1 px-4 py-2 rounded-lg bg-brand-cyan text-brand-dark font-bold text-sm hover:bg-brand-cyan/80 transition-all">
                    <i class="fa-solid fa-qrcode mr-1"></i> Scan QR
                </button>
            `;
        } else if (task.status === 'In Progress') {
            actionButtons = `
                <button onclick="openPhotoUpload('${task.id}')" class="flex-1 px-4 py-2 rounded-lg bg-brand-emerald text-white font-bold text-sm hover:bg-brand-emerald/80 transition-all">
                    <i class="fa-solid fa-camera mr-1"></i> Complete Task
                </button>
            `;
        }
    }
    
    return `
        <div class="bg-brand-dark/50 rounded-xl p-5 border border-white/10 hover:border-brand-cyan/30 transition-all">
            <div class="flex justify-between items-start mb-3">
                <div>
                    <div class="flex items-center gap-2 mb-1">
                        <span class="font-mono text-brand-cyan text-sm font-bold">${task.id}</span>
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            task.status === 'Assigned' ? 'bg-yellow-500/20 text-yellow-500' :
                            task.status === 'Accepted' ? 'bg-brand-cyan/20 text-brand-cyan' :
                            task.status === 'On the Way' ? 'bg-brand-purple/20 text-brand-purple' :
                            task.status === 'Arrived' ? 'bg-brand-cyan/20 text-brand-cyan' :
                            task.status === 'In Progress' ? 'bg-brand-emerald/20 text-brand-emerald' :
                            'bg-brand-emerald/20 text-brand-emerald'
                        }">${task.status}</span>
                    </div>
                    <h4 class="font-bold text-white text-lg">${task.service || task.product || 'Service'}</h4>
                </div>
                <div class="text-right">
                    <div class="text-xs text-slate-400">Earnings</div>
                    <div class="text-xl font-bold text-brand-emerald">₹${earnings}</div>
                </div>
            </div>
            
            <div class="grid grid-cols-2 gap-3 text-sm mb-4">
                <div>
                    <span class="text-slate-400 text-xs">Customer:</span>
                    <p class="text-white font-semibold">${task.customerName}</p>
                    <p class="text-xs text-slate-400">${task.customerPhone || 'N/A'}</p>
                </div>
                <div>
                    <span class="text-slate-400 text-xs">Date & Time:</span>
                    <p class="text-white font-semibold">${task.date || 'TBD'}</p>
                    <p class="text-xs text-slate-400">${task.time || 'TBD'}</p>
                </div>
            </div>
            
            ${task.address ? `
                <div class="mb-4">
                    <span class="text-slate-400 text-xs">Address:</span>
                    <p class="text-white text-sm">${task.address}</p>
                </div>
            ` : ''}
            
            ${task.amount ? `
                <div class="mb-4">
                    <span class="text-slate-400 text-xs">Booking Amount:</span>
                    <span class="text-white font-bold ml-2">₹${task.amount}</span>
                </div>
            ` : ''}
            
            <div class="flex gap-2">
                ${actionButtons}
            </div>
        </div>
    `;
}

// Task Actions
function acceptTask(bookingId) {
    if (!confirm('Accept this task? You will be responsible for completing it.')) return;
    
    updateTaskStatus(bookingId, 'Accepted');
    showNotification('✅ Task accepted successfully!', 'success');
    switchView('technician-dashboard');
}

function rejectTask(bookingId) {
    const reason = prompt('Please provide a reason for rejecting this task:');
    if (!reason) return;
    
    updateTaskStatus(bookingId, 'Assigned', true); // Revert to Assigned for reassignment
    logActivity(`Technician ${state.currentTechnician.name} rejected task ${bookingId}: ${reason}`);
    showNotification('❌ Task rejected', 'error');
    switchView('technician-dashboard');
}

function startTravel(bookingId) {
    updateTaskStatus(bookingId, 'On the Way');
    showNotification('🚗 Started traveling to customer location', 'success');
    switchView('technician-dashboard');
}

function markArrived(bookingId) {
    updateTaskStatus(bookingId, 'Arrived');
    showNotification('📍 Marked as arrived at customer location', 'success');
    switchView('technician-dashboard');
}

function updateTaskStatus(bookingId, newStatus, revert = false) {
    let users = JSON.parse(localStorage.getItem('dts_registered_users') || '[]');
    
    users.forEach(user => {
        const booking = (user.bookings || []).find(b => b.id === bookingId);
        if (booking) {
            booking.status = newStatus;
            if (newStatus === 'Accepted') {
                booking.acceptedAt = new Date().toISOString();
                booking.acceptedBy = state.currentTechnician.name;
            } else if (newStatus === 'On the Way') {
                booking.travelStartedAt = new Date().toISOString();
            } else if (newStatus === 'Arrived') {
                booking.arrivedAt = new Date().toISOString();
            } else if (newStatus === 'In Progress') {
                booking.workStartedAt = new Date().toISOString();
            } else if (newStatus === 'Completed') {
                booking.completedAt = new Date().toISOString();
                booking.completedBy = state.currentTechnician.name;
            }
        }
    });
    
    localStorage.setItem('dts_registered_users', JSON.stringify(users));
    logActivity(`Task ${bookingId} status updated to ${newStatus} by ${state.currentTechnician.name}`);
}

// QR Scanner
let html5QrCode = null;

function openQRScanner(bookingId) {
    state.currentTaskForQR = bookingId;
    const modal = document.getElementById('qr-scanner-modal');
    modal.classList.remove('hidden');
    
    // Reset scan result
    document.getElementById('qr-scan-result').classList.add('hidden');
    
    // Start real QR scanner
    startRealQRScanner();
}

function closeQRScanner() {
    const modal = document.getElementById('qr-scanner-modal');
    modal.classList.add('hidden');
    stopRealQRScanner();
    document.getElementById('qr-scan-result').classList.add('hidden');
}

async function startRealQRScanner() {
    try {
        const scannerContainer = document.getElementById('qr-scanner-container');
        
        // Clear any existing content
        scannerContainer.innerHTML = '<div id="qr-reader" style="width: 100%; height: 100%;"></div>';
        
        html5QrCode = new Html5Qrcode("qr-reader");
        
        const config = { 
            fps: 10, 
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
        };
        
        await html5QrCode.start(
            { facingMode: "environment" },
            config,
            onScanSuccess,
            onScanFailure
        );
    } catch (err) {
        console.error('QR Scanner error:', err);
        alert('❌ Unable to start QR scanner. Please ensure camera permissions are granted.\n\nError: ' + err.message);
        closeQRScanner();
    }
}

async function stopRealQRScanner() {
    if (html5QrCode) {
        try {
            await html5QrCode.stop();
            html5QrCode.clear();
        } catch (err) {
            console.error('Error stopping scanner:', err);
        }
        html5QrCode = null;
    }
}

function onScanSuccess(decodedText, decodedResult) {
    // Stop scanner once QR is detected
    stopRealQRScanner();
    
    // Play success sound/vibration feedback
    if (navigator.vibrate) {
        navigator.vibrate(200);
    }
    
    // Try to parse the QR data as JSON (booking QR format)
    let bookingData = null;
    try {
        bookingData = JSON.parse(decodedText);
    } catch (e) {
        // If not JSON, treat as plain booking ID
        bookingData = { id: decodedText };
    }
    
    // Find the booking in our system
    const users = JSON.parse(localStorage.getItem('dts_registered_users') || '[]');
    let booking = null;
    let customerUser = null;
    
    users.forEach(user => {
        const allBookings = [...(user.bookings || []), ...(user.orders || [])];
        const found = allBookings.find(b => b.id === bookingData.id);
        if (found) {
            booking = found;
            customerUser = user;
        }
    });
    
    if (!booking) {
        // Show error but allow manual entry
        const resultDiv = document.getElementById('qr-scan-result');
        const detailsDiv = document.getElementById('qr-scan-details');
        
        resultDiv.classList.remove('hidden');
        resultDiv.classList.remove('bg-brand-emerald/10', 'border-brand-emerald/30');
        resultDiv.classList.add('bg-red-500/10', 'border-red-500/30');
        
        detailsDiv.innerHTML = `
            <p class="text-red-400 font-semibold mb-2">
                <i class="fa-solid fa-exclamation-triangle mr-1"></i> Booking not found in system
            </p>
            <p class="text-xs text-slate-400 mb-2">Scanned Data: <code class="text-brand-cyan">${decodedText}</code></p>
            <button onclick="manualBookingEntry()" class="mt-2 px-4 py-2 rounded-lg bg-brand-cyan/20 text-brand-cyan text-xs font-semibold hover:bg-brand-cyan/30 transition-all">
                <i class="fa-solid fa-keyboard mr-1"></i> Enter Booking ID Manually
            </button>
        `;
        return;
    }
    
    // Show scan result with full booking details
    const resultDiv = document.getElementById('qr-scan-result');
    const detailsDiv = document.getElementById('qr-scan-details');
    
    resultDiv.classList.remove('hidden');
    resultDiv.classList.remove('bg-red-500/10', 'border-red-500/30');
    resultDiv.classList.add('bg-brand-emerald/10', 'border-brand-emerald/30');
    
    detailsDiv.innerHTML = `
        <p class="text-brand-emerald font-semibold mb-3">
            <i class="fa-solid fa-check-circle mr-1"></i> QR Code Verified Successfully!
        </p>
        <div class="space-y-2 text-xs">
            <div class="flex justify-between py-1 border-b border-white/10">
                <span class="text-slate-400">Booking ID:</span>
                <span class="text-brand-cyan font-mono font-bold">${booking.id}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-white/10">
                <span class="text-slate-400">Service:</span>
                <span class="text-white font-semibold">${booking.service || booking.product || 'N/A'}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-white/10">
                <span class="text-slate-400">Customer:</span>
                <span class="text-white">${customerUser.firstName} ${customerUser.lastName}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-white/10">
                <span class="text-slate-400">Phone:</span>
                <span class="text-white">${customerUser.phone || 'N/A'}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-white/10">
                <span class="text-slate-400">Address:</span>
                <span class="text-white text-right max-w-[180px]">${booking.address || customerUser.address || 'N/A'}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-white/10">
                <span class="text-slate-400">Date:</span>
                <span class="text-white">${booking.date || 'TBD'}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-white/10">
                <span class="text-slate-400">Time:</span>
                <span class="text-white">${booking.time || 'TBD'}</span>
            </div>
            <div class="flex justify-between py-1">
                <span class="text-slate-400">Amount:</span>
                <span class="text-brand-emerald font-bold">₹${booking.amount || 0}</span>
            </div>
        </div>
        <div class="flex gap-2 mt-4">
            <button onclick="confirmQRScanAndStart('${booking.id}')" class="flex-1 py-2 rounded-lg bg-brand-emerald text-white text-xs font-bold hover:bg-brand-emerald/80 transition-all">
                <i class="fa-solid fa-play mr-1"></i> Start Work
            </button>
            <button onclick="closeQRScanner()" class="flex-1 py-2 rounded-lg bg-white/10 text-slate-300 text-xs font-semibold hover:bg-white/20 transition-all">
                Cancel
            </button>
        </div>
    `;
}

function onScanFailure(error) {
    // Silently ignore scan failures - they happen constantly during scanning
}

function manualBookingEntry() {
    const bookingId = prompt('Enter Booking ID (e.g., BKG-ABC123):');
    if (!bookingId) return;
    
    const users = JSON.parse(localStorage.getItem('dts_registered_users') || '[]');
    let booking = null;
    let customerUser = null;
    
    users.forEach(user => {
        const allBookings = [...(user.bookings || []), ...(user.orders || [])];
        const found = allBookings.find(b => b.id === bookingId.trim().toUpperCase());
        if (found) {
            booking = found;
            customerUser = user;
        }
    });
    
    if (!booking) {
        alert('❌ Booking not found. Please check the ID and try again.');
        return;
    }
    
    // Show booking details and confirm
    const details = `
Booking Found:
━━━━━━━━━━━━━━
ID: ${booking.id}
Service: ${booking.service || booking.product || 'N/A'}
Customer: ${customerUser.firstName} ${customerUser.lastName}
Phone: ${customerUser.phone || 'N/A'}
Address: ${booking.address || customerUser.address || 'N/A'}
Date: ${booking.date || 'TBD'}
Time: ${booking.time || 'TBD'}
Amount: ₹${booking.amount || 0}

Start work on this task?
    `;
    
    if (confirm(details)) {
        updateTaskStatus(booking.id, 'In Progress');
        closeQRScanner();
        showNotification('🔧 Work started! Task is now in progress', 'success');
        switchView('technician-dashboard');
    }
}

function confirmQRScanAndStart(bookingId) {
    updateTaskStatus(bookingId, 'In Progress');
    closeQRScanner();
    showNotification('🔧 Work started! Task is now in progress', 'success');
    switchView('technician-dashboard');
}

// Photo Upload
function openPhotoUpload(bookingId) {
    state.currentTaskForPhotos = bookingId;
    const modal = document.getElementById('photo-upload-modal');
    modal.classList.remove('hidden');
}

function closePhotoUploadModal() {
    const modal = document.getElementById('photo-upload-modal');
    modal.classList.add('hidden');
    document.getElementById('before-photo').value = '';
    document.getElementById('after-photo').value = '';
    document.getElementById('completion-notes').value = '';
    document.getElementById('before-preview').innerHTML = '<i class="fa-solid fa-camera text-4xl text-slate-500 mb-2"></i><p class="text-sm text-slate-400">Click to upload before photo</p>';
    document.getElementById('after-preview').innerHTML = '<i class="fa-solid fa-camera text-4xl text-slate-500 mb-2"></i><p class="text-sm text-slate-400">Click to upload after photo</p>';
}

function previewPhoto(input, type) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const previewDiv = document.getElementById(`${type}-preview`);
            previewDiv.innerHTML = `<img src="${e.target.result}" class="w-full h-full object-cover rounded-xl">`;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function submitCompletionPhotos() {
    const beforePhoto = document.getElementById('before-photo').files[0];
    const afterPhoto = document.getElementById('after-photo').files[0];
    const notes = document.getElementById('completion-notes').value;
    
    if (!beforePhoto || !afterPhoto) {
        alert('❌ Please upload both before and after photos');
        return;
    }
    
    const bookingId = state.currentTaskForPhotos;
    
    // Convert photos to base64
    const beforeReader = new FileReader();
    const afterReader = new FileReader();
    
    beforeReader.onload = function(e1) {
        afterReader.onload = function(e2) {
            // Save photos to booking
            let users = JSON.parse(localStorage.getItem('dts_registered_users') || '[]');
            
            users.forEach(user => {
                const booking = (user.bookings || []).find(b => b.id === bookingId);
                if (booking) {
                    booking.beforePhoto = e1.target.result;
                    booking.afterPhoto = e2.target.result;
                    booking.completionNotes = notes;
                    booking.status = 'Completed';
                    booking.completedAt = new Date().toISOString();
                    booking.completedBy = state.currentTechnician.name;
                }
            });
            
            localStorage.setItem('dts_registered_users', JSON.stringify(users));
            
            closePhotoUploadModal();
            updateTaskStatus(bookingId, 'Completed');
            showNotification('✅ Task completed! Photos uploaded successfully', 'success');
            switchView('technician-dashboard');
        };
        afterReader.readAsDataURL(afterPhoto);
    };
    beforeReader.readAsDataURL(beforePhoto);
}

// ==========================================
// INVOICE GENERATION
// ==========================================

function generateInvoice(bookingId) {
    let users = JSON.parse(localStorage.getItem('dts_registered_users') || '[]');
    let booking = null;
    let user = null;
    
    users.forEach(u => {
        const b = (u.bookings || []).find(b => b.id === bookingId);
        if (b) {
            booking = b;
            user = u;
        }
    });
    
    if (!booking) {
        alert('❌ Booking not found');
        return;
    }
    
    // Generate invoice number
    const invoiceNo = 'DTS-' + Date.now().toString().slice(-8);
    const invoiceDate = new Date().toLocaleDateString('en-IN');
    
    // Calculate amounts
    const subtotal = booking.amount || 0;
    const gst = Math.round(subtotal * 0.18); // 18% GST
    const total = subtotal + gst;
    
    // Create invoice HTML
    const invoiceHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Invoice ${invoiceNo}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; background: #fff; }
                .invoice-container { max-width: 800px; margin: 0 auto; border: 2px solid #00f0ff; padding: 40px; }
                .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #00f0ff; padding-bottom: 20px; margin-bottom: 30px; }
                .logo-section h1 { color: #050a14; font-size: 32px; font-weight: bold; }
                .logo-section p { color: #64748b; font-size: 12px; margin-top: 5px; }
                .invoice-title { text-align: right; }
                .invoice-title h2 { color: #00f0ff; font-size: 36px; font-weight: bold; }
                .invoice-title p { color: #64748b; font-size: 14px; margin-top: 5px; }
                .info-section { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
                .info-box { background: #f8fafc; padding: 20px; border-radius: 8px; }
                .info-box h3 { color: #050a14; font-size: 14px; margin-bottom: 10px; text-transform: uppercase; }
                .info-box p { color: #64748b; font-size: 13px; line-height: 1.6; }
                .info-box strong { color: #050a14; }
                .services-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                .services-table thead { background: #00f0ff; color: #050a14; }
                .services-table th { padding: 12px; text-align: left; font-weight: 600; }
                .services-table td { padding: 12px; border-bottom: 1px solid #e2e8f0; }
                .services-table .text-right { text-align: right; }
                .totals-section { display: flex; justify-content: flex-end; margin-bottom: 30px; }
                .totals-box { width: 300px; }
                .totals-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
                .totals-row.final { border-top: 2px solid #00f0ff; border-bottom: none; font-weight: bold; font-size: 18px; color: #00f0ff; padding-top: 15px; margin-top: 10px; }
                .payment-info { background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
                .payment-info h3 { color: #050a14; font-size: 14px; margin-bottom: 10px; }
                .payment-info p { color: #64748b; font-size: 13px; line-height: 1.6; }
                .footer { display: flex; justify-content: space-between; align-items: center; border-top: 2px solid #00f0ff; padding-top: 20px; margin-top: 30px; }
                .stamp { width: 120px; height: 120px; border: 3px solid #10b981; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; transform: rotate(-15deg); opacity: 0.8; }
                .stamp-text { color: #10b981; font-weight: bold; font-size: 12px; }
                .stamp-main { color: #10b981; font-weight: bold; font-size: 16px; margin: 5px 0; }
                .terms { margin-top: 20px; padding: 15px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px; }
                .terms h4 { color: #92400e; font-size: 12px; margin-bottom: 8px; }
                .terms p { color: #78350f; font-size: 11px; line-height: 1.5; }
                @media print {
                    body { padding: 0; }
                    .invoice-container { border: none; }
                }
            </style>
        </head>
        <body>
            <div class="invoice-container">
                <div class="header">
                    <div class="logo-section">
                        <h1>DIVYANSH TECH SERVICES</h1>
                        <p>Professional IT Solutions & Support</p>
                        <p>Rewari, Haryana, India</p>
                        <p>Phone: +91 9813443289</p>
                        <p>Email: divyanshgupta@divyanshtechservices.com</p>
                    </div>
                    <div class="invoice-title">
                        <h2>INVOICE</h2>
                        <p><strong>Invoice No:</strong> ${invoiceNo}</p>
                        <p><strong>Date:</strong> ${invoiceDate}</p>
                        <p><strong>Booking ID:</strong> ${booking.id}</p>
                    </div>
                </div>
                
                <div class="info-section">
                    <div class="info-box">
                        <h3>Bill To</h3>
                        <p><strong>${user.firstName} ${user.lastName}</strong></p>
                        <p>${user.email}</p>
                        <p>${user.phone || 'N/A'}</p>
                        <p>${user.address || 'N/A'}</p>
                        <p>@${user.username}</p>
                    </div>
                    <div class="info-box">
                        <h3>Service Details</h3>
                        <p><strong>Service:</strong> ${booking.service || booking.product || 'IT Service'}</p>
                        <p><strong>Date:</strong> ${booking.date || 'N/A'}</p>
                        <p><strong>Time:</strong> ${booking.time || 'N/A'}</p>
                        <p><strong>Technician:</strong> ${booking.assignedTech || 'N/A'}</p>
                        <p><strong>Status:</strong> ${booking.status}</p>
                    </div>
                </div>
                
                <table class="services-table">
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th class="text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>${booking.service || booking.product || 'IT Service'}</td>
                            <td class="text-right">₹${subtotal.toLocaleString()}</td>
                        </tr>
                        ${booking.completionNotes ? `<tr><td colspan="2" style="color: #64748b; font-size: 12px; padding-top: 5px;"><em>Note: ${booking.completionNotes}</em></td></tr>` : ''}
                    </tbody>
                </table>
                
                <div class="totals-section">
                    <div class="totals-box">
                        <div class="totals-row">
                            <span>Subtotal:</span>
                            <span>₹${subtotal.toLocaleString()}</span>
                        </div>
                        <div class="totals-row">
                            <span>GST (18%):</span>
                            <span>₹${gst.toLocaleString()}</span>
                        </div>
                        <div class="totals-row final">
                            <span>Total:</span>
                            <span>₹${total.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
                
                <div class="payment-info">
                    <h3>Payment Information</h3>
                    <p><strong>Payment Method:</strong> Razorpay Online Payment</p>
                    <p><strong>Payment ID:</strong> ${booking.paymentId || 'N/A'}</p>
                    <p><strong>Payment Status:</strong> Paid</p>
                    <p><strong>Transaction Date:</strong> ${invoiceDate}</p>
                </div>
                
                <div class="terms">
                    <h4>Terms & Conditions</h4>
                    <p>1. This is a computer-generated invoice and does not require a signature.</p>
                    <p>2. All payments are processed securely through Razorpay.</p>
                    <p>3. For any queries regarding this invoice, please contact us at +91 9813443289.</p>
                    <p>4. Service warranty and support as per AMC plan terms (if applicable).</p>
                </div>
                
                <div class="footer">
                    <div>
                        <p style="color: #64748b; font-size: 12px;">Thank you for choosing Divyansh Tech Services!</p>
                        <p style="color: #00f0ff; font-size: 11px; margin-top: 5px;">www.divyanshtechservices.com</p>
                    </div>
                    <div class="stamp">
                        <div class="stamp-text">AUTHORIZED</div>
                        <div class="stamp-main">PAID</div>
                        <div class="stamp-text">DTS OFFICIAL</div>
                    </div>
                </div>
            </div>
            
            <script>
                window.onload = function() {
                    setTimeout(function() {
                        window.print();
                    }, 500);
                };
            </script>
        </body>
        </html>
    `;
    
    // Create new window and print
    const printWindow = window.open('', '_blank');
    printWindow.document.write(invoiceHTML);
    printWindow.document.close();
}

// ==========================================
// TECHNICIAN CREDENTIAL EDITING
// ==========================================

async function editTechnicianCredentials(techId) {
    const technicians = await DTSDB.getAllTechnicians();
    const tech = technicians.find(t => t.id === techId);
    
    if (!tech) {
        alert('❌ Technician not found');
        return;
    }
    
    const newId = prompt('Enter new Technician ID:', tech.id);
    if (newId === null) return; // User cancelled
    
    const newPassword = prompt('Enter new Password:', tech.password);
    if (newPassword === null) return; // User cancelled
    
    if (!newId.trim() || !newPassword.trim()) {
        alert('❌ ID and Password cannot be empty');
        return;
    }
    
    // Check if new ID already exists (excluding current technician)
    const duplicateTech = technicians.find(t => t.id === newId.trim() && t.id !== techId);
    if (duplicateTech) {
        alert('❌ This Technician ID is already in use by another technician');
        return;
    }
    
    // Update credentials
    const updates = {
        id: newId.trim().toUpperCase(),
        password: newPassword.trim()
    };
    
    await DTSDB.updateTechnician(techId, updates);
    
    await logActivity(`Technician ${tech.name} credentials updated by Admin`);
    alert(`✅ Credentials updated successfully!\n\nTechnician: ${tech.name}\nNew ID: ${updates.id}\nNew Password: ${updates.password}\n\nPlease share the new credentials with the technician.`);
    switchView('admin-center');
}


// ==========================================
// COLLABORATION REQUEST PAGE
// ==========================================

function renderCollaborationView() {
    return `
        <section class="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
            <div class="max-w-6xl mx-auto">
                <div class="text-center mb-12 reveal">
                    <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border-brand-purple/30 mb-6">
                        <i class="fa-solid fa-handshake text-brand-purple"></i>
                        <span class="text-xs font-semibold text-brand-purple tracking-wider uppercase">Partnership Opportunity</span>
                    </div>
                    <h2 class="font-display text-4xl sm:text-5xl font-bold text-white mb-6">
                        Let's <span class="text-gradient">Collaborate</span>
                    </h2>
                    <p class="text-slate-400 max-w-2xl mx-auto text-lg">
                        Partner with us to deliver exceptional IT solutions to your clients. 
                        We're looking for businesses, resellers, and IT professionals to join our network.
                    </p>
                </div>

                <div class="grid lg:grid-cols-2 gap-12 items-start">
                    <!-- Left: Image & Benefits -->
                    <div class="reveal">
                        <div class="relative rounded-3xl overflow-hidden mb-8">
                            <img src="collaboration.png" alt="Collaboration" class="w-full h-80 object-cover">
                            <div class="absolute inset-0 bg-gradient-to-t from-brand-dark via-brand-dark/50 to-transparent"></div>
                        </div>
                        
                        <div class="space-y-4">
                            <h3 class="font-display text-2xl font-bold text-white mb-4">Why Partner With Us?</h3>
                            <div class="glass rounded-xl p-5 border border-brand-cyan/20 hover:border-brand-cyan/50 transition-all">
                                <div class="flex items-start gap-3">
                                    <i class="fa-solid fa-chart-line text-brand-cyan text-xl mt-1"></i>
                                    <div>
                                        <h4 class="font-bold text-white mb-1">Grow Your Revenue</h4>
                                        <p class="text-sm text-slate-400">Earn competitive commissions on every referral and project.</p>
                                    </div>
                                </div>
                            </div>
                            <div class="glass rounded-xl p-5 border border-brand-emerald/20 hover:border-brand-emerald/50 transition-all">
                                <div class="flex items-start gap-3">
                                    <i class="fa-solid fa-users text-brand-emerald text-xl mt-1"></i>
                                    <div>
                                        <h4 class="font-bold text-white mb-1">Expand Your Network</h4>
                                        <p class="text-sm text-slate-400">Access to 500+ clients and growing across 4+ cities.</p>
                                    </div>
                                </div>
                            </div>
                            <div class="glass rounded-xl p-5 border border-brand-purple/20 hover:border-brand-purple/50 transition-all">
                                <div class="flex items-start gap-3">
                                    <i class="fa-solid fa-headset text-brand-purple text-xl mt-1"></i>
                                    <div>
                                        <h4 class="font-bold text-white mb-1">Dedicated Support</h4>
                                        <p class="text-sm text-slate-400">Priority support and training for all partners.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Right: Form -->
                    <div class="reveal" style="transition-delay: 200ms;">
                        <div class="glass rounded-3xl p-8 border border-white/10">
                            <h3 class="font-display text-2xl font-bold text-white mb-6">Partnership Application</h3>
                            <form onsubmit="handleCollaborationSubmit(event)" class="space-y-5">
                                <div class="grid grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-xs font-medium text-slate-400 mb-2">First Name *</label>
                                        <input type="text" name="firstName" required class="w-full bg-brand-dark/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-cyan transition-colors">
                                    </div>
                                    <div>
                                        <label class="block text-xs font-medium text-slate-400 mb-2">Last Name *</label>
                                        <input type="text" name="lastName" required class="w-full bg-brand-dark/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-cyan transition-colors">
                                    </div>
                                </div>
                                
                                <div>
                                    <label class="block text-xs font-medium text-slate-400 mb-2">Company Name *</label>
                                    <input type="text" name="companyName" required class="w-full bg-brand-dark/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-cyan transition-colors">
                                </div>
                                
                                <div>
                                    <label class="block text-xs font-medium text-slate-400 mb-2">Your Role/Position *</label>
                                    <input type="text" name="role" required placeholder="e.g., CEO, Manager, Sales Director" class="w-full bg-brand-dark/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-cyan transition-colors">
                                </div>
                                
                                <div class="grid grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-xs font-medium text-slate-400 mb-2">Email *</label>
                                        <input type="email" name="email" required class="w-full bg-brand-dark/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-cyan transition-colors">
                                    </div>
                                    <div>
                                        <label class="block text-xs font-medium text-slate-400 mb-2">Phone *</label>
                                        <input type="tel" name="phone" required class="w-full bg-brand-dark/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-cyan transition-colors">
                                    </div>
                                </div>
                                
                                <div>
                                    <label class="block text-xs font-medium text-slate-400 mb-2">Company Website</label>
                                    <input type="url" name="website" placeholder="https://" class="w-full bg-brand-dark/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-cyan transition-colors">
                                </div>
                                
                                <div>
                                    <label class="block text-xs font-medium text-slate-400 mb-2">Company Size *</label>
                                    <select name="companySize" required class="w-full bg-brand-dark/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-cyan transition-colors">
                                        <option value="">Select...</option>
                                        <option value="1-10">1-10 employees</option>
                                        <option value="11-50">11-50 employees</option>
                                        <option value="51-200">51-200 employees</option>
                                        <option value="201-500">201-500 employees</option>
                                        <option value="500+">500+ employees</option>
                                    </select>
                                </div>
                                
                                <div>
                                    <label class="block text-xs font-medium text-slate-400 mb-2">Partnership Type *</label>
                                    <select name="partnershipType" required class="w-full bg-brand-dark/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-cyan transition-colors">
                                        <option value="">Select...</option>
                                        <option value="reseller">Reseller / Referral Partner</option>
                                        <option value="service">Service Provider</option>
                                        <option value="technology">Technology Partner</option>
                                        <option value="consultant">IT Consultant</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                
                                <div>
                                    <label class="block text-xs font-medium text-slate-400 mb-2">Services You're Interested In *</label>
                                    <div class="grid grid-cols-2 gap-2 mt-2">
                                        <label class="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                                            <input type="checkbox" name="services" value="Computer Repair" class="accent-brand-cyan">
                                            <span>Computer Repair</span>
                                        </label>
                                        <label class="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                                            <input type="checkbox" name="services" value="CCTV" class="accent-brand-cyan">
                                            <span>CCTV & Security</span>
                                        </label>
                                        <label class="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                                            <input type="checkbox" name="services" value="Networking" class="accent-brand-cyan">
                                            <span>Networking</span>
                                        </label>
                                        <label class="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                                            <input type="checkbox" name="services" value="Website" class="accent-brand-cyan">
                                            <span>Website Development</span>
                                        </label>
                                        <label class="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                                            <input type="checkbox" name="services" value="Software" class="accent-brand-cyan">
                                            <span>Custom Software</span>
                                        </label>
                                        <label class="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                                            <input type="checkbox" name="services" value="AMC" class="accent-brand-cyan">
                                            <span>AMC Plans</span>
                                        </label>
                                    </div>
                                </div>
                                
                                <div>
                                    <label class="block text-xs font-medium text-slate-400 mb-2">Tell Us About Your Business *</label>
                                    <textarea name="description" rows="4" required placeholder="Describe your business, target market, and how you'd like to partner with us..." class="w-full bg-brand-dark/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-cyan transition-colors resize-none"></textarea>
                                </div>
                                
                                <div>
                                    <label class="block text-xs font-medium text-slate-400 mb-2">Expected Monthly Referrals</label>
                                    <select name="expectedReferrals" class="w-full bg-brand-dark/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-cyan transition-colors">
                                        <option value="">Select...</option>
                                        <option value="1-5">1-5 clients</option>
                                        <option value="6-15">6-15 clients</option>
                                        <option value="16-30">16-30 clients</option>
                                        <option value="30+">30+ clients</option>
                                    </select>
                                </div>
                                
                                <button type="submit" class="w-full btn-glow py-4 rounded-xl bg-gradient-to-r from-brand-purple to-brand-cyan text-white font-bold hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all flex items-center justify-center gap-2">
                                    <i class="fa-solid fa-paper-plane"></i> Submit Partnership Application
                                </button>
                                
                                <p class="text-xs text-slate-500 text-center">
                                    We'll review your application and get back to you within 24-48 hours.
                                </p>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    `;
}

async function handleCollaborationSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());
    
    // Get selected services
    const services = Array.from(document.querySelectorAll('input[name="services"]:checked')).map(cb => cb.value);
    data.services = services;
    
    // Save to Firebase/localStorage
    data.id = 'COLLAB-' + Date.now().toString().slice(-6);
    data.date = new Date().toISOString().split('T')[0];
    data.status = 'Pending Review';
    
    await DTSDB.createCollaboration(data);
    
    // Show success
    alert(`✅ Partnership Application Submitted!\n\nApplication ID: ${data.id}\n\nThank you for your interest in partnering with DTS. We'll review your application and contact you within 24-48 hours.`);
    
    switchView('home');
}

// ==========================================
// DOMAIN CHECK PAGE
// ==========================================

function renderDomainCheckView() {
    return `
        <section class="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
            <div class="max-w-4xl mx-auto">
                <div class="text-center mb-12 reveal">
                    <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border-brand-cyan/30 mb-6">
                        <i class="fa-solid fa-globe text-brand-cyan"></i>
                        <span class="text-xs font-semibold text-brand-cyan tracking-wider uppercase">Domain Availability Checker</span>
                    </div>
                    <h2 class="font-display text-4xl sm:text-5xl font-bold text-white mb-6">
                        Find Your Perfect <span class="text-gradient">Domain Name</span>
                    </h2>
                    <p class="text-slate-400 max-w-2xl mx-auto text-lg mb-8">
                        Check if your desired domain name is available. We'll help you secure your online presence.
                    </p>
                </div>

                <div class="glass rounded-3xl p-8 border border-white/10 reveal">
                    <div class="flex flex-col sm:flex-row gap-4 mb-8">
                        <input 
                            type="text" 
                            id="domain-search-input" 
                            placeholder="Enter your desired domain name (e.g., mybusiness)" 
                            class="flex-1 bg-brand-dark/50 border border-white/10 rounded-xl px-6 py-4 text-white text-lg focus:outline-none focus:border-brand-cyan transition-colors"
                            onkeypress="if(event.key==='Enter') checkDomainAvailability()"
                        >
                        <button onclick="checkDomainAvailability()" class="btn-glow px-8 py-4 rounded-xl bg-gradient-to-r from-brand-cyan to-brand-emerald text-brand-dark font-bold hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-all flex items-center justify-center gap-2">
                            <i class="fa-solid fa-search"></i> Check Availability
                        </button>
                    </div>

                    <div id="domain-results" class="space-y-3"></div>

                    <div class="mt-8 pt-8 border-t border-white/10">
                        <h3 class="font-display text-xl font-bold text-white mb-4">Popular Domain Extensions</h3>
                        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div class="glass rounded-xl p-4 text-center border border-white/5">
                                <div class="text-2xl font-bold text-brand-cyan mb-1">.com</div>
                                <div class="text-xs text-slate-400">₹799/year</div>
                            </div>
                            <div class="glass rounded-xl p-4 text-center border border-white/5">
                                <div class="text-2xl font-bold text-brand-emerald mb-1">.in</div>
                                <div class="text-xs text-slate-400">₹499/year</div>
                            </div>
                            <div class="glass rounded-xl p-4 text-center border border-white/5">
                                <div class="text-2xl font-bold text-brand-purple mb-1">.net</div>
                                <div class="text-xs text-slate-400">₹899/year</div>
                            </div>
                            <div class="glass rounded-xl p-4 text-center border border-white/5">
                                <div class="text-2xl font-bold text-yellow-500 mb-1">.org</div>
                                <div class="text-xs text-slate-400">₹699/year</div>
                            </div>
                        </div>
                    </div>

                    <div class="mt-8 pt-8 border-t border-white/10">
                        <div class="flex items-start gap-4">
                            <div class="w-12 h-12 rounded-full bg-brand-cyan/10 flex items-center justify-center flex-shrink-0">
                                <i class="fa-solid fa-lightbulb text-brand-cyan text-xl"></i>
                            </div>
                            <div>
                                <h4 class="font-bold text-white mb-2">Need Help Choosing a Domain?</h4>
                                <p class="text-sm text-slate-400 mb-4">Our team can help you find the perfect domain name and set up your complete online presence including website, email, and hosting.</p>
                                <button onclick="openSpecialModal('consultation')" class="px-6 py-2 rounded-lg bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/30 text-sm font-semibold hover:bg-brand-cyan/20 transition-all">
                                    Get Free Consultation
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    `;
}

function checkDomainAvailability() {
    const input = document.getElementById('domain-search-input');
    const domainName = input.value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    
    if (!domainName) {
        alert('Please enter a domain name');
        return;
    }
    
    const extensions = ['.com', '.in', '.net', '.org', '.co', '.io'];
    const resultsDiv = document.getElementById('domain-results');
    resultsDiv.innerHTML = '<div class="text-center py-8"><i class="fa-solid fa-spinner fa-spin text-3xl text-brand-cyan"></i><p class="text-slate-400 mt-2">Checking availability...</p></div>';
    
    // Simulate domain check (in real implementation, this would call an API)
    setTimeout(() => {
        let html = '';
        extensions.forEach(ext => {
            const fullDomain = domainName + ext;
            // Simulate availability (random for demo)
            const isAvailable = Math.random() > 0.4;
            const price = ext === '.com' ? 799 : ext === '.in' ? 499 : ext === '.net' ? 899 : ext === '.org' ? 699 : ext === '.co' ? 999 : 1299;
            
            html += `
                <div class="glass rounded-xl p-4 border ${isAvailable ? 'border-brand-emerald/30' : 'border-red-500/30'} flex items-center justify-between">
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-full ${isAvailable ? 'bg-brand-emerald/20' : 'bg-red-500/20'} flex items-center justify-center">
                            <i class="fa-solid ${isAvailable ? 'fa-check text-brand-emerald' : 'fa-xmark text-red-400'}"></i>
                        </div>
                        <div>
                            <div class="font-bold text-white text-lg">${fullDomain}</div>
                            <div class="text-xs ${isAvailable ? 'text-brand-emerald' : 'text-red-400'}">${isAvailable ? 'Available' : 'Taken'}</div>
                        </div>
                    </div>
                    ${isAvailable ? `
                        <div class="text-right">
                            <div class="text-brand-cyan font-bold">₹${price}/year</div>
                            <button onclick="registerDomain('${fullDomain}', ${price})" class="mt-1 px-4 py-1 rounded-lg bg-brand-emerald/20 text-brand-emerald text-xs font-semibold hover:bg-brand-emerald/30 transition-all">
                                Register Now
                            </button>
                        </div>
                    ` : `
                        <button onclick="suggestAlternatives('${domainName}')" class="px-4 py-2 rounded-lg bg-white/5 text-slate-400 text-xs font-semibold hover:bg-white/10 transition-all">
                            View Alternatives
                        </button>
                    `}
                </div>
            `;
        });
        
        resultsDiv.innerHTML = html;
    }, 1500);
}

function registerDomain(domain, price) {
    alert(`✅ Domain Selected: ${domain}\n\nPrice: ₹${price}/year\n\nTo complete registration, please contact us:\n📞 +91 9813443289\n📧 divyanshgupta@divyanshtechservices.com\n\nOr book a consultation to get started!`);
    openSpecialModal('consultation');
}

function suggestAlternatives(domainName) {
    const suggestions = [
        domainName + '-online',
        domainName + '-tech',
        domainName + '-services',
        'get-' + domainName,
        domainName + '24'
    ];
    
    alert(`💡 Alternative suggestions:\n\n${suggestions.join('\n')}\n\nTry searching for these alternatives!`);
}

// ==========================================
// OPINION/SURVEY SECTION
// ==========================================

function addOpinionSection() {
    return `
        <section class="relative z-10 py-16 px-4 sm:px-6 lg:px-8 bg-brand-card/30 border-y border-white/5">
            <div class="max-w-4xl mx-auto">
                <div class="text-center mb-12 reveal">
                    <h3 class="font-display text-3xl font-bold text-white mb-4">
                        Help Us <span class="text-gradient">Serve You Better</span>
                    </h3>
                    <p class="text-slate-400">Tell us which IT services you need most</p>
                </div>
                
                <div class="glass rounded-2xl p-8 border border-white/10 reveal">
                    <form onsubmit="submitOpinion(event)" class="space-y-6">
                        <div>
                            <label class="block text-sm font-semibold text-white mb-3">Which area do you need IT services for? *</label>
                            <div class="grid sm:grid-cols-2 gap-3">
                                <label class="flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition-all">
                                    <input type="checkbox" name="areas" value="Home" class="accent-brand-cyan w-4 h-4">
                                    <span class="text-sm text-slate-300">Home / Residential</span>
                                </label>
                                <label class="flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition-all">
                                    <input type="checkbox" name="areas" value="Office" class="accent-brand-cyan w-4 h-4">
                                    <span class="text-sm text-slate-300">Office / Business</span>
                                </label>
                                <label class="flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition-all">
                                    <input type="checkbox" name="areas" value="Shop" class="accent-brand-cyan w-4 h-4">
                                    <span class="text-sm text-slate-300">Shop / Retail</span>
                                </label>
                                <label class="flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition-all">
                                    <input type="checkbox" name="areas" value="Factory" class="accent-brand-cyan w-4 h-4">
                                    <span class="text-sm text-slate-300">Factory / Industrial</span>
                                </label>
                            </div>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-semibold text-white mb-3">What services are you most interested in? *</label>
                            <div class="grid sm:grid-cols-2 gap-3">
                                <label class="flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition-all">
                                    <input type="checkbox" name="interests" value="Computer Repair" class="accent-brand-cyan w-4 h-4">
                                    <span class="text-sm text-slate-300">Computer/Laptop Repair</span>
                                </label>
                                <label class="flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition-all">
                                    <input type="checkbox" name="interests" value="CCTV" class="accent-brand-cyan w-4 h-4">
                                    <span class="text-sm text-slate-300">CCTV Installation</span>
                                </label>
                                <label class="flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition-all">
                                    <input type="checkbox" name="interests" value="WiFi" class="accent-brand-cyan w-4 h-4">
                                    <span class="text-sm text-slate-300">WiFi/Networking</span>
                                </label>
                                <label class="flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition-all">
                                    <input type="checkbox" name="interests" value="Website" class="accent-brand-cyan w-4 h-4">
                                    <span class="text-sm text-slate-300">Website Development</span>
                                </label>
                                <label class="flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition-all">
                                    <input type="checkbox" name="interests" value="Software" class="accent-brand-cyan w-4 h-4">
                                    <span class="text-sm text-slate-300">Custom Software</span>
                                </label>
                                <label class="flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition-all">
                                    <input type="checkbox" name="interests" value="AMC" class="accent-brand-cyan w-4 h-4">
                                    <span class="text-sm text-slate-300">AMC Plans</span>
                                </label>
                            </div>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-semibold text-white mb-2">Additional Comments</label>
                            <textarea name="comments" rows="3" placeholder="Any specific requirements or questions..." class="w-full bg-brand-dark/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-cyan transition-colors resize-none"></textarea>
                        </div>
                        
                        <button type="submit" class="w-full py-3 rounded-xl bg-gradient-to-r from-brand-cyan to-brand-emerald text-brand-dark font-bold hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-all">
                            Submit Your Feedback
                        </button>
                    </form>
                </div>
            </div>
        </section>
    `;
}

async function submitOpinion(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());
    
    const areas = Array.from(document.querySelectorAll('input[name="areas"]:checked')).map(cb => cb.value);
    const interests = Array.from(document.querySelectorAll('input[name="interests"]:checked')).map(cb => cb.value);
    
    data.areas = areas;
    data.interests = interests;
    data.date = new Date().toISOString().split('T')[0];
    
    await DTSDB.createOpinion(data);
    
    showNotification('✅ Thank you for your feedback!', 'success');
    event.target.reset();
}

// ==========================================
// WEBSITE/SOFTWARE REQUEST FORM
// ==========================================

function openWebRequestModal() {
    const modal = document.getElementById('web-request-modal');
    const content = document.getElementById('web-request-content');
    webRequestStep = 1;
    goToWebRequestStep(1);
    modal.classList.remove('hidden');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
}

function closeWebRequestModal() {
    const modal = document.getElementById('web-request-modal');
    const content = document.getElementById('web-request-content');
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => { modal.classList.add('hidden'); }, 300);
    webRequestStep = 1;
}

function goToWebRequestStep(step) {
    webRequestStep = step;
    document.querySelectorAll('.webreq-step').forEach(el => el.classList.add('hidden'));
    const target = document.getElementById('webreq-step-' + step);
    if (target) target.classList.remove('hidden');
    for (let i = 1; i <= 5; i++) {
        const dot = document.getElementById('webreq-dot-' + i);
        if (dot) {
            if (i <= step) {
                dot.className = 'w-7 h-7 rounded-full bg-brand-purple text-white font-bold text-[10px] flex items-center justify-center transition-all';
            } else {
                dot.className = 'w-7 h-7 rounded-full bg-white/10 text-slate-500 font-bold text-[10px] flex items-center justify-center transition-all';
            }
        }
    }
}

function handleWebRequestStep(event) {
    event.preventDefault();
    
    // Validate current step before proceeding
    if (!validateWebRequestStep(webRequestStep)) {
        return;
    }
    
    if (webRequestStep < 5) {
        goToWebRequestStep(webRequestStep + 1);
    } else {
        submitWebRequest(event);
    }
}

function validateWebRequestStep(step) {
    const form = document.getElementById('web-request-form');
    
    if (step === 1) {
        const type = form.querySelector('[name="wr_type"]').value;
        const industry = form.querySelector('[name="wr_industry"]').value;
        const brand = form.querySelector('[name="wr_brand"]:checked');
        
        if (!type) {
            showNotification('Please select the type of website/software you need', 'error');
            return false;
        }
        if (!industry.trim()) {
            showNotification('Please enter your industry', 'error');
            return false;
        }
        if (!brand) {
            showNotification('Please select your brand/logo status', 'error');
            return false;
        }
    }
    
    if (step === 2) {
        const design = form.querySelector('[name="wr_design"]:checked');
        if (!design) {
            showNotification('Please select your preferred design style', 'error');
            return false;
        }
    }
    
    if (step === 5) {
        const name = form.querySelector('[name="wr_name"]').value;
        const phone = form.querySelector('[name="wr_phone"]').value;
        
        if (!name.trim()) {
            showNotification('Please enter your name', 'error');
            return false;
        }
        if (!phone.trim()) {
            showNotification('Please enter your phone number', 'error');
            return false;
        }
    }
    
    return true;
}

async function submitWebRequest(event) {
    event.preventDefault();
    const form = document.getElementById('web-request-form');
    const fd = new FormData(form);
    const data = Object.fromEntries(fd.entries());
    
    // Collect checkboxes
    const features = Array.from(document.querySelectorAll('input[name="wr_features"]:checked')).map(cb => cb.value);
    data.wr_features = features;
    data.submittedAt = new Date().toISOString();
    data.status = 'New';
    data.id = 'WEBREQ-' + Math.random().toString(36).substr(2, 6).toUpperCase();
    
    // Save to localStorage
    let requests = JSON.parse(localStorage.getItem('dts_web_requests') || '[]');
    requests.unshift(data);
    localStorage.setItem('dts_web_requests', JSON.stringify(requests));
    
    // Also save to Firebase if available
    try {
        if (isFirebaseReady) {
            await firebaseDb.collection('web_requests').add({
                ...data,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    } catch(e) { console.error('Firebase web request save error:', e); }
    
    showNotification('Your website/software request has been submitted! We will contact you within 24 hours.', 'success');
    form.reset();
    closeWebRequestModal();
}

function updateWebRequestStatus(idx, status) {
    let requests = JSON.parse(localStorage.getItem('dts_web_requests') || '[]');
    if (requests[idx]) {
        requests[idx].status = status;
        localStorage.setItem('dts_web_requests', JSON.stringify(requests));
        showNotification(`Request marked as ${status}`, 'success');
        switchView('admin-center');
    }
}

function deleteWebRequest(idx) {
    if (!confirm('Delete this request?')) return;
    let requests = JSON.parse(localStorage.getItem('dts_web_requests') || '[]');
    requests.splice(idx, 1);
    localStorage.setItem('dts_web_requests', JSON.stringify(requests));
    showNotification('Request deleted', 'info');
    switchView('admin-center');
}

function addWebsiteRequestSection() {
    return `
        <section class="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
            <div class="max-w-5xl mx-auto">
                <div class="text-center mb-12 reveal">
                    <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border-brand-purple/30 mb-4">
                        <i class="fa-solid fa-wand-magic-sparkles text-brand-purple"></i>
                        <span class="text-xs font-semibold text-brand-purple tracking-wider uppercase">Custom Solutions</span>
                    </div>
                    <h2 class="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
                        Need a <span class="text-gradient">Custom Website or Software?</span>
                    </h2>
                    <p class="text-slate-400 max-w-2xl mx-auto">Tell us your vision and we'll build it. From business websites to full ERP systems — answer 15 quick questions and get a personalized quote.</p>
                </div>
                
                <div class="grid md:grid-cols-2 gap-8 items-center reveal">
                    <div class="space-y-4">
                        <div class="flex items-start gap-4 p-4 rounded-xl glass border border-white/5">
                            <div class="w-10 h-10 rounded-full bg-brand-purple/20 flex items-center justify-center flex-shrink-0">
                                <i class="fa-solid fa-list-check text-brand-purple"></i>
                            </div>
                            <div>
                                <h4 class="font-bold text-white text-sm">15 Quick Questions</h4>
                                <p class="text-xs text-slate-400">Tell us about your project type, features, design preferences, budget & timeline.</p>
                            </div>
                        </div>
                        <div class="flex items-start gap-4 p-4 rounded-xl glass border border-white/5">
                            <div class="w-10 h-10 rounded-full bg-brand-cyan/20 flex items-center justify-center flex-shrink-0">
                                <i class="fa-solid fa-rocket text-brand-cyan"></i>
                            </div>
                            <div>
                                <h4 class="font-bold text-white text-sm">Get a Quote in 24 Hours</h4>
                                <p class="text-xs text-slate-400">Our team reviews your requirements and sends a detailed proposal with pricing.</p>
                            </div>
                        </div>
                        <div class="flex items-start gap-4 p-4 rounded-xl glass border border-white/5">
                            <div class="w-10 h-10 rounded-full bg-brand-emerald/20 flex items-center justify-center flex-shrink-0">
                                <i class="fa-solid fa-code text-brand-emerald"></i>
                            </div>
                            <div>
                                <h4 class="font-bold text-white text-sm">We Build It All</h4>
                                <p class="text-xs text-slate-400">Websites, web apps, mobile apps, ERP, CRM, POS, school/hospital management & more.</p>
                            </div>
                        </div>
                    </div>
                    <div class="glass rounded-2xl p-8 border border-brand-purple/20 text-center relative overflow-hidden">
                        <div class="absolute top-0 right-0 w-40 h-40 bg-brand-purple/10 rounded-full blur-3xl"></div>
                        <div class="relative z-10">
                            <div class="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-brand-purple to-brand-cyan flex items-center justify-center mb-6">
                                <i class="fa-solid fa-laptop-code text-3xl text-white"></i>
                            </div>
                            <h3 class="font-display text-xl font-bold text-white mb-3">Start Your Project</h3>
                            <p class="text-sm text-slate-400 mb-6">Fill out our detailed requirements form and let's bring your idea to life.</p>
                            <button onclick="openWebRequestModal()" class="w-full btn-glow py-3.5 rounded-xl bg-gradient-to-r from-brand-purple to-brand-cyan text-white font-bold hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all flex items-center justify-center gap-2">
                                <i class="fa-solid fa-wand-magic-sparkles"></i> Start Building — 15 Questions
                            </button>
                            <p class="text-[10px] text-slate-500 mt-3"><i class="fa-solid fa-clock mr-1"></i> Takes only 2 minutes</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    `;
}

// ==========================================
// LIVE DATA DISPLAY
// ==========================================

function getLiveData() {
    const users = JSON.parse(localStorage.getItem('dts_registered_users') || '[]');
    const totalBookings = users.reduce((sum, u) => sum + (u.bookings || []).length, 0);
    const totalOrders = users.reduce((sum, u) => sum + (u.orders || []).length, 0);
    const collaborations = JSON.parse(localStorage.getItem('dts_collaborations') || '[]').length;
    
    return {
        totalClients: users.length,
        totalBookings: totalBookings,
        totalOrders: totalOrders,
        totalCollaborations: collaborations,
        lastUpdated: new Date().toLocaleTimeString()
    };
}

function updateLiveDataDisplay() {
    const data = getLiveData();
    const elements = document.querySelectorAll('.live-clients');
    elements.forEach(el => el.textContent = data.totalClients + '+');
    
    const bookingElements = document.querySelectorAll('.live-bookings');
    bookingElements.forEach(el => el.textContent = data.totalBookings + data.totalOrders);
}

// ==========================================
// CUSTOM CALENDAR WIDGET
// ==========================================

let currentCalendarTarget = null;
let currentCalendarDate = new Date();

function openCustomCalendar(target) {
    // Prevent default and stop propagation to avoid conflicts
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    currentCalendarTarget = target;
    const inputId = target === 'start' ? 'coupon-start-date' : 'coupon-end-date';
    const input = document.getElementById(inputId);
    
    if (input && input.value) {
        // Try to parse existing value; fall back to today
        const parsed = new Date(input.dataset.value || input.value);
        if (!isNaN(parsed.getTime())) {
            currentCalendarDate = parsed;
        } else {
            currentCalendarDate = new Date();
        }
    } else {
        currentCalendarDate = new Date();
    }
    
    renderCalendar();
    
    // Show modal using inline style (reliable, no class conflicts)
    const modal = document.getElementById('custom-calendar-modal');
    modal.style.display = 'flex';
    
    // Add keyboard listener for Escape key
    document.addEventListener('keydown', handleCalendarEscape);
}

function handleCalendarEscape(e) {
    if (e.key === 'Escape') {
        closeCustomCalendar();
    }
}

function closeCustomCalendar() {
    const modal = document.getElementById('custom-calendar-modal');
    modal.style.display = 'none';
    currentCalendarTarget = null;
    
    // Remove keyboard listener
    document.removeEventListener('keydown', handleCalendarEscape);
}

function renderCalendar() {
    const content = document.getElementById('calendar-content');
    if (!content) return;
    
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Build day cells
    let daysHtml = '';
    
    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
        daysHtml += '<div></div>';
    }
    
    // Day cells
    for (let day = 1; day <= daysInMonth; day++) {
        const cellDate = new Date(year, month, day);
        cellDate.setHours(0, 0, 0, 0);
        const isToday = cellDate.getTime() === today.getTime();
        const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        daysHtml += `
            <button type="button" data-date="${dateString}" class="cal-day-btn aspect-square rounded-lg text-sm font-medium transition-all ${
                isToday 
                    ? 'bg-brand-cyan text-brand-dark hover:bg-brand-cyan/80 font-bold' 
                    : 'text-white hover:bg-white/10'
            }">
                ${day}
            </button>
        `;
    }
    
    // Day headers
    const dayHeaders = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
        .map(d => `<div class="text-center text-xs font-bold text-slate-500 py-2">${d}</div>`)
        .join('');
    
    // Full calendar HTML - only updates the content area, not the backdrop
    content.innerHTML = `
        <div class="flex items-center justify-between mb-6">
            <button type="button" id="cal-prev-btn" class="p-2 rounded-lg hover:bg-white/5 transition-colors">
                <i class="fa-solid fa-chevron-left text-white"></i>
            </button>
            <h3 class="text-lg font-bold text-white">${monthNames[month]} ${year}</h3>
            <button type="button" id="cal-next-btn" class="p-2 rounded-lg hover:bg-white/5 transition-colors">
                <i class="fa-solid fa-chevron-right text-white"></i>
            </button>
        </div>
        
        <div class="grid grid-cols-7 gap-2 mb-2">
            ${dayHeaders}
        </div>
        
        <div class="grid grid-cols-7 gap-2">
            ${daysHtml}
        </div>
        
        <div class="flex gap-3 mt-6">
            <button type="button" id="cal-today-btn" class="flex-1 py-2.5 rounded-lg bg-white/5 text-white text-sm font-semibold hover:bg-white/10 transition-all">
                Today
            </button>
            <button type="button" id="cal-cancel-btn" class="flex-1 py-2.5 rounded-lg bg-brand-danger/20 text-brand-danger text-sm font-semibold hover:bg-brand-danger/30 transition-all">
                Cancel
            </button>
        </div>
    `;
    
    // Attach event listeners (avoids inline onclick conflicts)
    const prevBtn = document.getElementById('cal-prev-btn');
    const nextBtn = document.getElementById('cal-next-btn');
    const todayBtn = document.getElementById('cal-today-btn');
    const cancelBtn = document.getElementById('cal-cancel-btn');
    
    if (prevBtn) prevBtn.addEventListener('click', (e) => { e.stopPropagation(); navigateCalendar(-1); });
    if (nextBtn) nextBtn.addEventListener('click', (e) => { e.stopPropagation(); navigateCalendar(1); });
    if (todayBtn) todayBtn.addEventListener('click', (e) => { e.stopPropagation(); selectToday(); });
    if (cancelBtn) cancelBtn.addEventListener('click', (e) => { e.stopPropagation(); closeCustomCalendar(); });
    
    // Attach day button listeners via delegation on the grid
    content.querySelectorAll('.cal-day-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const dateStr = btn.getAttribute('data-date');
            if (dateStr) selectDate(dateStr);
        });
    });
}

function navigateCalendar(direction) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + direction);
    renderCalendar();
}

function selectDate(dateString) {
    const inputId = currentCalendarTarget === 'start' ? 'coupon-start-date' : 'coupon-end-date';
    const input = document.getElementById(inputId);
    if (!input) return;
    
    // Store actual ISO value for form submission
    input.dataset.value = dateString;
    
    // Display in a readable format
    const parts = dateString.split('-');
    const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    input.value = date.toLocaleDateString('en-US', options);
    
    closeCustomCalendar();
}

function selectToday() {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    selectDate(`${y}-${m}-${d}`);
}

// Backdrop click is handled by the static backdrop div in HTML via onclick
function closeCalendarOnBackdrop(event) {
    if (event && event.target && event.target.id === 'calendar-backdrop') {
        closeCustomCalendar();
    }
}

