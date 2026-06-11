import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// KREDENSIAL SUPABASE ANDA
const SUPABASE_URL = 'https://qbklpsiiwnoyvnuzizqn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFia2xwc2lpd25veXZudXppenFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExOTk0ODUsImV4cCI6MjA5Njc3NTQ4NX0.sm6xp1xRWaJCYZRlaYBTqAu4nDxR4MhpNN4O7IyjpqM';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM Elements
const themeToggle = document.getElementById('theme-toggle');
const textInput = document.getElementById('text-input');
const btnSave = document.getElementById('btn-save');
const expireSelect = document.getElementById('expire-select');
const customUrlInput = document.getElementById('custom-url');
const passwordInput = document.getElementById('password-input');
const isCodeCheckbox = document.getElementById('is-code');
const isBurnCheckbox = document.getElementById('is-burn');
const linkContainer = document.getElementById('link-container');
const shareLinkInput = document.getElementById('share-link');
const btnCopy = document.getElementById('btn-copy');
const statusText = document.getElementById('status-text');

// Sections
const editorSection = document.getElementById('editor-section');
const passwordSection = document.getElementById('password-section');
const readSection = document.getElementById('read-section');
const codeOutput = document.getElementById('code-output');
const readPasswordInput = document.getElementById('read-password');
const btnUnlock = document.getElementById('btn-unlock');

// ==========================================
// FITUR DARK MODE LOGIC
// ==========================================
if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-mode');
    themeToggle.innerText = '☀️ Mode Terang';
}

themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    if (document.body.classList.contains('dark-mode')) {
        localStorage.setItem('theme', 'dark');
        themeToggle.innerText = '☀️ Mode Terang';
    } else {
        localStorage.setItem('theme', 'light');
        themeToggle.innerText = '🌙 Mode Gelap';
    }
});

// ==========================================
// MAIN LOGIC
// ==========================================
const urlParams = new URLSearchParams(window.location.search);
const slug = urlParams.get('id');

// Fungsi Menampilkan Teks ke Layar
async function renderText(data) {
    editorSection.classList.add('hidden');
    passwordSection.classList.add('hidden');
    readSection.classList.remove('hidden');

    if (data.is_code) {
        codeOutput.textContent = data.content;
        Prism.highlightElement(codeOutput); // Trigger PrismJS
    } else {
        codeOutput.textContent = data.content;
        codeOutput.className = ""; // Hilangkan format kode
    }

    if (data.is_burn) {
        statusText.innerText = "🔥 PERINGATAN: Teks ini telah dihapus dari server selamanya.";
        statusText.style.color = "#e74c3c";
        // Eksekusi Hapus
        await supabase.from('shared_texts').delete().eq('slug', slug);
    } else {
        statusText.innerText = "Teks yang dibagikan:";
    }
}

if (slug) {
    // === MODE BACA ===
    editorSection.classList.add('hidden');
    statusText.innerText = "Mencari data...";

    // 1. Cek status dokumen (Hanya ambil info metadata, JANGAN ambil content dulu untuk keamanan)
    supabase.from('shared_texts').select('has_password, is_burn, expires_at').eq('slug', slug).single()
    .then(({ data: metaData, error: metaError }) => {
        if (metaError || !metaData) {
            statusText.innerText = "❌ Teks tidak ditemukan atau sudah dibakar.";
            return;
        }

        const now = new Date();
        if (metaData.expires_at && now > new Date(metaData.expires_at)) {
            statusText.innerText = "❌ Tautan telah kedaluwarsa.";
            return;
        }

        // Jika diproteksi Password
        if (metaData.has_password) {
            statusText.innerText = "Kunci Password Dibutuhkan";
            passwordSection.classList.remove('hidden');
            
            btnUnlock.addEventListener('click', async () => {
                const pass = readPasswordInput.value;
                // Hanya kirim content jika password cocok di server
                const { data, error } = await supabase.from('shared_texts')
                    .select('content, is_code, is_burn')
                    .eq('slug', slug).eq('password', pass).single();

                if (error || !data) {
                    alert("Password Salah!");
                } else {
                    renderText(data);
                }
            });
        } else {
            // Jika tidak ada password, langsung ambil full data
            supabase.from('shared_texts').select('content, is_code, is_burn').eq('slug', slug).single()
            .then(({ data }) => renderText(data));
        }
    });

} else {
    // === MODE TULIS ===
    btnSave.addEventListener('click', async () => {
        const content = textInput.value.trim();
        if (!content) return alert("Teks kosong!");

        btnSave.innerText = "Menyimpan...";
        btnSave.disabled = true;

        // Atur Expiration
        const minutes = parseInt(expireSelect.value);
        let expiresAt = null;
        if (minutes > 0) {
            const d = new Date();
            d.setMinutes(d.getMinutes() + minutes);
            expiresAt = d.toISOString();
        }

        // Atur Slug (URL Kustom)
        let finalSlug = customUrlInput.value.trim().replace(/[^a-zA-Z0-9-]/g, ""); // Bersihkan karakter aneh
        if (!finalSlug) {
            // Generate string acak 6 karakter jika user tidak isi custom URL
            finalSlug = Math.random().toString(36).substring(2, 8);
        }

        const pass = passwordInput.value;
        const hasPass = pass.length > 0;

        // Insert ke Supabase
        const { error } = await supabase.from('shared_texts').insert([{
            slug: finalSlug,
            content: content,
            expires_at: expiresAt,
            has_password: hasPass,
            password: hasPass ? pass : null,
            is_code: isCodeCheckbox.checked,
            is_burn: isBurnCheckbox.checked
        }]);

        if (error) {
            if (error.code === '23505') { // Kode error Postgres untuk Duplicate Unique
                alert("URL Kustom sudah dipakai orang lain! Ganti yang lain.");
            } else {
                alert("Gagal menyimpan data.");
            }
            btnSave.innerText = "Bagikan Teks";
            btnSave.disabled = false;
            return;
        }

        // Berhasil
        editorSection.classList.add('hidden');
        statusText.innerText = "🚀 Teks berhasil diamankan di awan!";
        const shareUrl = `${window.location.origin}${window.location.pathname}?id=${finalSlug}`;
        shareLinkInput.value = shareUrl;
        linkContainer.classList.remove('hidden');
    });

    // Copy Link Logic
    btnCopy.addEventListener('click', () => {
        shareLinkInput.select();
        navigator.clipboard.writeText(shareLinkInput.value);
        btnCopy.innerText = "Copied!";
        setTimeout(() => btnCopy.innerText = "Copy", 2000);
    });
}
