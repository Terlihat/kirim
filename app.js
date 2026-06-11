import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const SUPABASE_URL = 'https://qbklpsiiwnoyvnuzizqn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFia2xwc2lpd25veXZudXppenFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExOTk0ODUsImV4cCI6MjA5Njc3NTQ4NX0.sm6xp1xRWaJCYZRlaYBTqAu4nDxR4MhpNN4O7IyjpqM';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM Elements
const themeToggle = document.getElementById('theme-toggle');
const textInput = document.getElementById('text-input');
const btnSave = document.getElementById('btn-save');
const expireSelect = document.getElementById('expire-select');
const formatSelect = document.getElementById('format-select');
const customUrlInput = document.getElementById('custom-url');
const passwordInput = document.getElementById('password-input');
const isBurnCheckbox = document.getElementById('is-burn');
const linkContainer = document.getElementById('link-container');
const shareLinkInput = document.getElementById('share-link');
const btnCopy = document.getElementById('btn-copy');
const statusText = document.getElementById('status-text');

// Sections
const editorSection = document.getElementById('editor-section');
const passwordSection = document.getElementById('password-section');
const readSection = document.getElementById('read-section');
const codeWrapper = document.getElementById('code-wrapper');
const codeOutput = document.getElementById('code-output');
const markdownOutput = document.getElementById('markdown-output');
const readPasswordInput = document.getElementById('read-password');
const btnUnlock = document.getElementById('btn-unlock');
const viewCountSpan = document.getElementById('view-count');
const btnCopyContent = document.getElementById('btn-copy-content');

// Auth DOM Elements
const authStatusBar = document.getElementById('auth-status-bar');
const btnShowAuth = document.getElementById('btn-show-auth');
const authSection = document.getElementById('auth-section');
const authTitle = document.getElementById('auth-title');
const authEmail = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');
const btnAuthPrimary = document.getElementById('btn-auth-primary');
const switchToRegister = document.getElementById('switch-to-register');
const authToggleText = document.getElementById('auth-toggle-text');
const btnCloseAuth = document.getElementById('btn-close-auth');

// Dashboard DOM Elements
const dashboardSection = document.getElementById('dashboard-section');
const dashboardList = document.getElementById('dashboard-list');
const btnViewDashboard = document.getElementById('btn-view-dashboard');
const btnBackToEditor = document.getElementById('btn-back-to-editor');

let globalContentText = ""; 
let currentUser = null; 
let isLoginMode = true; // Menandai form: true = Login, false = Register

// ==========================================
// THEME SWITCHER (DARK MODE)
// ==========================================
if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-mode');
    themeToggle.innerText = '☀️ Mode Terang';
}
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    themeToggle.innerText = isDark ? '☀️ Mode Terang' : '🌙 Mode Gelap';
});

// ==========================================
// SUPABASE AUTHENTICATION LOGIC (SISTEM AKUN)
// ==========================================

// Memantau perubahan status akun (Login / Logout / Daftar)
supabase.auth.onAuthStateChange((event, session) => {
    currentUser = session?.user || null;
    updateAuthUI();
});

function updateAuthUI() {
    if (currentUser) {
        // Jika User Sedang Login
        authStatusBar.innerHTML = `<span>👋 ${currentUser.email}</span> <button id="btn-logout" class="btn-secondary" style="padding:5px 10px; font-size:0.8rem; margin-left:10px;">Logout</button>`;
        btnViewDashboard.classList.remove('hidden');
        
        document.getElementById('btn-logout').addEventListener('click', async () => {
            await supabase.auth.signOut();
            window.location.reload();
        });
    } else {
        // Jika User Anonim
        authStatusBar.innerHTML = `<button id="btn-show-auth">👤 Login / Daftar</button>`;
        btnViewDashboard.classList.add('hidden');
        document.getElementById('btn-show-auth').addEventListener('click', () => {
            authSection.classList.remove('hidden');
            editorSection.classList.add('hidden');
            dashboardSection.classList.add('hidden');
        });
    }
}

// Beralih tampilan antara Mode Login dan Daftar Akun
switchToRegister.addEventListener('click', () => {
    isLoginMode = !isLoginMode;
    if (isLoginMode) {
        authTitle.innerText = "Masuk ke Akun";
        btnAuthPrimary.innerText = "Masuk";
        authToggleText.innerHTML = `Belum punya akun? <span id="switch-to-register">Daftar di sini</span>`;
    } else {
        authTitle.innerText = "Pendaftaran Akun Baru";
        btnAuthPrimary.innerText = "Daftar Akun";
        authToggleText.innerHTML = `Sudah punya akun? <span id="switch-to-register">Login di sini</span>`;
    }
    // Re-bind click event karena innerHTML ditulis ulang
    document.getElementById('switch-to-register').addEventListener('click', () => switchToRegister.click());
});

