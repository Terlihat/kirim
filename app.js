import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'
const sb = createClient('https://qbklpsiiwnoyvnuzizqn.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFia2xwc2lpd25veXZudXppenFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExOTk0ODUsImV4cCI6MjA5Njc3NTQ4NX0.sm6xp1xRWaJCYZRlaYBTqAu4nDxR4MhpNN4O7IyjpqM');

const $ = id => document.getElementById(id);
let u = null, isL = true, gTxt = "", cData = null, eId = null, dbCache = [];

const view = id => document.querySelectorAll('.app-section').forEach(s => s.classList.toggle('hidden', s.id !== id));
const b64 = b => btoa(String.fromCharCode(...new Uint8Array(b)));
const buf = s => Uint8Array.from(atob(s), c => c.charCodeAt(0)).buffer;

async function gKey(p) {
    return crypto.subtle.importKey("raw", await crypto.subtle.digest('SHA-256', new TextEncoder().encode(p)), { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

async function enc(t, p) {
    const iv = crypto.getRandomValues(new Uint8Array(12)), k = p ? await gKey(p) : await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
    return { c: b64(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, k, new TextEncoder().encode(t))), iv: b64(iv), k: p ? null : b64(await crypto.subtle.exportKey("raw", k)) };
}

async function dec(c, iv, k, isC) {
    try {
        const key = isC ? await gKey(k) : await crypto.subtle.importKey("raw", buf(k), { name: "AES-GCM" }, false, ["decrypt"]);
        return new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: buf(iv) }, key, buf(c)));
    } catch { return null; }
}

function reset() {
    view('editor-section'); 
    $('btn-cancel-edit').classList.add('hidden');
    ['text-input', 'custom-url', 'password-input', 'text-tag', 'custom-e2ee-key', 'read-password'].forEach(k => $(k).value = '');
    $('custom-url').disabled = false; 
    $('is-burn').checked = false; 
    $('is-e2ee').checked = true;
    $('expire-select').value = "0"; 
    $('format-select').value = "text"; 
    eId = null;
    $('btn-save').innerText = "Bagikan Teks"; 
    $('btn-save').disabled = false;
    $('status-text').innerText = "Bagikan teks dengan aman."; 
    $('status-text').style.color = "";
    window.history.pushState({}, document.title, window.location.pathname);
}

[$('btn-cancel-edit'), $('btn-dashboard-back'), $('btn-back-to-editor'), $('btn-read-new'), $('btn-close-auth'), $('btn-password-back')].forEach(b => b.addEventListener('click', reset));

if (localStorage.getItem('theme') === 'light') {
    document.body.classList.remove('dark-mode'); 
    $('theme-toggle').innerText = '🌙 Gelap';
}

$('theme-toggle').addEventListener('click', () => {
    const d = document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', d ? 'dark' : 'light');
    $('theme-toggle').innerText = d ? '☀️ Terang' : '🌙 Gelap';
});

sb.auth.onAuthStateChange((_, s) => {
    u = s?.user || null; 
    $('btn-view-dashboard').classList.toggle('hidden', !u);
    if (u) {
        $('auth-status-bar').innerHTML = `<span>👋 ${u.email}</span> <button id="lo" class="btn-secondary" style="padding:2px 5px;font-size:0.75rem;">Logout</button>`;
        $('lo').addEventListener('click', () => sb.auth.signOut().then(() => window.location.reload()));
    } else {
        $('auth-status-bar').innerHTML = `<button id="li">👤 Login</button>`;
        $('li').addEventListener('click', () => view('auth-section'));
    }
});

$('auth-toggle-text').addEventListener('click', (e) => {
    if (e.target.id !== 'switch-to-register') return;
    isL = !isL; 
    $('auth-title').innerText = isL ? "Masuk" : "Daftar";
    $('btn-auth-primary').innerText = isL ? "Masuk" : "Daftar";
    $('auth-toggle-text').innerHTML = isL ? `Belum ada akun? <span id="switch-to-register">Daftar</span>` : `Ada akun? <span id="switch-to-register">Login</span>`;
});

