# HENGEBUKEN Golf Society - Deployment Guide til Render.com

Denne guiden tar deg gjennom HELE prosessen steg-for-steg med detaljerte instruksjoner. Jeg hjelper deg gjennom hvert steg!

## Forutsetninger
- ✅ GitHub konto opprettet
- ✅ Render.com konto opprettet
- ✅ Koden er klar for deployment

## 🆘 **VIKTIG: Be om hjelp når du trenger det!**
Send meg beskjed når du kommer til hvert steg, så kan jeg hjelpe deg gjennom det. Du trenger ikke gjøre alt alene!

## 📂 Steg 1: Forbered GitHub Repository

### 1.1 Opprett nytt GitHub Repository
1. **Gå til GitHub.com** og logg inn
2. **Klikk på grønn "New" knapp** (øverst til venstre)
3. **Repository navn**: `hengebuken-golf-society`
4. **Velg "Public"** (anbefalt - letter å deploye)
5. **IKKE** kryss av for "Add a README file"
6. **Klikk "Create repository"**

### 1.2 Last opp koden fra Replit
**Metode 1: Via GitHub web interface (enklest)**
1. På den nye repository siden, klikk **"uploading an existing file"**
2. **Drag and drop ALLE filene** fra Replit til GitHub
3. **VIKTIGE mapper som MÅ være med:**
   - `client/` mappen (hele React frontend)
   - `server/` mappen (hele Express backend)  
   - `shared/` mappen (database schemas)
   - `public/` mappen (statiske filer)
   - `.env.example` fil
   - `render.yaml` fil
   - `package.json` fil
   - `vite.config.ts` fil
   - `tailwind.config.ts` fil
   - Alle andre filer i root mappen

**🆘 HJELP: Si fra når du kommer til dette steget, så kan jeg guide deg gjennom fil-upload!**

### 1.2 Viktige filer som må være med:
- ✅ `.env.example` - Eksempel på miljøvariabler
- ✅ `render.yaml` - Automatisk deployment konfigurasjon
- ✅ `package.json` - Allerede konfigurert for produksjon
- ✅ Hele `client/` mappen med React frontend
- ✅ Hele `server/` mappen med Express backend
- ✅ `shared/` mappen med delte TypeScript schemas

## Steg 2: Deploy til Render.com

### 2.1 Koble til GitHub
1. Gå til [render.com](https://render.com)
2. Logg inn med GitHub kontoen din
3. Autorisér Render til å få tilgang til repositories

### 2.2 Opprett Web Service
1. Klikk på "New" → "Web Service"
2. Velg ditt GitHub repository: `hengebuken-golf-society`
3. Klikk "Connect"

### 2.3 Konfigurer Deployment
Render vil automatisk lese `render.yaml` filen, men bekreft innstillingene:

- **Name**: `hengebuken-golf-app`
- **Environment**: `Node`
- **Build Command**: `npm run build`
- **Start Command**: `npm start`
- **Instance Type**: Velg "Free" for testing eller "Starter" for produksjon

### 2.4 Sett opp Database
1. Render vil automatisk opprette PostgreSQL database fra `render.yaml`
2. Database navn: `hengebuken-db`
3. DATABASE_URL vil automatisk bli satt som miljøvariabel

### 2.5 Legg til Email Miljøvariabler
I Render dashboard, under "Environment":

**Gmail SMTP (Primær):**
- `GMAIL_USER`: din-email@gmail.com
- `GMAIL_PASS`: ditt-gmail-app-passord

**SendGrid (Backup):**
- `SENDGRID_API_KEY`: ditt-sendgrid-api-key

**Hvordan få Gmail App Password:**
1. Gå til Google Account innstillinger
2. Aktiver 2-faktor autentisering
3. Gå til "App passwords"
4. Generer nytt app-passord for "Mail"
5. Bruk dette passordet i GMAIL_PASS

## Steg 3: Deploy og Test

### 3.1 Start Deployment
1. Klikk "Create Web Service"
2. Vent på at build prosessen fullføres (5-15 minutter)
3. Render vil vise live logs under byggingen

### 3.2 Database Setup
Når appen er deployet:
1. Gå til "Shell" fanen i Render dashboard
2. Kjør: `npm run db:push`
3. Dette setter opp alle database tabeller automatisk

### 3.3 Teste Applikasjonen
1. Åpne URL-en Render gir deg: `https://hengebuken-golf-app.onrender.com`
2. Test at alle funksjoner virker:
   - ✅ Login system
   - ✅ Tidsplan visning
   - ✅ Medlemsadministrasjon
   - ✅ Spania tilstedeværelse
   - ✅ HCP oppdatering
   - ✅ Email funksjonalitet

## Steg 4: Automatiske Oppdateringer

Fra nå av:
- Hver gang du pusher endringer til GitHub repository
- Vil Render automatisk rebuilde og deploye applikasjonen
- Du trenger ikke gjøre noe manuelt

## Viktige Notater

### Free Tier Begrensninger:
- Tjenesten "sover" etter 15 min inaktivitet
- Første besøk etter pause kan ta 30-60 sekunder
- 512MB RAM, begrenset CPU
- Oppgradér til "Starter" plan ($7/måned) for produksjon

### Security:
- Alle miljøvariabler er kryptert og sikre
- DATABASE_URL genereres automatisk
- SESSION_SECRET genereres automatisk
- Kun du har tilgang til admin panel

### Support:
- Render har utmerket dokumentasjon på render.com/docs
- Live chat support tilgjengelig
- Detaljerte logs for feilsøking

## Din App URL
Etter deployment vil appen være tilgjengelig på:
`https://hengebuken-golf-app.onrender.com`

**Gratulerer! HENGEBUKEN golf society er nå live på internett! 🏌️‍♂️⛳**