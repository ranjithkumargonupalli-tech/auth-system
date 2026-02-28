// ==================== UTILITIES ====================
function showMessage(elementId, message, isSuccess = true) {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = message;
        el.className = 'message ' + (isSuccess ? 'success' : 'error');
        el.style.display = 'block';
    }
}

function clearMessages() {
    ['loginMessage', 'otpRequestMessage', 'registerMessage', 
     'aboutMessage', 'socialMessage', 'passwordMessage', 
     '2faMessage', 'deleteMessage', 'usernameMessage'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = '';
            el.style.display = 'none';
        }
    });
}

// ==================== PASSWORD VISIBILITY TOGGLE ====================
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('toggle-password')) {
        const icon = e.target;
        const targetId = icon.getAttribute('data-target');
        const passwordInput = document.getElementById(targetId);
        
        if (passwordInput) {
            // Toggle input type
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            // Toggle icon class
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
        }
    }
});

// ==================== TOGGLE FORMS (Index page) ====================
// Show OTP request card (from login)
if (document.getElementById('showOtpRequest')) {
    document.getElementById('showOtpRequest').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('loginCard').classList.add('hidden');
        document.getElementById('otpRequestCard').classList.remove('hidden');
        document.getElementById('otpRequestMessage').textContent = '';
    });
}

// Back to login from OTP request
if (document.getElementById('backToLoginFromOtp')) {
    document.getElementById('backToLoginFromOtp').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('otpRequestCard').classList.add('hidden');
        document.getElementById('loginCard').classList.remove('hidden');
        document.getElementById('otpRequestMessage').textContent = '';
    });
}

// From register card back to OTP request (to change email)
if (document.getElementById('backToOtpRequest')) {
    document.getElementById('backToOtpRequest').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('registerCard').classList.add('hidden');
        document.getElementById('otpRequestCard').classList.remove('hidden');
        document.getElementById('registerMessage').textContent = '';
    });
}

// Legacy toggles (fallback)
if (document.getElementById('showRegister')) {
    document.getElementById('showRegister').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('loginCard').classList.add('hidden');
        document.getElementById('registerCard').classList.remove('hidden');
    });
}

if (document.getElementById('showLogin')) {
    document.getElementById('showLogin').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('registerCard').classList.add('hidden');
        document.getElementById('loginCard').classList.remove('hidden');
    });
}

// ==================== LOGIN ====================
// ==================== LOGIN (Enhanced Validation) ====================
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearMessages();

        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;

        // Client-side validation
        if (!username) {
            showMessage('loginMessage', 'Username is required', false);
            return;
        }
        if (!password) {
            showMessage('loginMessage', 'Password is required', false);
            return;
        }

        try {
            const res = await fetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const text = await res.text();
            if (res.ok) {
                showMessage('loginMessage', 'Login successful! Redirecting...', true);
                setTimeout(() => window.location.href = '/dashboard.html', 1000);
            } else {
                // Show server error message (e.g., "Invalid username or password")
                showMessage('loginMessage', text, false);
            }
        } catch (err) {
            showMessage('loginMessage', 'Network error. Please try again.', false);
        }
    });
}
// ==================== OTP REQUEST ====================
const otpRequestForm = document.getElementById('otpRequestForm');
if (otpRequestForm) {
    otpRequestForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearMessages();

        const email = document.getElementById('otpEmail').value;

        try {
            const res = await fetch('/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const text = await res.text();
            if (res.ok) {
                showMessage('otpRequestMessage', 'OTP sent! Check your email.', true);
                // Show registration card and pre-fill email
                document.getElementById('otpRequestCard').classList.add('hidden');
                document.getElementById('registerCard').classList.remove('hidden');
                document.getElementById('regEmail').value = email;
            } else {
                showMessage('otpRequestMessage', text, false);
            }
        } catch (err) {
            showMessage('otpRequestMessage', 'Network error', false);
        }
    });
}

