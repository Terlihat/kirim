import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const SUPABASE_URL = 'https://qbklpsiiwnoyvnuzizqn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFia2xwc2lpd25veXZudXppenFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExOTk0ODUsImV4cCI6MjA5Njc3NTQ4NX0.sm6xp1xRWaJCYZRlaYBTqAu4nDxR4MhpNN4O7IyjpqM';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// === DOM Elements ===
const themeToggle = document.getElementById('theme-toggle');
const textInput = document.getElementById('text-input');
const btnSave = document.getElementById('btn-save');
const btnCancelEdit = document.getElementById('btn-cancel-edit');
const expireSelect = document.getElementById('expire-select');
const formatSelect = document.getElementById('format-select');
const textTagInput = document.getElementById('text-tag');
const customUrlInput = document.getElementById('custom-url');
const passwordInput = document.getElementById('password-input');
const customE2eeKeyInput = document.getElementById('custom-e2ee-key');
const isBurnCheckbox = document.getElementById('is-burn');
const isE2EECheckbox = document.getElementById('is-e2ee');
const linkContainer = document.getElementById('link-container');
const shareLinkInput = document.getElementById('share-link');
const btnCopy = document.getElementById('btn-copy');
const btnBackToEditor = document.getElementById('btn-back-to-editor');
const statusText = document.getElementById('status-text');

const editorSection = document.getElementById('editor-section');
const passwordSection = document.getElementById('password-section');
const passwordBoxTitle = document.getElementById('password-box-title');
const passwordBoxDesc = document.getElementById('password-box-desc');
const readSection = document.getElementById('read-section');
const codeWrapper = document.getElementById('code-wrapper');
const codeOutput = document.getElementById('code-output');
const markdownOutput = document.getElementById('markdown-output');
const readPasswordInput = document.getElementById('read-password');
const btnUnlock = document.getElementById('btn-unlock');
const viewCountSpan = document.getElementById('view-count');
const btnCopyContent = document.getElementById('btn-copy-content');
const btnReadNew = document.getElementById('btn-read-new');

const authStatusBar = document.getElementById('auth-status-bar');
const authSection = document.getElementById('auth-section');
const authTitle = document.getElementById('auth-title');
const authEmail = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');
const btnAuthPrimary = document.getElementById('btn-auth-primary');
const authToggleText = document.getElementById('auth-toggle-text');
const btnCloseAuth = document.getElementById('btn-close-auth');

const dashboardSection = document.getElementById('dashboard-section');
const dashboardList = document.getElementById('dashboard-list');
const dashboardSearch = document.getElementById('dashboard-search');
const btnViewDashboard = document.getElementById('btn-view-dashboard');
const btnDashboardBack = document.getElementById('btn-dashboard-back');

let currentUser = null; 
let isLoginMode = true; 
let globalContentText = "";
let cachedRecordData = null; 
let editModeId = null; 

// === E2EE CRYPTO FUNCTIONS ===
function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return window.btoa(binary);
}
function base64ToArrayBuffer(base64) {
    const binary_string = window.atob(base64);
    const bytes = new Uint8Array(binary_string.length);
    for (let i = 0; i < binary_string.length; i++) bytes[i] = binary_string.charCodeAt(i);
    return bytes.buffer;
}
async function getCryptoKeyFromPassphrase(passphrase) {
    const encoder = new TextEncoder();
    const data = encoder.encode(passphrase);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return await crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}
async function encryptText(text, customPassphrase = "") {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    let key, secretKeyStr = null;
    if (customPassphrase) {
        key = await getCryptoKeyFromPassphrase(customPassphrase);
    } else {
        key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
        const exportedKey = await crypto.subtle.exportKey("raw", key);
        secretKeyStr = arrayBufferToBase64(exportedKey);
    }
    const encodedText = new TextEncoder().encode(text);
    const cipherBuffer = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, encodedText);
    return { cipherText: arrayBufferToBase64(cipherBuffer), ivStr: arrayBufferToBase64(iv), secretKeyStr };
}
async function decryptText(cipherTextB64, ivB64, keyB64OrPassphrase, isCustom = false) {
    try {
        let key;
        if (isCustom) key = await getCryptoKeyFromPassphrase(keyB64OrPassphrase);
        else {
            const keyBuffer = base64ToArrayBuffer(keyB64OrPassphrase);
            key = await crypto.subtle.importKey("raw", keyBuffer, { name: "AES-GCM" }, false, ["decrypt"]);
        }
        const ivBuffer = base64ToArrayBuffer(ivB64);
        const cipherBuffer = base64ToArrayBuffer(cipherTextB64);
        const decryptedBuffer = await crypto.subtle.decrypt({ name: "AES-GCM", iv: ivBuffer }, key, cipherBuffer);
        return new TextDecoder().decode(decryptedBuffer);
    } catch (e) {
        return null; 
    }
}