$('btn-auth-primary').addEventListener('click', async () => {
    const em = $('auth-email').value.trim(), pw = $('auth-password').value;
    if (!em || !pw) return alert("Isi!");
    $('btn-auth-primary').disabled = true;
    const { error } = isL ? await sb.auth.signInWithPassword({ email: em, password: pw }) : await sb.auth.signUp({ email: em, password: pw });
    if (error) alert(error.message); else reset();
    $('btn-auth-primary').disabled = false;
});

$('dashboard-search').addEventListener('input', function() {
    const f = this.value.toLowerCase();
    document.querySelectorAll('#dashboard-list tr').forEach(r => r.style.display = r.textContent.toLowerCase().includes(f) ? '' : 'none');
});

$('btn-view-dashboard').addEventListener('click', async () => {
    if (!u) return; 
    view('dashboard-section'); 
    $('dashboard-search').value = "";
    $('dashboard-list').innerHTML = "<tr><td colspan='5'>Memuat...</td></tr>";
    const { data, error } = await sb.from('shared_texts').select('*').eq('user_id', u.id).order('created_at', { ascending: false });
    if (error || !data.length) return $('dashboard-list').innerHTML = `<tr><td colspan='5'>${error ? error.message : 'Kosong'}</td></tr>`;
    dbCache = data;
    $('dashboard-list').innerHTML = data.map(i => `<tr>
        <td><a href="${window.location.pathname}?id=${i.slug}" target="_blank">${i.is_encrypted ? '🛡️ ' : ''}${i.slug}</a></td>
        <td>${i.tag ? `<span class="tag-badge">${i.tag}</span>` : '-'}</td>
        <td><span class="badge">${(i.format || 'text').toUpperCase()}</span></td><td>👁️ ${i.views || 0}</td>
        <td><button class="btn-warning" data-a="e" data-id="${i.id}">Edit</button> <button class="btn-danger" data-a="d" data-id="${i.id}">Hapus</button></td>
    </tr>`).join('');
});

