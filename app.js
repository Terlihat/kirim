// Import library Supabase langsung dari CDN (Menggunakan ES Modules)
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// Kredensial Supabase Anda yang sudah dimasukkan secara otomatis
const SUPABASE_URL = 'https://qbklpsiiwnoyvnuzizqn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFia2xwc2lpd25veXZudXppenFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExOTk0ODUsImV4cCI6MjA5Njc3NTQ4NX0.sm6xp1xRWaJCYZRlaYBTqAu4nDxR4MhpNN4O7IyjpqM';

// Inisialisasi client Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Ambil semua elemen DOM dari HTML
const textInput = document.getElementById('text-input');
const btnSave = document.getElementById('btn-save');
const btnNew = document.getElementById('btn-new');
const expiryContainer = document.getElementById('expiry-container');
const expireSelect = document.getElementById('expire-select');
const linkContainer = document.getElementById('link-container');
const shareLinkInput = document.getElementById('share-link');
const btnCopy = document.getElementById('btn-copy');
const statusText = document.getElementById('status-text');

// Membaca parameter "?id=" dari URL browser
const urlParams = new URLSearchParams(window.location.search);
const textId = urlParams.get('id');

if (textId) {
    // === MODE BACA ===
    statusText.innerText = "Memuat teks...";
    textInput.readOnly = true;
    btnSave.style.display = 'none';
    expiryContainer.style.display = 'none'; // Sembunyikan setelan waktu saat membaca
    
    // Mengambil data berdasarkan ID dari tabel 'shared_texts' di Supabase
    supabase.from('shared_texts').select('*').eq('id', textId).single()
    .then(({ data, error }) => {
        if (error || !data) {
            statusText.innerText = "❌ Tidak Ditemukan";
            textInput.value = "Error: Data tidak ditemukan atau gagal dimuat.";
            btnNew.style.display = 'inline-block';
            return;
        }

        const now = new Date();
        // Cek jika teks memiliki properti 'expires_at' dan waktu saat ini telah melewatinya
        if (data.expires_at && now > new Date(data.expires_at)) {
            statusText.innerText = "❌ Tautan Kedaluwarsa";
            textInput.value = "Maaf, waktu akses untuk teks ini telah habis (Expired).";
            textInput.style.color = "#7f8c8d";
        } else {
            // Teks Valid dan belum kedaluwarsa
            textInput.value = data.content;
            statusText.innerText = "Teks yang dibagikan:";
        }
        btnNew.style.display = 'inline-block';
    }).catch((err) => {
        console.error("Error membaca data:", err);
        statusText.innerText = "❌ Terjadi Kesalahan";
        textInput.value = "Gagal memuat teks dari server.";
    });

} else {
    // === MODE TULIS ===
    btnSave.addEventListener('click', async () => {
        const textContent = textInput.value.trim();
        
        if (textContent === "") {
            alert("Teks tidak boleh kosong!");
            return;
        }

        // Proteksi Bug Double-Click: Menonaktifkan tombol segera saat proses penyimpanan berjalan
        btnSave.innerText = "Menyimpan...";
        btnSave.disabled = true;
        textInput.readOnly = true;

        // Kalkulasi Waktu Kedaluwarsa teks
        const minutes = parseInt(expireSelect.value);
        let expiresAt = null;

        if (minutes > 0) {
            const expireDate = new Date();
            expireDate.setMinutes(expireDate.getMinutes() + minutes);
            expiresAt = expireDate.toISOString(); // Format standar waktu ISO String untuk PostgreSQL
        }

        try {
            // Menyisipkan data ke tabel 'shared_texts' di Supabase
            const { data, error } = await supabase
                .from('shared_texts')
                .insert([{ content: textContent, expires_at: expiresAt }])
                .select()
                .single();

            if (error) throw error;

            // Membuat tautan berbagi unik berdasarkan ID yang dihasilkan Supabase
            const shareUrl = `${window.location.origin}${window.location.pathname}?id=${data.id}`;
            
            shareLinkInput.value = shareUrl;
            linkContainer.classList.remove('hidden');
            btnSave.style.display = 'none';
            expiryContainer.style.display = 'none';
            btnNew.style.display = 'inline-block';
            statusText.innerText = "🎉 Teks berhasil dibagikan!";

        } catch (e) {
            console.error("Error menyimpan dokumen ke Supabase: ", e);
            alert("Gagal menyimpan teks ke server. Pastikan tabel dan aturan RLS di Supabase sudah aktif.");
            
            // Mengembalikan keadaan tombol seperti semula jika penyimpanan gagal
            btnSave.innerText = "Bagikan Teks";
            btnSave.disabled = false;
            textInput.readOnly = false;
        }
    });
}

// Logika Interaksi Tombol Salin Link (Copy Link)
btnCopy.addEventListener('click', () => {
    shareLinkInput.select();
    navigator.clipboard.writeText(shareLinkInput.value);
    btnCopy.innerText = "Copied!";
    btnCopy.style.backgroundColor = "#2ecc71";
    setTimeout(() => {
        btnCopy.innerText = "Copy Link";
        btnCopy.style.backgroundColor = "#3498db";
    }, 2000);
});