// === RESET APPLICATION STATE ===
function resetToEditor() {
    linkContainer.classList.add('hidden');
    readSection.classList.add('hidden');
    passwordSection.classList.add('hidden');
    dashboardSection.classList.add('hidden');
    authSection.classList.add('hidden');
    btnCancelEdit.classList.add('hidden');
    editorSection.classList.remove('hidden');
    
    textInput.value = '';
    customUrlInput.value = '';
    customUrlInput.disabled = false; 
    passwordInput.value = '';
    textTagInput.value = '';
    customE2eeKeyInput.value = '';
    readPasswordInput.value = '';
    isBurnCheckbox.checked = false;
    isE2EECheckbox.checked = true;
    expireSelect.value = "0";
    formatSelect.value = "text";
    
    editModeId = null; 
    btnSave.innerText = "Bagikan Teks";
    btnSave.disabled = false;
    statusText.innerText = "Bagikan teks, kode, atau markdown dengan aman.";
    statusText.style.color = "";
    
    window.history.pushState({}, document.title, window.location.pathname);
}
btnCancelEdit.addEventListener('click', resetToEditor);

// === THEME MANAGER & SUPABASE AUTH ===
if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-mode');
    themeToggle.innerText = '☀️ Mode Terang';
}
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
    themeToggle.innerText = document.body.classList.contains('dark-mode') ? '☀️ Mode Terang' : '🌙 Mode Gelap';
});

supabase.auth.onAuthStateChange((event, session) => {
    currentUser = session?.user || null;
    if (currentUser) {
        authStatusBar.innerHTML = `<span>👋 ${currentUser.email}</span> <button id="btn-logout" class="btn-secondary" style="padding:5px 10px; font-size:0.8rem; margin-left:10px;">Logout</button>`;
        btnViewDashboard.classList.remove('hidden');
        document.getElementById('btn-logout').addEventListener('click', async () => {
            await supabase.auth.signOut();
            window.location.reload();
        });
    } else {
        authStatusBar.innerHTML = `<button id="btn-show-auth">👤 Login / Daftar</button>`;
        btnViewDashboard.classList.add('hidden');
        document.getElementById('btn-show-auth').addEventListener('click', () => {
            authSection.classList.remove('hidden');
            editorSection.classList.add('hidden');
            dashboardSection.classList.add('hidden');
        });
    }
});

authToggleText.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'switch-to-register') {
        isLoginMode = !isLoginMode;
        authTitle.innerText = isLoginMode ? "Masuk ke Akun" : "Pendaftaran Akun Baru";
        btnAuthPrimary.innerText = isLoginMode ? "Masuk" : "Daftar Akun";
        authToggleText.innerHTML = isLoginMode ? `Belum punya akun? <span id="switch-to-register">Daftar di sini</span>` : `Sudah punya akun? <span id="switch-to-register">Login di sini</span>`;
    }
});

btnAuthPrimary.addEventListener('click', async () => {
    const email = authEmail.value.trim(); const password = authPassword.value;
    if (!email || !password) return alert("Email & Password wajib diisi!");
    btnAuthPrimary.disabled = true; btnAuthPrimary.innerText = "Memproses...";
    if (isLoginMode) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) alert("Gagal Login: " + error.message); else resetToEditor();
    } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) alert("Gagal Mendaftar: " + error.message); else { alert("Pendaftaran Berhasil!"); resetToEditor(); }
    }
    btnAuthPrimary.disabled = false; btnAuthPrimary.innerText = isLoginMode ? "Masuk" : "Daftar Akun";
});
btnCloseAuth.addEventListener('click', resetToEditor);

