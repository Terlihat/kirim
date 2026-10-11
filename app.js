import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// Konfigurasi Supabase
const sb = createClient(
    'https://qbklpsiiwnoyvnuzizqn.supabase.co', 
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFia2xwc2lpd25veXZudXppenFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExOTk0ODUsImV4cCI6MjA5Njc3NTQ4NX0.sm6xp1xRWaJCYZRlaYBTqAu4nDxR4MhpNN4O7IyjpqM'
);

// Utilitas DOM
const $ = id => document.getElementById(id);
const view = id => document.querySelectorAll('.app-section').forEach(s => s.classList.toggle('hidden', s.id !== id));
const b64 = b => btoa(String.fromCharCode(...new Uint8Array(b)));
const buf = s => Uint8Array.from(atob(s), c => c.charCodeAt(0)).buffer;

// State Global
let u = null, isL = true, gTxt = "", cData = null, eId = null, dbCache = [];
const pms = new URLSearchParams(window.location.search);
const slug = pms.get('id');
const hKey = window.location.hash.substring(1);

// --- MODAL SISTEM ---
const sysModal = (type, title, msg) => new Promise(res => {
    $('sys-modal-title').innerText = title;
    $('sys-modal-msg').innerText = msg;
    $('sys-modal-input').value = '';$('sys-modal-input').classList.toggle('hidden', type !== 'prompt');
    $('sys-modal-cancel').classList.toggle('hidden', type === 'alert');$('sys-modal').classList.add('active');
    
    if (type === 'prompt') setTimeout(() => $('sys-modal-input').focus(), 100);

    const close = (val) => {
        $('sys-modal').classList.remove('active');$('sys-modal-ok').onclick = null;
        $('sys-modal-cancel').onclick = null;
        res(val);
    };

    $('sys-modal-ok').onclick = () => close(type === 'prompt' ? $('sys-modal-input').value : true);$('sys-modal-cancel').onclick = () => close(type === 'prompt' ? null : false);
});

// --- FUNGSI KRIPTOGRAFI E2EE ---
const extractKey = (str) => {
    if (!str) return "";
    return str.includes('#') ? str.substring(str.indexOf('#') + 1) : str;
};

async function gKey(p) {
    return crypto.subtle.importKey(
        "raw", 
        await crypto.subtle.digest('SHA-256', new TextEncoder().encode(p)), 
        { name: "AES-GCM" }, false, ["encrypt", "decrypt"]
    );
}

async function enc(t, p) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const k = p ? await gKey(p) : await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
    const c = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, k, new TextEncoder().encode(t));
    return { 
        c: b64(c), 
        iv: b64(iv), 
        k: p ? null : b64(await crypto.subtle.exportKey("raw", k)) 
    };
}

async function dec(c, iv, k, isC) {
    try {
        const key = isC ? await gKey(k) : await crypto.subtle.importKey("raw", buf(k), { name: "AES-GCM" }, false, ["decrypt"]);
        const result = await crypto.subtle.decrypt({ name: "AES-GCM", iv: buf(iv) }, key, buf(c));
        return new TextDecoder().decode(result);
    } catch {
        return null;
    }
}

// --- FUNGSI RESET & UI NAVIGASI ---
function updateNavActive(id) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    if($(id))$(id).classList.add('active');
}

function reset() {
    view('editor-section');
    $('btn-cancel-edit').classList.add('hidden');
    ['text-input', 'custom-url', 'password-input', 'text-tag', 'custom-e2ee-key', 'read-password'].forEach(k => $(k).value = '');$('custom-url').disabled = false;
    $('is-burn').checked = false;
    $('is-e2ee').checked = false;
    $('expire-select').value = "0";
    $('format-select').value = "text";
    
    eId = null; gTxt = ""; cData = null;
    $('btn-save').innerText = "Bagikan Teks";
    $('btn-save').disabled = false;
    $('status-text').innerText = "Bagikan teks dengan aman.";
    $('status-text').style.color = "";
    
    window.history.pushState({}, document.title, window.location.pathname);
    updateNavActive('nav-home');
}