// ==================== REGISTER (with OTP) ====================
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearMessages();

        const username = document.getElementById('regUsername').value;
        const password = document.getElementById('regPassword').value;
        const otp = document.getElementById('regOtp').value;
        const email = document.getElementById('regEmail').value; // hidden field

        if (!email) {
            showMessage('registerMessage', 'Email missing. Please request OTP again.', false);
            return;
        }

        try {
            const res = await fetch('/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password, otp })
            });
            const text = await res.text();
            if (res.ok) {
                showMessage('registerMessage', 'Registration successful! Redirecting...', true);
                setTimeout(() => window.location.href = '/dashboard.html', 1500);
            } else {
                showMessage('registerMessage', text, false);
            }
        } catch (err) {
            showMessage('registerMessage', 'Network error', false);
        }
    });
}

// ==================== SESSION & NAVIGATION ====================
async function checkSession() {
    try {
        const res = await fetch('/check-session');
        const data = await res.json();
        if (data.loggedIn) {
            fetchUserRole();
            return data;
        } else {
            if (!window.location.pathname.includes('index.html') && window.location.pathname !== '/') {
                window.location.href = '/';
            }
            return null;
        }
    } catch (err) {
        console.error(err);
        return null;
    }
}

async function fetchUserRole() {
    try {
        const res = await fetch('/profile');
        if (res.ok) {
            const user = await res.json();
            if (user.role === 'admin') {
                document.getElementById('adminLink')?.classList.remove('hidden');
            }
            localStorage.setItem('userRole', user.role);
        }
    } catch (err) {
        console.error(err);
    }
}

// ==================== DASHBOARD ====================
if (window.location.pathname.includes('dashboard.html')) {
    (async () => {
        const session = await checkSession();
        if (session) {
            document.getElementById('welcomeMessage').textContent = `Hello, ${session.username}!`;
        }
    })();
}

// ==================== PROFILE PAGE (Enhanced) ====================
if (window.location.pathname.includes('profile.html')) {
    (async () => {
        const session = await checkSession();
        if (!session) return;

        await loadProfile();

        // Avatar upload
        document.getElementById('avatarUpload').addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const formData = new FormData();
            formData.append('avatar', file);
            try {
                const res = await fetch('/profile/avatar', {
                    method: 'POST',
                    body: formData
                });
                const text = await res.text();
                if (res.ok) {
                    showMessage('aboutMessage', 'Avatar updated successfully', true);
                    loadProfile();
                } else {
                    showMessage('aboutMessage', text, false);
                }
            } catch (err) {
                showMessage('aboutMessage', 'Upload failed', false);
            }
        });

        // About form
        document.getElementById('aboutForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const display_name = document.getElementById('displayName').value;
            const bio = document.getElementById('bio').value;
            const phone = document.getElementById('phone').value;
            const res = await fetch('/profile/update', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ display_name, bio, phone })
            });
            const text = await res.text();
            showMessage('aboutMessage', text, res.ok);
            if (res.ok) loadProfile();
        });

        // Social form
        document.getElementById('socialForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const github = document.getElementById('github').value;
            const twitter = document.getElementById('twitter').value;
            const linkedin = document.getElementById('linkedin').value;
            const res = await fetch('/profile/update', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ github, twitter, linkedin })
            });
            const text = await res.text();
            showMessage('socialMessage', text, res.ok);
            if (res.ok) loadProfile();
        });

        // Change password
        document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const res = await fetch('/profile/password', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword, newPassword })
            });
            const text = await res.text();
            showMessage('passwordMessage', text, res.ok);
            if (res.ok) {
                document.getElementById('currentPassword').value = '';
                document.getElementById('newPassword').value = '';
            }
        });

        // Toggle 2FA
        document.getElementById('toggle2faBtn').addEventListener('click', async () => {
            const res = await fetch('/profile/toggle-2fa', { method: 'POST' });
            const text = await res.text();
            showMessage('2faMessage', text, res.ok);
            loadProfile();
        });

        // Delete account
        document.getElementById('deleteAccountBtn').addEventListener('click', async () => {
            if (!confirm('Are you absolutely sure? This will permanently delete your account and all data.')) return;
            const res = await fetch('/profile/delete', { method: 'DELETE' });
            const text = await res.text();
            if (res.ok) {
                alert('Account deleted. You will be logged out.');
                window.location.href = '/';
            } else {
                showMessage('deleteMessage', text, false);
            }
        });

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
                document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
            });
        });
    })();
}