$('dashboard-list').addEventListener('click', async (e) => {
    const a = e.target.getAttribute('data-a'), id = e.target.getAttribute('data-id');
    if (!a || !id) return;
    if (a === 'd' && confirm("Hapus?")) await sb.from('shared_texts').delete().eq('id', id).then(() => $('btn-view-dashboard').click());
    if (a === 'e') {
        const rec = dbCache.find(i => i.id == id); if (!rec) return;
        let txt = rec.content;
        if (rec.is_encrypted) {
            const k = prompt("Masukkan Kunci:"); if (!k) return;
            txt = await dec(rec.content, rec.iv, k, true) || await dec(rec.content, rec.iv, k, false);
            if (!txt) return alert("Salah!");
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
        $('btn-save').innerText = "Simpan"; 
        $('btn-cancel-edit').classList.remove('hidden');
    }
});

async function render(d, mKey = "") {
    let txt = d.content;
    if (d.is_encrypted) {
        if (!hKey && !mKey) {
            cData = d; 
            view('password-section'); 
            $('password-box-title').innerText = "🛡️ Dekripsi E2EE";
            $('password-box-desc').innerText = "Masukkan passphrase E2EE."; 
            $('read-password').value = ""; 
            return;
        }
        txt = mKey ? await dec(d.content, d.iv, mKey, true) : await dec(d.content, d.iv, hKey, false);
        if (!txt) return alert("Kunci Salah!");
    }
    view('read-section'); 
    gTxt = txt; 
    const f = d.format || (d.is_code ? 'code' : 'text');
    if (f === 'code') { 
        $('markdown-output').classList.add('hidden'); 
        $('code-wrapper').classList.remove('hidden'); 
        $('code-output').textContent = txt; 
        Prism.highlightElement($('code-output')); 
    } else if (f === 'markdown') { 
        $('code-wrapper').classList.add('hidden'); 
        $('markdown-output').classList.remove('hidden'); 
        $('markdown-output').innerHTML = marked.parse(txt); 
    } else { 
        $('markdown-output').classList.add('hidden'); 
        $('code-wrapper').classList.remove('hidden'); 
        $('code-output').className = ""; 
        $('code-output').textContent = txt; 
    }
    
    if (d.is_burn) { 
        $('status-text').innerText = "🔥 Terbakar & Terhapus!"; 
        $('status-text').style.color = "#e74c3c"; 
        await sb.from('shared_texts').delete().eq('slug', slug); 
    } else { 
        $('view-count').innerText = `👁️: ${(d.views || 0) + 1}`; 
        await sb.from('shared_texts').update({ views: (d.views || 0) + 1 }).eq('slug', slug); 
    }
}

$('btn-unlock').addEventListener('click', async () => {
    const isS = $('password-box-title').innerText.includes("Terkunci"), v = $('read-password').value.trim(); 
    if (!v) return;
    if (isS) {
        const { data } = await sb.from('shared_texts').select('*').eq('slug', slug).eq('password', v).single();
        if (!data) alert("Salah!"); else { cData = data; render(data); }
    } else if (cData) render(cData, v);
});

const pms = new URLSearchParams(window.location.search), slug = pms.get('id'), hKey = window.location.hash.substring(1);
if (slug) {
    view('password-section'); 
    $('status-text').innerText = "Memverifikasi...";
    sb.from('shared_texts').select('has_password,is_burn,expires_at,views,is_code,format,is_encrypted').eq('slug', slug).single().then(({ data: m }) => {
        if (!m) return $('status-text').innerText = "❌ Tidak ditemukan.";
        if (m.expires_at && new Date() > new Date(m.expires_at)) return $('status-text').innerText = "❌ Kedaluwarsa.";
        if (m.has_password) {
            $('password-box-title').innerText = "🔒 Terkunci"; 
            $('password-box-desc').innerText = "Teks dilindungi sandi server.";
        } else {
            sb.from('shared_texts').select('*').eq('slug', slug).single().then(({ data }) => { cData = data; render(data); });
        }
    });
} else {
    $('btn-save').addEventListener('click', async () => {
        const raw = $('text-input').value.trim(); if (!raw) return;
        $('btn-save').innerText = "Proses..."; 
        $('btn-save').disabled = true;
        let exp = $('expire-select').value > 0 ? new Date(Date.now() + $('expire-select').value * 60000).toISOString() : null;
        let slg = $('custom-url').value.trim().replace(/[^a-zA-Z0-9-]/g, "") || Math.random().toString(36).substring(2, 8);
        let pc = raw, iv = null, gk = null;
        if ($('is-e2ee').checked) { 
            const o = await enc(raw, $('custom-e2ee-key').value.trim()); 
            pc = o.c; iv = o.iv; gk = o.k; 
        }
        const hp = $('password-input').value.length > 0;
        const pl = { slug: slg, content: pc, iv: iv, is_encrypted: $('is-e2ee').checked, expires_at: exp, has_password: hp, password: hp ? $('password-input').value : null, is_code: $('format-select').value === 'code', format: $('format-select').value, is_burn: $('is-burn').checked, tag: $('text-tag').value.trim() || null, user_id: u?.id || null };
        const { error } = eId ? await sb.from('shared_texts').update(pl).eq('id', eId) : await sb.from('shared_texts').insert([{ ...pl, views: 0 }]);
        if (error) { alert("Gagal!"); $('btn-save').disabled = false; return; }
        view('link-container'); 
        $('share-link').value = `${window.location.origin}${window.location.pathname}?id=${slg}${$('is-e2ee').checked && gk ? `#${gk}` : ''}`;
        $('qrcode').innerHTML = ""; 
        new QRCode($('qrcode'), { text: $('share-link').value, width: 120, height: 120 }); 
        eId = null;
    });
    $('btn-copy').addEventListener('click', () => { $('share-link').select(); navigator.clipboard.writeText($('share-link').value); });
}
$('btn-copy-content').addEventListener('click', () => { if (gTxt) navigator.clipboard.writeText(gTxt); });