// Tombol yang memicu reset/kembali ke editor
[$('btn-cancel-edit'), $('btn-dashboard-back'),$('btn-back-to-editor'), $('btn-read-new'),$('btn-password-back')].forEach(b => {
    if(b) b.addEventListener('click', reset);
});

// --- LOGIKA TEMA & NAVBAR BAWAH ---
const updateThemeUI = (isDark) => {
    if($('theme-toggle'))$('theme-toggle').innerText = isDark ? '☀️ Terang' : '🌙 Gelap';
    if ($('nav-theme-icon')) {$('nav-theme-icon').innerText = isDark ? '☀️' : '🌙';
        $('nav-theme-text').innerText = isDark ? 'Terang' : 'Gelap';
    }
};

const toggleTheme = () => {
    const d = document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', d ? 'dark' : 'light');
    updateThemeUI(d);
};

updateThemeUI(localStorage.getItem('theme') !== 'light');
if($('theme-toggle'))$('theme-toggle').addEventListener('click', toggleTheme);
if($('nav-theme'))$('nav-theme').addEventListener('click', toggleTheme);
if($('nav-home'))$('nav-home').addEventListener('click', reset);

// --- LOGIKA AUTENTIKASI ---
const toggleModal = (show) => $('auth-modal').classList.toggle('active', show);
if($('btn-close-auth'))$('btn-close-auth').addEventListener('click', () => toggleModal(false));

sb.auth.onAuthStateChange((_, s) => {
    u = s?.user || null;
    
    if (u) {
        // Desktop Top Menu
        if($('auth-status-bar')) {$('auth-status-bar').innerHTML = `
                <div class="user-menu-container">
                    <button id="btn-user-menu" class="btn-outline" style="padding: 6px 12px; font-size: 0.9rem;">
                        👋 ${u.email.split('@')[0]} ▼
                    </button>
                    <div id="user-dropdown" class="dropdown-content hidden">
                        <button id="btn-goto-dash" class="dropdown-item">🗂️ Dashboard</button>
                        <button id="btn-logout" class="dropdown-item dropdown-danger">🚪 Keluar</button>
                    </div>
                </div>`;
                
            $('btn-user-menu').addEventListener('click', (e) => {
                e.stopPropagation();
                $('user-dropdown').classList.toggle('hidden');
            });
            
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.user-menu-container') && $('user-dropdown')) {$('user-dropdown').classList.add('hidden');
                }
            });
            
            $('btn-logout').addEventListener('click', () => sb.auth.signOut().then(() => window.location.reload()));
            $('btn-goto-dash').addEventListener('click', () => {$('user-dropdown').classList.add('hidden'); 
                renderDashboard(); 
            });
        }
        
        // Mobile Bottom Nav
        if($('nav-login'))$('nav-login').classList.add('hidden');
        if($('nav-dashboard'))$('nav-dashboard').classList.remove('hidden');
        if($('nav-logout'))$('nav-logout').classList.remove('hidden');
    } else {
        // Desktop Top Menu
        if($('auth-status-bar')) {$('auth-status-bar').innerHTML = `<button id="li">Login</button>`;
            $('li').addEventListener('click', () => toggleModal(true));
        }
        
        // Mobile Bottom Nav
        if($('nav-login'))$('nav-login').classList.remove('hidden');
        if($('nav-dashboard'))$('nav-dashboard').classList.add('hidden');
        if($('nav-logout'))$('nav-logout').classList.add('hidden');
    }
});

if($('nav-login'))$('nav-login').addEventListener('click', () => toggleModal(true));
if($('nav-logout'))$('nav-logout').addEventListener('click', async () => {
    const isConfirm = await sysModal('confirm', 'Keluar', 'Apakah Anda yakin ingin keluar?');
    if (isConfirm) sb.auth.signOut().then(() => window.location.reload());
});

