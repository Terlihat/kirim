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

let globalContentText = ""; // Menyimpan teks secara temporer untuk fitur copy content

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
// MAIN ENGINE
// ==========================================
const urlParams = new URLSearchParams(window.location.search);
const slug = urlParams.get('id');

// Fungsi Merender Teks dengan Format Terpilih
async function renderText(data) {
    editorSection.classList.add('hidden');
    passwordSection.classList.add('hidden');
    readSection.classList.remove('hidden');

    globalContentText = data.content; // Simpan ke variabel global agar bisa di-copy

    // Deteksi Is Code purba dari database, atau baca kolom format baru
    const currentFormat = data.is_code ? 'code' : (data.format || 'text');

    if (currentFormat === 'code') {
        markdownOutput.classList.add('hidden');
        codeWrapper.classList.remove('hidden');
        codeOutput.textContent = data.content;
        Prism.highlightElement(codeOutput);
    } else if (currentFormat === 'markdown') {
        codeWrapper.classList.add('hidden');
        markdownOutput.classList.remove('hidden');
        markdownOutput.innerHTML = marked.parse(data.content); // Merender Markdown aman
    } else {
        // Teks biasa
        markdownOutput.classList.add('hidden');
        codeWrapper.classList.remove('hidden');
        codeWrapper.style.background = "var(--bg-color)";
        codeOutput.className = ""; 
        codeOutput.textContent = data.content;
    }

    // Mengelola Teks Burn vs Increment View Counter
    if (data.is_burn) {
        statusText.innerText = "🔥 Teks Sekali Baca: Teks ini sudah dihapus dari server.";
        statusText.style.color = "#e74c3c";
        viewCountSpan.innerText = "👁️ Sekali Baca (Burned)";
        await supabase.from('shared_texts').delete().eq('slug', slug);
    } else {
        statusText.innerText = "Teks yang dibagikan:";
        const currentViews = data.views || 0;
        viewCountSpan.innerText = `👁️ Dilihat: ${currentViews + 1} kali`;
        // Naikkan view counter (+1) di database
        await supabase.from('shared_texts').update({ views: currentViews + 1 }).eq('slug', slug);
    }
}

if (slug) {
    // === MODE BACA ===
    editorSection.classList.add('hidden');
    statusText.innerText = "Memverifikasi tautan...";

    // Mengambil metadata (Keamanan tingkat tinggi: content & password tidak di-load duluan)
    supabase.from('shared_texts').select('has_password, is_burn, expires_at, views, is_code').eq('slug', slug).single()
    .then(({ data: metaData, error }) => {
        if (error || !metaData) {
            statusText.innerText = "❌ Teks tidak ditemukan atau sudah hangus dibakar.";
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
                    .select('content, is_code, is_burn, views')
                    .eq('slug', slug).eq('password', inputPass).single();

                if (passError || !data) {
                    alert("Password Salah!");
                } else {
                    renderText(data);
                }
            });
        } else {
            // Publik tanpa sandi, muat penuh kontennya
            supabase.from('shared_texts').select('content, is_code, is_burn, views').eq('slug', slug).single()
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

        // Hitung Masa Kadaluwarsa
        const minutes = parseInt(expireSelect.value);
        let expiresAt = null;
        if (minutes > 0) {
            const d = new Date();
            d.setMinutes(d.getMinutes() + minutes);
            expiresAt = d.toISOString();
        }

        // Kelola Slug kustom
        let finalSlug = customUrlInput.value.trim().replace(/[^a-zA-Z0-9-]/g, "");
        if (!finalSlug) {
            finalSlug = Math.random().toString(36).substring(2, 8); // string acak pendek
        }

        const pass = passwordInput.value;
        const hasPass = pass.length > 0;
        const selectedFormat = formatSelect.value;

        const { error } = await supabase.from('shared_texts').insert([{
            slug: finalSlug,
            content: content,
            expires_at: expiresAt,
            has_password: hasPass,
            password: hasPass ? pass : null,
            is_code: selectedFormat === 'code', // Backward compatibility kolom lama
            is_burn: isBurnCheckbox.checked,
            views: 0
        }]);

        if (error) {
            if (error.code === '23505') {
                alert("URL Kustom tersebut sudah digunakan orang lain!");
            } else {
                alert("Gagal membagikan teks.");
            }
            btnSave.innerText = "Bagikan Teks";
            btnSave.disabled = false;
            return;
        }

        // Tampilkan Tautan Sukses & Jalankan QR Code Generator
        editorSection.classList.add('hidden');
        statusText.innerText = "🚀 Berhasil disinkronkan ke cloud!";
        const shareUrl = `${window.location.origin}${window.location.pathname}?id=${finalSlug}`;
        
        shareLinkInput.value = shareUrl;
        linkContainer.classList.remove('hidden');

        // Render QR Code otomatis
        document.getElementById("qrcode").innerHTML = ""; // Bersihkan jika ada sisa lama
        new QRCode(document.getElementById("qrcode"), {
            text: shareUrl,
            width: 150,
            height: 150
        });
    });

    // Copy Tautan Utama
    btnCopy.addEventListener('click', () => {
        shareLinkInput.select();
        navigator.clipboard.writeText(shareLinkInput.value);
        btnCopy.innerText = "Copied!";
        setTimeout(() => btnCopy.innerText = "Copy Link", 2000);
    });
}

// Logika Tombol Salin Isi Konten (Untuk Pembaca)
btnCopyContent.addEventListener('click', () => {
    if (!globalContentText) return;
    navigator.clipboard.writeText(globalContentText);
    btnCopyContent.innerText = "📋 Tersalin!";
    btnCopyContent.style.background = "#2ecc71";
    btnCopyContent.style.color = "white";
    setTimeout(() => {
        btnCopyContent.innerText = "📋 Salin Isi Teks";
        btnCopyContent.style.background = "var(--primary)";
    }, 2000);
});