// === LIVE SEARCH DASHBOARD ===
dashboardSearch.addEventListener('input', function() {
    const filter = this.value.toLowerCase();
    const rows = dashboardList.querySelectorAll('tr');
    rows.forEach(row => {
        if (row.cells.length === 1) return; 
        row.style.display = row.textContent.toLowerCase().includes(filter) ? '' : 'none';
    });
});

// === USER DASHBOARD & EDIT SYSTEM ===
btnViewDashboard.addEventListener('click', async () => {
    if (!currentUser) return;
    editorSection.classList.add('hidden');
    linkContainer.classList.add('hidden');
    dashboardSection.classList.remove('hidden');
    dashboardSearch.value = ""; 
    dashboardList.innerHTML = "<tr><td colspan='5'>Memuat riwayat teks Anda...</td></tr>";

    const { data, error } = await supabase.from('shared_texts').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false });
    if (error) return dashboardList.innerHTML = `<tr><td colspan='5'>Error: ${error.message}</td></tr>`;
    if (data.length === 0) return dashboardList.innerHTML = "<tr><td colspan='5' style='text-align:center;'>Belum ada teks yang dibagikan.</td></tr>";

    dashboardList.innerHTML = "";
    data.forEach(item => {
        const tr = document.createElement('tr');
        const displayFormat = item.is_code ? 'code' : (item.format || 'text');
        const encryptBadge = item.is_encrypted ? "🛡️ " : "";
        const tagContent = item.tag ? `<span class="tag-badge">${item.tag}</span>` : `<span style="color:#aaa; font-size:0.85rem;">-</span>`;
        
        tr.innerHTML = `
            <td><a href="https://terlihat.github.io/kirim/?id=${item.slug}" target="_blank">${encryptBadge}${item.slug}</a></td>
            <td>${tagContent}</td>
            <td><span class="badge">${displayFormat.toUpperCase()}</span></td>
            <td>👁️ ${item.views || 0}</td>
            <td class="action-buttons">
                <button class="btn-warning btn-edit" data-id="${item.id}">Edit</button>
                <button class="btn-danger btn-delete" data-id="${item.id}">Hapus</button>
            </td>
        `;
        dashboardList.appendChild(tr);
    });

    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            if (!confirm("Hapus teks ini secara permanen?")) return;
            await supabase.from('shared_texts').delete().eq('id', e.target.getAttribute('data-id'));
            btnViewDashboard.click(); 
        });
    });

    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const rowId = e.target.getAttribute('data-id');
            const record = data.find(item => item.id === parseInt(rowId) || item.id === rowId);
            if (!record) return;

            let finalContentToEdit = record.content;
            if (record.is_encrypted) {
                const key = prompt("Teks terenkripsi. Masukkan Kunci URL (Hash) ATAU Kunci E2EE Kustom Anda:");
                if (!key) return;
                let decrypted = await decryptText(record.content, record.iv, key, true) || await decryptText(record.content, record.iv, key, false);
                if (!decrypted) return alert("Kunci salah!");
                finalContentToEdit = decrypted;
            }

            resetToEditor();
            editModeId = record.id; 
            textInput.value = finalContentToEdit;
            customUrlInput.value = record.slug;
            customUrlInput.disabled = true; 
            textTagInput.value = record.tag || "";
            formatSelect.value = record.format || (record.is_code ? 'code' : 'text');
            isE2EECheckbox.checked = record.is_encrypted;
            isBurnCheckbox.checked = record.is_burn;
            
            btnSave.innerText = "Simpan Perubahan Teks";
            btnCancelEdit.classList.remove('hidden');
            statusText.innerText = `✏️ Mode Edit: ${record.slug}`;
            statusText.style.color = "#f39c12";
        });
    });
});

if (btnDashboardBack) btnDashboardBack.addEventListener('click', resetToEditor);

// === MAIN ENGINE (READ MODE) ===
const urlParams = new URLSearchParams(window.location.search);
const slug = urlParams.get('id');
const urlHashKey = window.location.hash.substring(1); 

