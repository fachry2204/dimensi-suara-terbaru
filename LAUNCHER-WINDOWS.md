# Launcher Windows Dimensi Suara

Jalankan `DimensiSuaraServer.exe` dari folder utama aplikasi. Launcher akan:

1. memeriksa Node.js dan dependency aplikasi;
2. membuat production build otomatis jika build belum tersedia;
3. menjalankan server pada `http://localhost:3000`;
4. membuka browser setelah server siap; dan
5. menghentikan server saat jendela launcher ditutup atau `Ctrl+C` ditekan.

File EXE harus tetap berada di folder aplikasi bersama `package.json`, `node_modules`, dan folder aplikasi lainnya.

Untuk membangun ulang EXE setelah source launcher diubah, jalankan:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\windows-launcher\build-launcher.ps1
```