// Tombol Aksi Autentikasi Utama
btnAuthPrimary.addEventListener('click', async () => {
    const email = authEmail.value.trim();
    const password = authPassword.value;

    if (!email || !password) return alert("Email & Password wajib diisi!");
    if (password.length < 6) return alert("Password minimal 6 karakter!");

    btnAuthPrimary.disabled = true;
    btnAuthPrimary.innerText = "Memproses...";

    if (isLoginMode) {
        // Eksekusi Login
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) alert("Gagal Login: " + error.message);
        else authSection.classList.add('hidden'), editorSection.classList.remove('hidden');
    } else {
        // Eksekusi Registrasi
        const { error } = await supabase.from('auth.users').select; // dummy call
        const { data, error: regError } = await supabase.auth.signUp({ email, password });
        if (regError) alert("Gagal Mendaftar: " + regError.message);
        else {
            alert("Pendaftaran Berhasil! Anda otomatis masuk.");
            authSection.classList.add('hidden'), editorSection.classList.remove('hidden');
        }
    }
    btnAuthPrimary.disabled = false;
    btnAuthPrimary.innerText = isLoginMode ? "Masuk" : "Daftar Akun";
});

btnCloseAuth.addEventListener('click', () => {
    authSection.classList.add('hidden');
    editorSection.classList.remove('hidden');
});

// ==========================================
// DASHBOARD LOGIC (MANAJEMEN TEKS USER)
// ==========================================
btnViewDashboard.addEventListener('click', loadDashboardData);
btnBackToEditor.addEventListener('click', () => {
    dashboardSection.classList.add('hidden');
    editorSection.classList.remove('hidden');
});

async function loadDashboardData() {
    if (!currentUser) return;
    editorSection.classList.add('hidden');
    linkContainer.classList.add('hidden');
    dashboardSection.classList.remove('hidden');
    dashboardList.innerHTML = "<tr><td colspan='4'>Memuat riwayat teks Anda...</td></tr>";

    // Ambil data teks dari Supabase milik user_id saat ini
    const { data, error } = await supabase
        .from('shared_texts')
        .select('slug, format, is_code, views, id')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

    if (error) {
        dashboardList.innerHTML = `<tr><td colspan='4'>Gagal mengambil data: ${error.message}</td></tr>`;
        return;
    }

    if (data.length === 0) {
        dashboardList.innerHTML = "<tr><td colspan='4'>Anda belum pernah membagikan teks.</td></tr>";
        return;
    }

    dashboardList.innerHTML = "";
    data.forEach(item => {
        const fullUrl = `${window.location.origin}${window.location.pathname}?id=${item.slug}`;
        const tr = document.createElement('tr');
        
        const displayFormat = item.is_code ? 'code' : (item.format || 'text');
        
        tr.innerHTML = `
            <td><a href="${fullUrl}" target="_blank">${item.slug}</a></td>
            <td><span class="badge">${displayFormat.toUpperCase()}</span></td>
            <td>👁️ ${item.views || 0}</td>
            <td><button class="btn-danger btn-delete" data-id="${item.id}">Hapus</button></td>
        `;
        dashboardList.appendChild(tr);
    });

    // Pasang event listener ke tombol hapus
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            if (!confirm("Apakah Anda yakin ingin menghapus teks ini secara permanen dari server?")) return;
            const id = e.target.getAttribute('data-id');
            const { error: delError } = await supabase.from('shared_texts').delete().eq('id', id);
            
            if (delError) alert("Gagal menghapus data: " + delError.message);
            else loadDashboardData(); // Refresh list dashboard
        });
    });
}

// ==========================================
// ENGINE UTAMA (BACA & TULIS TEKS)
// ==========================================
const urlParams = new URLSearchParams(window.location.search);
const slug = urlParams.get('id');

async function renderText(data) {
    editorSection.classList.add('hidden');
    passwordSection.classList.add('hidden');
    readSection.classList.remove('hidden');

    globalContentText = data.content;
    const currentFormat = data.is_code ? 'code' : (data.format || 'text');

    if (currentFormat === 'code') {
        markdownOutput.classList.add('hidden');
        codeWrapper.classList.remove('hidden');
        codeOutput.textContent = data.content;
        Prism.highlightElement(codeOutput);
    } else if (currentFormat === 'markdown') {
        codeWrapper.classList.add('hidden');
        markdownOutput.classList.remove('hidden');
        markdownOutput.innerHTML = marked.parse(data.content);
    } else {
        markdownOutput.classList.add('hidden');
        codeWrapper.classList.remove('hidden');
        codeWrapper.style.background = "var(--bg-color)";
        codeOutput.className = ""; 
        codeOutput.textContent = data.content;
    }

    if (data.is_burn) {
        statusText.innerText = "🔥 Teks Sekali Baca: Teks ini sudah dihancurkan selamanya.";
        statusText.style.color = "#e74c3c";
        viewCountSpan.innerText = "Sekali Baca (Burned)";
        await supabase.from('shared_texts').delete().eq('slug', slug);
    } else {
        statusText.innerText = "Teks yang dibagikan:";
        const currentViews = data.views || 0;
        viewCountSpan.innerText = `👁️ Dilihat: ${currentViews + 1} kali`;
        await supabase.from('shared_texts').update({ views: currentViews + 1 }).eq('slug', slug);
    }
}