if($('auth-toggle-text')) {$('auth-toggle-text').addEventListener('click', (e) => {
        if (e.target.id !== 'switch-to-register') return;
        isL = !isL;
        $('auth-title').innerText = isL ? "Masuk" : "Buat Akun";
        $('btn-auth-primary').innerText = isL ? "Masuk" : "Daftar";
        $('auth-toggle-text').innerHTML = isL ? `Belum punya akun? <span id="switch-to-register">Daftar</span>` : `Sudah ada akun? <span id="switch-to-register">Login</span>`;
    });
}

if($('btn-auth-primary')) {$('btn-auth-primary').addEventListener('click', async () => {
        const em = $('auth-email').value.trim(), pw =$('auth-password').value;
        if (!em || !pw) return await sysModal('alert', 'Gagal', 'Harap isi seluruh kredensial.');
        
        $('btn-auth-primary').disabled = true;
        $('btn-auth-primary').innerText = "Memproses...";
        
        const { error } = isL 
            ? await sb.auth.signInWithPassword({ email: em, password: pw }) 
            : await sb.auth.signUp({ email: em, password: pw });
        
        if (error) {
            await sysModal('alert', 'Autentikasi Gagal', error.message);
            $('btn-auth-primary').innerText = isL ? "Masuk" : "Daftar";
        } else {
            toggleModal(false);
            $('auth-email').value = '';$('auth-password').value = '';
        }
        $('btn-auth-primary').disabled = false;
    });
}

// --- LOGIKA DASHBOARD ---
if($('nav-dashboard'))$('nav-dashboard').addEventListener('click', renderDashboard);
if($('dashboard-search')) {$('dashboard-search').addEventListener('input', function() {
        const f = this.value.toLowerCase();
        document.querySelectorAll('#dashboard-list tr').forEach(r => {
            r.style.display = r.textContent.toLowerCase().includes(f) ? '' : 'none';
        });
    });
}

