# Perlindungan masuk

Dua hal menghalangi orang yang menebak-nebak kata sandi di ruang kerja Anda: pembatas percobaan, yang selalu aktif, dan captcha yang bisa Anda tambahkan.

## Pembatas percobaan

Setelah **3** kali gagal masuk untuk sebuah email, setiap percobaan berikutnya menunggu sedikit lebih lama. Setelah **10** kali dalam 15 menit, email itu ditolak sampai jendela waktunya habis — atau, bila captcha aktif, diminta menyelesaikannya, sehingga tidak ada yang bisa mengunci akun orang lain. Alamat yang gagal **30** kali di email mana pun diperlakukan sama. Masuk yang berhasil menghapus hitungannya.

## Tambahkan captcha

1. Buka **Pengaturan → Perlindungan masuk** dan nyalakan **Gunakan captcha**.
2. Pilih penyedia — Cloudflare Turnstile, Google reCAPTCHA, atau hCaptcha — lalu buat situs untuk domain Anda di konsolnya untuk mendapatkan **site key** dan **secret**.
3. Isi keduanya, pilih **kapan meminta saat masuk** — **setelah percobaan gagal** (kebanyakan orang tidak pernah melihatnya) atau **setiap kali** — lalu simpan.
4. Gunakan **Uji** di pratinjau: kunci yang tersimpan diperiksa ke penyedia dari domain ini.

Captcha juga tampil di pendaftaran dan lupa kata sandi selama aktif. Bila kuncinya berhenti bekerja, matikan di sini: tidak ada yang terkunci karena captcha yang setengah diatur.