async function renderText(data, manualE2eeKey = "") {
    let finalContent = data.content;

    if (data.is_encrypted) {
        if (!urlHashKey && !manualE2eeKey) {
            cachedRecordData = data; 
            editorSection.classList.add('hidden');
            readSection.classList.add('hidden');
            passwordSection.classList.remove('hidden');
            passwordBoxTitle.innerText = "🛡️ Dekripsi E2EE Kustom";
            passwordBoxDesc.innerText = "Masukkan Kata Kunci (Passphrase) E2EE khusus untuk membuka teks ini.";
            readPasswordInput.setAttribute("placeholder", "Masukkan Kunci E2EE Kustom...");
            readPasswordInput.value = "";
            return;
        }

        let decrypted = manualE2eeKey ? await decryptText(data.content, data.iv, manualE2eeKey, true) : await decryptText(data.content, data.iv, urlHashKey, false);
        if (!decrypted) return alert("❌ Gagal mendekripsi! Kunci salah atau rusak.");
        finalContent = decrypted;
    }

    passwordSection.classList.add('hidden'); 
    readSection.classList.remove('hidden');
    globalContentText = finalContent;
    const currentFormat = data.is_code ? 'code' : (data.format || 'text');

    if (currentFormat === 'code') {
        markdownOutput.classList.add('hidden'); codeWrapper.classList.remove('hidden');
        codeOutput.textContent = finalContent; Prism.highlightElement(codeOutput);
    } else if (currentFormat === 'markdown') {
        codeWrapper.classList.add('hidden'); markdownOutput.classList.remove('hidden');
        markdownOutput.innerHTML = marked.parse(finalContent);
    } else {
        markdownOutput.classList.add('hidden'); codeWrapper.classList.remove('hidden');
        codeWrapper.style.background = "var(--bg-color)"; codeOutput.className = ""; 
        codeOutput.textContent = finalContent;
    }

    if (data.is_burn) {
        statusText.innerText = "🔥 Teks Sekali Baca: Teks telah dihapus permanen.";
        statusText.style.color = "#e74c3c";
        await supabase.from('shared_texts').delete().eq('slug', slug);
    } else {
        statusText.innerText = data.is_encrypted ? "🔒 Dekripsi Berhasil (E2EE)" : "Teks yang dibagikan:";
        const currentViews = data.views || 0;
        viewCountSpan.innerText = `👁️ Dilihat: ${currentViews + 1} kali`;
        await supabase.from('shared_texts').update({ views: currentViews + 1 }).eq('slug', slug);
    }
}

// SOLUSI BUG 1: Penyatuan Logika Klik Tombol Unlock secara Global & Bersih
btnUnlock.addEventListener('click', async () => {
    const titleText = passwordBoxTitle.innerText;
    const passwordValue = readPasswordInput.value.trim();
    if (!passwordValue) return alert("Input tidak boleh kosong!");

    if (titleText.includes("Terkunci")) {
        // Skenario A: Membuka Password Server Biasa
        const { data, error: passError } = await supabase.from('shared_texts')
            .select('content, is_code, is_burn, views, format, is_encrypted, iv')
            .eq('slug', slug).eq('password', passwordValue).single();
        if (passError || !data) alert("Password Server Salah!"); 
        else { cachedRecordData = data; renderText(data); }
    } else if (titleText.includes("E2EE") && cachedRecordData) {
        // Skenario B: Membuka Enkripsi E2EE Kustom Pasca / Tanpa Password Server
        renderText(cachedRecordData, passwordValue);
    }
});