async function renderDashboard() {
    if (!u) return;
    view('dashboard-section');
    updateNavActive('nav-dashboard');
    $('dashboard-search').value = "";
    $('dashboard-list').innerHTML = "<tr><td colspan='6' style='text-align:center;'>Mengambil data...</td></tr>";
    
    const { data, error } = await sb.from('shared_texts').select('*').eq('user_id', u.id).order('created_at', { ascending: false });
    if (error || !data.length) {
        return $('dashboard-list').innerHTML = `<tr><td colspan='6' style="text-align:center;color:#7f8c8d;">${error ? error.message : 'Belum ada catatan yang tersimpan.'}</td></tr>`;
    }
    
    dbCache = data;
    const baseUrl = window.location.origin + window.location.pathname;
    
    $('dashboard-list').innerHTML = data.map(i => {
        let pwdDisplay = '-';
        if (i.has_password && i.password) pwdDisplay = `<span class="pwd-badge">${i.password}</span>`;
        else if (i.is_encrypted) pwdDisplay = `<span style="font-size:0.8rem;color:var(--warning-color);font-weight:600;">E2EE (Rahasia)</span>`;
        
        return `<tr>
            <td style="font-weight:500;">
                <a href="${baseUrl}?id=${i.slug}" target="_blank" style="text-decoration:none;color:var(--primary-color);" title="Buka Tautan">${i.slug}</a>
            </td>
            <td>${i.tag ? `<span class="tag-badge">${i.tag}</span>` : '-'}</td>
            <td><span class="badge">${(i.format || 'text').toUpperCase()}</span></td>
            <td>${i.views || 0}</td>
            <td>${pwdDisplay}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-edit" data-a="e" data-id="${i.id}">Edit</button>
                    <button class="btn-danger" data-a="d" data-id="${i.id}">Hapus</button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

if($('dashboard-list')) {$('dashboard-list').addEventListener('click', async (e) => {
        const a = e.target.getAttribute('data-a'), id = e.target.getAttribute('data-id');
        if (!a || !id) return;
        
        if (a === 'd') {
            const isConfirm = await sysModal('confirm', 'Konfirmasi Hapus', 'Apakah Anda yakin ingin menghapus catatan ini secara permanen?');
            if (isConfirm) await sb.from('shared_texts').delete().eq('id', id).then(renderDashboard);
        }
        
        if (a === 'e') {
            const rec = dbCache.find(i => i.id == id);
            if (!rec) return;
            
            let txt = rec.content;
            if (rec.is_encrypted) {
                const rawK = await sysModal('prompt', 'Akses E2EE Diperlukan', 'Masukkan Kunci E2EE atau paste URL lengkap untuk mendekripsi teks sebelum mengedit:');
                if (!rawK) return;
                const k = extractKey(rawK);
                txt = await dec(rec.content, rec.iv, k, true) || await dec(rec.content, rec.iv, k, false);
                if (!txt) return await sysModal('alert', 'Akses Ditolak', 'Kunci E2EE Salah atau rusak!');
            }
            
            reset();
            eId = rec.id;
            $('text-input').value = txt;
            $('custom-url').value = rec.slug;
            $('custom-url').disabled = true;
            $('text-tag').value = rec.tag || "";
            $('format-select').value = rec.format || (rec.is_code ? 'code' : 'text');
            $('is-e2ee').checked = rec.is_encrypted;
            $('is-burn').checked = rec.is_burn;
            $('btn-save').innerText = "Simpan Perubahan";
            $('btn-cancel-edit').classList.remove('hidden');
            updateNavActive('nav-home');
        }
    });
}

// --- LOGIKA MENYIMPAN TEKS ---
if($('btn-save')) {$('btn-save').addEventListener('click', async () => {
        const raw = $('text-input').value.trim();
        if (!raw) return await sysModal('alert', 'Peringatan', 'Silakan ketik sesuatu sebelum membagikan teks.');
        
        $('btn-save').innerText = "Mengamankan...";
        $('btn-save').disabled = true;
        
        let exp = $('expire-select').value > 0 ? new Date(Date.now() + $('expire-select').value * 60000).toISOString() : null;
        let slg = $('custom-url').value.trim().replace(/[^a-zA-Z0-9-]/g, "") || Math.random().toString(36).substring(2, 8);
        let pc = raw, iv = null, gk = null;
        
        if ($('is-e2ee').checked) {
            const o = await enc(raw, $('custom-e2ee-key').value.trim());
            pc = o.c; iv = o.iv; gk = o.k;
        }
        
        const hp = $('password-input').value.length > 0;
        const pl = { 
            slug: slg, content: pc, iv: iv, is_encrypted: $('is-e2ee').checked, 
            expires_at: exp, has_password: hp, password: hp ? $('password-input').value : null, 
            is_code: $('format-select').value === 'code', format:$('format-select').value, 
            is_burn: $('is-burn').checked, tag:$('text-tag').value.trim() || null, user_id: u?.id || null 
        };
        
        const { error } = eId ? await sb.from('shared_texts').update(pl).eq('id', eId) : await sb.from('shared_texts').insert([{ ...pl, views: 0 }]);
        
        if (error) {
            await sysModal('alert', 'Gagal', 'Kesalahan Sistem Server!');
            $('btn-save').disabled = false;
            $('btn-save').innerText = "Bagikan Teks";
            return;
        }
        
        view('link-container');
        $('share-link').value = `${window.location.origin}${window.location.pathname}?id=${slg}${$('is-e2ee').checked && gk ? `#${gk}` : ''}`;
        $('qrcode').innerHTML = "";
        new QRCode($('qrcode'), { text:$('share-link').value, width: 140, height: 140 });
        eId = null;
        $('btn-save').disabled = false;
        $('btn-save').innerText = "Bagikan Teks";
    });
}

// --- LOGIKA MEMBACA TEKS (UNLOCK & RENDER) ---
async function render(d, mKey = "") {
    let txt = d.content;
    
    if (d.is_encrypted) {
        if (!hKey && !mKey) {
            cData = d;
            view('password-section');
            $('password-box-title').innerText = "🛡️ Teks Dienkripsi E2EE";
            $('password-box-desc').innerText = "Masukkan kunci enkripsi, link hash (#), atau URL lengkap dari pembuat tautan.";
            $('read-password').value = "";
            return;
        }
        const activeKey = mKey || hKey;
        txt = mKey ? await dec(d.content, d.iv, mKey, true) : await dec(d.content, d.iv, hKey, false);
        
        if (!txt) return await sysModal('alert', 'Gagal Mendekripsi', 'Kunci Enkripsi E2EE tidak valid!');
    }
    
    if (d.is_burn) {
        $('status-text').innerText = "🔥 Teks telah dihancurkan dari server secara permanen!";
        $('status-text').style.color = "#e74c3c";
        await sb.from('shared_texts').delete().eq('slug', d.slug);
        cData = null;
    } else {
        $('view-count').innerText = `View: ${(d.views || 0) + 1}`;
        await sb.from('shared_texts').update({ views: (d.views || 0) + 1 }).eq('slug', d.slug);
    }
    
    view('read-section');
    gTxt = txt;
    
    const f = d.format || (d.is_code ? 'code' : 'text');
    if (f === 'code') {
        $('markdown-output').classList.add('hidden');
        $('code-wrapper').classList.remove('hidden');$('code-output').textContent = txt || " ";
        if(txt) Prism.highlightElement($('code-output'));
    } else if (f === 'markdown') {
        $('code-wrapper').classList.add('hidden');
        $('markdown-output').classList.remove('hidden');$('markdown-output').innerHTML = marked.parse(txt || "");
    } else {
        $('markdown-output').classList.add('hidden');
        $('code-wrapper').classList.remove('hidden');$('code-output').className = "";
        $('code-output').textContent = txt;
    }
}

if($('btn-unlock')) {$('btn-unlock').addEventListener('click', async () => {
        const isS = $('password-box-title').innerText.includes("Terkunci");
        const rawV = $('read-password').value.trim();
        if (!rawV) return;
        
        const v = isS ? rawV : extractKey(rawV);
        
        if (isS) {
            const { data } = await sb.from('shared_texts').select('*').eq('slug', slug).eq('password', v).single();
            if (!data) await sysModal('alert', 'Gagal', 'Password Server Salah!');
            else { cData = data; render(data); }
        } else if (cData) {
            render(cData, v);
        }
    });
}

// --- TOMBOL COPY ---
if($('btn-copy'))$('btn-copy').addEventListener('click', () => { $('share-link').select(); navigator.clipboard.writeText($('share-link').value); });
if($('btn-copy-content'))$('btn-copy-content').addEventListener('click', () => { if (gTxt) navigator.clipboard.writeText(gTxt); });

// --- INISIALISASI HALAMAN (MEMBACA LINK) ---
if (slug) {
    view('password-section');
    $('status-text').innerText = "Memverifikasi...";
    sb.from('shared_texts').select('has_password,is_burn,expires_at,views,is_code,format,is_encrypted,slug').eq('slug', slug).single().then(({ data: m }) => {
        if (!m) return $('status-text').innerText = "❌ Tautan tidak valid atau teks telah dihancurkan.";
        if (m.expires_at && new Date() > new Date(m.expires_at)) return $('status-text').innerText = "❌ Waktu kedaluwarsa tautan telah habis.";
        
        if (m.has_password) {
            $('password-box-title').innerText = "🔒 Tautan Terkunci";
            $('password-box-desc').innerText = "Catatan ini dilindungi oleh Password Server.";
        } else {
            sb.from('shared_texts').select('*').eq('slug', slug).single().then(({ data }) => { cData = data; render(data); });
        }
    });
}

// --- SERVICE WORKER ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(error => console.log('SW Registration Failed:', error));
    });
}