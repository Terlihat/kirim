// Import fungsi Firebase dari CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// TODO: GANTI KONFIGURASI INI DENGAN MILIK ANDA DARI FIREBASE CONSOLE
const firebaseConfig = {
  apiKey: "AIzaSyDVaGJoc_YeBqDsQrCou4BEhkU9Q3RJzBs",
  authDomain: "sharetext-21aa5.firebaseapp.com",
  projectId: "sharetext-21aa5",
  storageBucket: "sharetext-21aa5.firebasestorage.app",
  messagingSenderId: "977482218219",
  appId: "1:977482218219:web:1724eb82619e5d5fbf1cae"
};

// Inisialisasi Firebase & Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Ambil elemen DOM
const textInput = document.getElementById('text-input');
const btnSave = document.getElementById('btn-save');
const btnNew = document.getElementById('btn-new');
const linkContainer = document.getElementById('link-container');
const shareLinkInput = document.getElementById('share-link');
const btnCopy = document.getElementById('btn-copy');
const statusText = document.getElementById('status-text');

// Cek apakah ada parameter "?id=" di URL
const urlParams = new URLSearchParams(window.location.search);
const textId = urlParams.get('id');

if (textId) {
    // === MODE BACA (READ MODE) ===
    statusText.innerText = "Memuat teks...";
    textInput.readOnly = true; // Kunci area teks
    btnSave.style.display = 'none'; // Sembunyikan tombol simpan
    
    // Ambil data dari Firestore
    const docRef = doc(db, "shared_texts", textId);
    getDoc(docRef).then((docSnap) => {
        if (docSnap.exists()) {
            textInput.value = docSnap.data().content;
            statusText.innerText = "Teks yang dibagikan:";
            btnNew.style.display = 'inline-block'; // Tampilkan tombol buat baru
        } else {
            textInput.value = "Error: Teks tidak ditemukan atau sudah dihapus.";
            statusText.innerText = "Teks tidak ditemukan.";
            btnNew.style.display = 'inline-block';
        }
    }).catch((error) => {
        console.error("Error mengambil dokumen:", error);
        textInput.value = "Terjadi kesalahan saat memuat teks.";
    });

} else {
    // === MODE TULIS (CREATE MODE) ===
    btnSave.addEventListener('click', async () => {
        const textContent = textInput.value.trim();
        
        if (textContent === "") {
            alert("Teks tidak boleh kosong!");
            return;
        }

        btnSave.innerText = "Menyimpan...";
        btnSave.disabled = true;

        try {
            // Simpan ke collection 'shared_texts' di Firestore
            const docRef = await addDoc(collection(db, "shared_texts"), {
                content: textContent,
                timestamp: new Date()
            });

            // Buat URL Share
            const shareUrl = `${window.location.origin}${window.location.pathname}?id=${docRef.id}`;
            
            // Tampilkan UI Link
            shareLinkInput.value = shareUrl;
            linkContainer.classList.remove('hidden');
            textInput.readOnly = true;
            btnSave.style.display = 'none';
            btnNew.style.display = 'inline-block';
            statusText.innerText = "Teks berhasil dibagikan!";

        } catch (e) {
            console.error("Error menyimpan dokumen: ", e);
            alert("Gagal menyimpan teks.");
            btnSave.innerText = "Bagikan Teks";
            btnSave.disabled = false;
        }
    });
}

// Logika untuk tombol Copy Link
btnCopy.addEventListener('click', () => {
    shareLinkInput.select();
    shareLinkInput.setSelectionRange(0, 99999); /* Untuk perangkat mobile */
    navigator.clipboard.writeText(shareLinkInput.value);
    btnCopy.innerText = "Tercopy!";
    setTimeout(() => {
        btnCopy.innerText = "Copy Link";
    }, 2000);
});