if (slug) {
    editorSection.classList.add('hidden');
    statusText.innerText = "Membuka brankas...";
    supabase.from('shared_texts').select('has_password, is_burn, expires_at, views, is_code, format, is_encrypted').eq('slug', slug).single()
    .then(({ data: metaData, error }) => {
        if (error || !metaData) return statusText.innerText = "❌ Teks tidak ditemukan.";
        if (metaData.expires_at && new Date() > new Date(metaData.expires_at)) return statusText.innerText = "❌ Tautan kedaluwarsa.";

        if (metaData.has_password) {
            statusText.innerText = "🔒 Proteksi Password Aktif"; 
            passwordSection.classList.remove('hidden');
            passwordBoxTitle.innerText = "🔒 Teks Terkunci";
            passwordBoxDesc.innerText = "Teks ini dilindungi oleh password dari server.";
            readPasswordInput.setAttribute("placeholder", "Masukkan Password Server...");
        } else {
            supabase.from('shared_texts').select('content, is_code, is_burn, views, format, is_encrypted, iv').eq('slug', slug).single()
            .then(({ data }) => { cachedRecordData = data; renderText(data); });
        }
    });
} else {
    // === CREATE / UPDATE LOGIC ===
    btnSave.addEventListener('click', async () => {
        const rawContent = textInput.value.trim();
        if (!rawContent) return alert("Ketik sesuatu!");

        btnSave.innerText = "Mengamankan...";
        btnSave.disabled = true;

        const minutes = parseInt(expireSelect.value);
        let expiresAt = minutes > 0 ? new Date(Date.now() + minutes * 60000).toISOString() : null;
        let finalSlug = customUrlInput.value.trim().replace(/[^a-zA-Z0-9-]/g, "") || Math.random().toString(36).substring(2, 8);
        
        let finalPayloadContent = rawContent; let finalIv = null; let generatedKey = null;
        const useE2EE = isE2EECheckbox.checked;
        const customE2eeKey = customE2eeKeyInput.value.trim();

        if (useE2EE) {
            const encryptedData = await encryptText(rawContent, customE2eeKey);
            finalPayloadContent = encryptedData.cipherText;
            finalIv = encryptedData.ivStr;
            generatedKey = encryptedData.secretKeyStr; 
        }

        const pass = passwordInput.value; const hasPass = pass.length > 0;
        const payloadData = {
            slug: finalSlug, content: finalPayloadContent, iv: finalIv,
            is_encrypted: useE2EE, expires_at: expiresAt,
            has_password: hasPass, password: hasPass ? pass : null,
            is_code: formatSelect.value === 'code', format: formatSelect.value,
            is_burn: isBurnCheckbox.checked, tag: textTagInput.value.trim() || null,
            user_id: currentUser ? currentUser.id : null
        };

        let responseError = null;
        if (editModeId) {
            const { error } = await supabase.from('shared_texts').update(payloadData).eq('id', editModeId);
            responseError = error;
        } else {
            payloadData.views = 0; 
            const { error } = await supabase.from('shared_texts').insert([payloadData]);
            responseError = error;
        }

        if (responseError) {
            alert(responseError.code === '23505' ? "URL Kustom sudah digunakan!" : "Gagal: " + responseError.message);
            btnSave.innerText = editModeId ? "Simpan Perubahan Teks" : "Bagikan Teks";
            btnSave.disabled = false;
            return;
        }

        editorSection.classList.add('hidden');
        statusText.innerText = editModeId ? "✅ Teks berhasil diperbarui!" : "🚀 Disinkronkan dengan aman!";
        btnCancelEdit.classList.add('hidden');
        
        let shareUrl = `https://terlihat.github.io/kirim/?id=${finalSlug}`;
        if (useE2EE && generatedKey) shareUrl += `#${generatedKey}`;
        
        shareLinkInput.value = shareUrl;
        linkContainer.classList.remove('hidden');
        
        document.getElementById("qrcode").innerHTML = ""; 
        new QRCode(document.getElementById("qrcode"), { text: shareUrl, width: 150, height: 150 });
        editModeId = null; 
    });

    btnCopy.addEventListener('click', () => {
        shareLinkInput.select(); navigator.clipboard.writeText(shareLinkInput.value);
        btnCopy.innerText = "Copied!"; setTimeout(() => btnCopy.innerText = "Copy Link", 2000);
    });
}

btnCopyContent.addEventListener('click', () => {
    if (!globalContentText) return; navigator.clipboard.writeText(globalContentText);
    btnCopyContent.innerText = "📋 Tersalin!"; setTimeout(() => btnCopyContent.innerText = "📋 Salin Isi Teks", 2000);
});

if (btnBackToEditor) btnBackToEditor.addEventListener('click', resetToEditor);
if (btnReadNew) btnReadNew.addEventListener('click', resetToEditor);
