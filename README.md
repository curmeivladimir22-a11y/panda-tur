# PANDA TUR

Platformă de turism: tururi, circuite, excursii, hoteluri, bilete avia și auto, servicii și formular de rezervare.

Site: https://panda-tur-beta.vercel.app  
Panou de administrare: https://panda-tur-beta.vercel.app/admin.html

## Cum funcționează cererile

1. Clientul trimite o rezervare sau o cerere de pe site.
2. Funcția de server `api/zayavka.js` (Vercel) o salvează în Supabase, în tabelul `zayavki`, cu data creării și statusul `новая`.
3. Aceeași funcție trimite imediat un mesaj în Telegram proprietarului, cu toate datele cererii.
4. În `admin.html`, după logare (Supabase Auth), administratorul vede lista, schimbă statusul (`новая` / `в работе` / `закрыта`) și filtrează după status.

## Chei și tokenuri

Nicio cheie nu e în cod. Toate stau în **Vercel → Settings → Environment Variables**:

| Variabilă | Ce este |
|---|---|
| `SUPABASE_URL` | adresa proiectului Supabase |
| `SUPABASE_KEY` | cheia publică (publishable) Supabase |
| `TELEGRAM_BOT_TOKEN` | tokenul botului de la @BotFather |
| `TELEGRAM_CHAT_ID` | ID-ul chatului în care vin notificările |

Vezi `.env.example` pentru format. Fișierele `.env` sunt în `.gitignore`.