// Load profile data (used in profile page)
async function loadProfile() {
    try {
        const res = await fetch('/profile/full');
        const user = await res.json();
        document.getElementById('profileUsername').textContent = user.username;
        document.getElementById('profileEmail').value = user.email || '';
        document.getElementById('displayName').value = user.display_name || '';
        document.getElementById('bio').value = user.bio || '';
        document.getElementById('phone').value = user.phone || '';
        document.getElementById('github').value = user.github || '';
        document.getElementById('twitter').value = user.twitter || '';
        document.getElementById('linkedin').value = user.linkedin || '';
        document.getElementById('profileDisplayName').textContent = user.display_name || user.username;

        const badge = document.getElementById('emailVerifiedBadge');
        if (user.email_verified) {
            badge.className = 'badge verified';
            badge.innerHTML = '<i class="fas fa-check-circle"></i> Email Verified';
        } else {
            badge.className = 'badge unverified';
            badge.innerHTML = '<i class="fas fa-times-circle"></i> Not Verified';
        }

        if (user.avatar_url) {
            document.getElementById('avatarPreview').src = user.avatar_url;
        } else {
            document.getElementById('avatarPreview').src = 'https://via.placeholder.com/120';
        }

        const twofaBtn = document.getElementById('toggle2faBtn');
        twofaBtn.textContent = user.two_factor_enabled ? 'Disable 2FA' : 'Enable 2FA';
    } catch (err) {
        console.error('Error loading profile:', err);
    }
}

// ==================== ADMIN PAGE ====================
// ==================== ADMIN PAGE ====================
if (window.location.pathname.includes('admin.html')) {
    (async () => {
        const session = await checkSession();
        if (!session) return;

        try {
            const res = await fetch('/admin/users');
            if (!res.ok) {
                if (res.status === 403) {
                    alert('Access denied. Admins only.');
                    window.location.href = '/dashboard.html';
                }
                return;
            }
            const users = await res.json();
            const tbody = document.getElementById('userTableBody');
            tbody.innerHTML = '';
            users.forEach(user => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${user.id}</td>
                    <td>${user.username}</td>
                    <td>${user.email}</td>
                    <td>${user.role}</td>
                    <td>${new Date(user.created_at).toLocaleString()}</td>
                    <td style="max-width: 200px; overflow: auto;">••••••••</td>
                    <td>
                        <button class="btn small" onclick="deleteUser(${user.id})">Delete</button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        } catch (err) {
            console.error(err);
        }
    })();
}
// Delete user function (global for onclick)
window.deleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
        const res = await fetch(`/admin/users/${userId}`, { method: 'DELETE' });
        const text = await res.text();
        alert(text);
        if (res.ok) location.reload();
    } catch (err) {
        alert('Error deleting user');
    }
};

// ==================== LOGOUT ====================
document.addEventListener('click', async (e) => {
    if (e.target.id === 'logoutBtn' || e.target.closest('#logoutBtn')) {
        e.preventDefault();
        await fetch('/logout', { method: 'POST' });
        window.location.href = '/';
    }
});

// ==================== INITIAL CHECK ====================
if (!window.location.pathname.includes('index.html') && window.location.pathname !== '/') {
    checkSession();
}

// Show admin link based on role (on all pages)
if (localStorage.getItem('userRole') === 'admin') {
    document.getElementById('adminLink')?.classList.remove('hidden');
}