if (slug) {
    // === MODE BACA ===
    editorSection.classList.add('hidden');
    statusText.innerText = "Memverifikasi tautan...";

    supabase.from('shared_texts').select('has_password, is_burn, expires_at, views, is_code').eq('slug', slug).single()
    .then(({ data: metaData, error }) => {
        if (error || !metaData) {
            statusText.innerText = "❌ Teks tidak ditemukan atau sudah hangus.";
            return;
        }

        const now = new Date();
        if (metaData.expires_at && now > new Date(metaData.expires_at)) {
            statusText.innerText = "❌ Tautan ini telah kedaluwarsa.";
            return;
        }

        if (metaData.has_password) {
            statusText.innerText = "🔒 Proteksi Password Aktif";
            passwordSection.classList.remove('hidden');
            
            btnUnlock.addEventListener('click', async () => {
                const inputPass = readPasswordInput.value;
                const { data, error: passError } = await supabase.from('shared_texts')
                    .select('content, is_code, is_burn, views, format')
                    .eq('slug', slug).eq('password', inputPass).single();

                if (passError || !data) alert("Password Salah!");
                else renderText(data);
            });
        } else {
            supabase.from('shared_texts').select('content, is_code, is_burn, views, format').eq('slug', slug).single()
            .then(({ data }) => renderText(data));
        }
    });

} else {
    // === MODE TULIS ===
    btnSave.addEventListener('click', async () => {
        const content = textInput.value.trim();
        if (!content) return alert("Silakan ketik sesuatu terlebih dahulu!");

        btnSave.innerText = "Mengamankan...";
        btnSave.disabled = true;

        const minutes = parseInt(expireSelect.value);
        let expiresAt = null;
        if (minutes > 0) {
            const d = new Date();
            d.setMinutes(d.getMinutes() + minutes);
            expiresAt = d.toISOString();
        }

        let finalSlug = customUrlInput.value.trim().replace(/[^a-zA-Z0-9-]/g, "");
        if (!finalSlug) {
            finalSlug = Math.random().toString(36).substring(2, 8);
        }

        const pass = passwordInput.value;
        const hasPass = pass.length > 0;
        const selectedFormat = formatSelect.value;

        // Simpan ke Supabase (Otomatis menyematkan user_id jika user dalam kondisi login)
        const { error } = await supabase.from('shared_texts').insert([{
            slug: finalSlug,
            content: content,
            expires_at: expiresAt,
            has_password: hasPass,
            password: hasPass ? pass : null,
            is_code: selectedFormat === 'code',
            format: selectedFormat,
            is_burn: isBurnCheckbox.checked,
            user_id: currentUser ? currentUser.id : null, // Relasi ke Auth Supabase
            views: 0
        }]);

        if (error) {
            if (error.code === '23505') alert("URL Kustom tersebut sudah digunakan orang lain!");
            else alert("Gagal membagikan teks: " + error.message);
            btnSave.innerText = "Bagikan Teks";
            btnSave.disabled = false;
            return;
        }

        editorSection.classList.add('hidden');
        statusText.innerText = "🚀 Berhasil disinkronkan ke cloud!";
        const shareUrl = `${window.location.origin}${window.location.pathname}?id=${finalSlug}`;
        
        shareLinkInput.value = shareUrl;
        linkContainer.classList.remove('hidden');

        document.getElementById("qrcode").innerHTML = ""; 
        new QRCode(document.getElementById("qrcode"), {
            text: shareUrl,
            width: 150,
            height: 150
        });
    });

    btnCopy.addEventListener('click', () => {
        shareLinkInput.select();
        navigator.clipboard.writeText(shareLinkInput.value);
        btnCopy.innerText = "Copied!";
        setTimeout(() => btnCopy.innerText = "Copy Link", 2000);
    });
}

btnCopyContent.addEventListener('click', () => {
    if (!globalContentText) return;
    navigator.clipboard.writeText(globalContentText);
    btnCopyContent.innerText = "📋 Tersalin!";
    setTimeout(() => btnCopyContent.innerText = "📋 Salin Isi Teks", 2000);
});
