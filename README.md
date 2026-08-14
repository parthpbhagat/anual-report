# 📊 BSE Annual Report Finder & Matrix Portal

Institutional-grade web application & automated directory scraper for searching and comparing **BSE India Listed Companies** with 30+ years of historical Annual Financial Reports.

---

## 🚀 1. Localhost પર Project Run કરવા માટેના Commands

### **Step 1: Dependencies Install કરો**
```bash
npm install
```

### **Step 2: Frontend & Server સાથે ચાલુ કરો (Recommended)**
```bash
npm run dev
```
> આ બટન એક્સપ્રેસ સર્વર (`http://localhost:5000`) અને Vite કલાયન્ટ (`http://localhost:3000`) બંને સાથે ચાલુ કરશે.  
> બ્રાઉઝરમાં ખોલો: **`http://localhost:3000`**

### **અલગ-અલગ Run કરવા માટે:**
- **માત્ર Frontend (Vite):**
  ```bash
  npm run client
  ```
- **માત્ર Backend Server (Node.js Express):**
  ```bash
  npm run server
  ```

---

## 🌐 2. BSE Directory Auto-Scraper રન કરવાનો Command

BSE ઈન્ડિયાની લિસ્ટેડ કંપનીઓ અને તેમના વર્ષો જૂના તમામ Annual Financial Report PDFs ડાઉનલોડ/સ્ટોર કરવા માટે:

```bash
npm run scrape
```
અથવા
```bash
node server/scripts/scrapeAndStore.js
```

---

## 🔐 3. Login Page ને Enable / Disable (ON/OFF) કરવાના સેટિંગ્સ

આ પ્રોજેક્ટમાં લૉગિન સિસ્ટમ મોડ્યુલર (Separate) છે.

### **લૉગિન પેજ બંધ (Disable / Turn OFF) કરવા માટે:**
1. ફાઇલ ખોલો: **`src/config.js`**
2. નીચે મુજબ ફેરફાર કરો:
   ```javascript
   export const ENABLE_AUTH = false;
   ```
3. Save કરો. હવે પ્રોજેક્ટમાં કોઈ પણ લૉગિન પેજ નહીં આવે અને ડાયરેક્ટ ડેશબોર્ડ જ ખુલી જશે.

### **લૉગિન પેજ ફરી ચાલુ (Enable / Turn ON) કરવા માટે:**
1. ફાઇલ ખોલો: **`src/config.js`**
2. નીચે મુજબ ફેરફાર કરો:
   ```javascript
   export const ENABLE_AUTH = true;
   ```

### **Default Login Credentials:**
- **Username:** `admin`
- **Password:** `123`

---

## 🛠️ Project Tech Stack
- **Frontend:** React 19, Vite, Lucide Icons, Glassmorphism Vanilla CSS
- **Backend:** Node.js, Express.js (Vercel Serverless Function compatible)
- **Database:** Supabase Cloud DB + Local JSON Database (`server/database.json`)
- **Deployment:** Vercel Ready (`vercel.json` + `api/index.js`)

---

## ☁️ Vercel Deployment

આ પ્રોજેક્ટ Vercel પર ડીપ્લોય કરવા માટે ૧૦૦% તૈયાર છે.
1. Code GitHub પર Push કરો.
2. Vercel ડેશબોર્ડ પરથી Repository Import કરો.
3. `.env` ના Credentials (જેવા કે `SUPABASE_URL`, `SUPABASE_KEY`) Vercel Environment Variables માં ઉમેરો.
4. **Deploy** પર ક્લિક કરો!
