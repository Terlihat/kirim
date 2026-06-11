import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, doc, getDoc, Timestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// MASUKKAN CONFIG FIREBASE ANDA DI SINI
const firebaseConfig = {
  apiKey: "AIzaSyDVaGJoc_YeBqDsQrCou4BEhkU9Q3RJzBs",
  authDomain: "sharetext-21aa5.firebaseapp.com",
  projectId: "sharetext-21aa5",
  storageBucket: "sharetext-21aa5.firebasestorage.app",
  messagingSenderId: "977482218219",
  appId: "1:977482218219:web:1724eb82619e5d5fbf1cae"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const textInput = document.getElementById('text-input');
const btnSave = document.getElementById('btn-save');
const btnNew = document.getElementById('btn-new');
const expiryContainer = document.getElementById('expiry-container');
const expireSelect = document.getElementById('expire-select');
const linkContainer = document.getElementById('link-container');
const shareLinkInput = document.getElementById('share-link');
const btnCopy = document.getElementById('btn-copy');
const statusText = document.getElementById('status-text');

const urlParams = new URLSearchParams(window.location.search);
const textId = urlParams.get('id');

if (textId) {
    // === MODE BACA ===
    statusText.innerText = "Memuat teks...";
    textInput.readOnly = true;
    btnSave.style.display = 'none';
    expiryContainer.style.display = 'none'; // Sembunyikan setelan waktu saat membaca
    
    const docRef = doc(db, "shared_texts", textId);
    getDoc(docRef).then((docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            const now = new Date();

            // Cek Apakah Teks Sudah Kedaluwarsa
            if (data.expiresAt && now > data.expiresAt.toDate()) {
                statusText.innerText = "❌ Tautan Kedaluwarsa";
                textInput.value = "Maaf, waktu akses untuk teks ini telah habis (Expired).";
                textInput.style.color = "#7f8c8d";
            } else {
                // Teks Valid
                textInput.value = data.content;
                statusText.innerText = "Teks yang dibagikan:";
            }
            btnNew.style.display = 'inline-block';
        } else {
            statusText.innerText = "❌ Tidak Ditemukan";
            textInput.value = "Error: Data tidak ditemukan di database.";
            btnNew.style.display = 'inline-block';
        }
    }).catch((error) => {
        console.error("Error membaca data:", error);
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

        // Proteksi Bug Double-Click: Matikan tombol segera saat diklik
        btnSave.innerText = "Menyimpan...";
        btnSave.disabled = true;
        textInput.readOnly = true;

        // Kalkulasi Waktu Kedaluwarsa
        const minutes = parseInt(expireSelect.value);
        let expiresAt = null;

        if (minutes > 0) {
            const expireDate = new Date();
            expireDate.setMinutes(expireDate.getMinutes() + minutes);
            expiresAt = Timestamp.fromDate(expireDate); // Menggunakan Firebase Timestamp agar aman
        }

        try {
            const docRef = await addDoc(collection(db, "shared_texts"), {
                content: textContent,
                createdAt: Timestamp.now(),
                expiresAt: expiresAt
            });

            const shareUrl = `${window.location.origin}${window.location.pathname}?id=${docRef.id}`;
            
            shareLinkInput.value = shareUrl;
            linkContainer.classList.remove('hidden');
            btnSave.style.display = 'none';
            expiryContainer.style.display = 'none';
            btnNew.style.display = 'inline-block';
            statusText.innerText = "🎉 Teks berhasil dibagikan!";

        } catch (e) {
            console.error("Error menyimpan dokumen: ", e);
            alert("Gagal menyimpan teks ke server.");
            // Kembalikan state tombol jika gagal
            btnSave.innerText = "Bagikan Teks";
            btnSave.disabled = false;
            textInput.readOnly = false;
        }
    });
}

// Logika Tombol Copy
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
