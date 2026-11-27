# Updates via twocode.nl

Twenty-One werkt zichzelf bij via twocode.nl. GitHub wordt niet meer gebruikt voor nieuwe versies.

Een paar keer per dag vraagt de app aan `https://twocode.nl/wp-json/twocode/v1/app-update` of er een nieuwere versie is. Zo ja:
1. De app downloadt de update (alleen de app-bestanden, ongeveer 1 MB).
2. Hij controleert grootte, SHA-256 en de Ed25519-handtekening van jouw sleutel.
3. Hij zet de nieuwe bestanden klaar als `resources\app.next` naast de app.
4. Hij laat het weten: een Windows-melding, een kort bericht in het eiland, een groen bolletje op ⋯ met **Install update** in het menu, en een knop bij Instellingen → Nieuws.
5. Klik op een van die, en Twenty-One herstart in een paar seconden met de nieuwe versie. Doe je niks, dan gebeurt het bij afsluiten of na 30 minuten zonder muis of toetsenbord. De vorige versie blijft bewaard als `resources\app.prev`.

Alleen de app-bestanden worden bijgewerkt. Een versie voor een nieuwe Electron (`Twenty-One.exe`) vraagt om een nieuwe volledige download.

## Waar Twenty-One staat
Twenty-One zet zichzelf op één vaste plek: `%LOCALAPPDATA%\Programs\Twenty-One` (`self-install.cjs`). Start iemand Twenty-One ergens anders (vanuit de zip, Downloads, Program Files), dan kopieert hij zichzelf daarheen (alleen als die kopie nieuwer is), start die en stopt. Daar mag hij altijd updaten. Het Startmenu en "Start with Windows" wijzen er ook naartoe. Wat er gebeurt, staat in `%APPDATA%\twocode-assistent-electron\updates\install.log`.

De **portable zip** bevat `portable.txt` naast `Twenty-One.exe`: die kopie blijft waar je hem uitpakt, kopieert zichzelf niet en maakt geen Startmenu-snelkoppeling. De installer verwijdert dat bestand, zodat een geïnstalleerde kopie wél normaal blijft updaten.

## Een nieuwe versie uitbrengen
1. Verhoog `version` in `package.json`, bijvoorbeeld `1.2.0-beta.5`.
2. Draai `node tools/make-update.cjs`. Dat maakt `dist/Twenty-One-app-<versie>.zip` en `.json`.
3. Maak de volledige download `Twenty-One-Windows-<versie>.zip` (Electron als `Twenty-One.exe` + `resources\app` met dezelfde bestanden) en daarvan de installer: `node tools/make-setup.cjs <zip>` → `dist/Twenty-One-Setup-<versie>.exe` (dubbelklikken, installeert in AppData\Local\Programs\Twenty-One, start Twenty-One en legt uit hoe het werkt).
4. Zet de installer (Twenty-One-Setup-<versie>.exe) met Plesk in `httpdocs/wp-content/uploads/twocode-updates/` (hij is te groot voor een upload in WordPress).
5. wp-admin → Twenty-One → App-updates: kies de `.zip` en de `.json`, plak de link van de volledige download, schrijf kort wat er nieuw is, en klik op **Publiceren naar alle apps**.

twocode.nl/download geeft daarna altijd de nieuwste volledige download.

## Belangrijk
- **De eerste keer:** wie nog beta 2 of 3 heeft, moet één keer beta 4 (of nieuwer) downloaden. Daarin zit de updater; daarna gaat het vanzelf.
- **Sleutel:** de privésleutel staat in `%USERPROFILE%\.twocode\update-signing-key.pem`, buiten de repo. Maak er een back-up van. Kwijt betekent: geen updates meer voor bestaande apps. De publieke sleutel staat in `update-public-key.txt` en in de site-plugin (`includes/updates.php`).
- **Bij `npm start`** (ontwikkelen) installeert en update Twenty-One niks. Test de meldingen met `TWOCODE_FAKE_UPDATE=1.9.0`. Wat de updater doet, staat in `%APPDATA%\twocode-assistent-electron\updates\update.log`.
- **Tests:** `node --test tests/auto-update.test.cjs`.
