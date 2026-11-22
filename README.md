# Home Finance (المساعد المالي المنزلي) — web app

A free web version of the Smart Home Finance Assistant: a household budget and expense tracker the whole family can share.

- Arabic (right to left) and English, switchable in Settings.
- Plain HTML and JavaScript. No build step and nothing to install.
- Hosted free on GitHub Pages. Data and logins live in Supabase (free tier).
- Until Supabase is connected the app runs in **demo mode**: sample data, saved only in your browser.

## What it does

- **Households**: start one, invite your family with a link or a join code, approve them, and choose what each person can do
  (viewer, member, admin). One account can belong to several households.
- **Add expenses by typing or speaking** in Egyptian Arabic or English, for example
  "جبت لحمة بـ ٤٥٠ كاش" or "electricity bill 300 by card". The text is read **on the device** (the same parser as the
  Android app, ported to JavaScript) and fills in the amount, category, date and payment method. You check it, then save.
- **Dashboard**: budget, spending, what is left and how much of the budget is used, per month or per year, with a bar per
  category that turns amber near the limit and red when over.
- **History**: search, filter by category or payment method, sort, edit or delete, and export to CSV (opens in Excel and Google Sheets).
- **Budgets**: ten starting categories (the same as the Android app). Change their monthly budget, name and color, or add your own.
  A category you add by name (for example "مدارس") is picked up automatically when you type that word.
- **Backup**: download a backup file and restore it. The file uses the Android app's format, so a phone backup can be restored
  here and the other way round.
- **Installable**: in Chrome or Edge choose **Install** (on a phone, **Add to Home screen**).

Add `?demo` to the app's address to try it with sample data without touching the real household.

## Try it on this PC

Double-clicking `index.html` will not work (browsers block it). Start a small local server in this `web` folder:

```bash
python -m http.server 5175
```

Then open http://localhost:5175

## Go live

### 1. Create the database (Supabase)

1. Create a free account and a new project at https://supabase.com
2. Open **SQL Editor > New query**, paste the whole of `supabase/schema.sql`, and press **Run**.
3. Open **Project Settings > API** and copy the **Project URL** and the **anon / publishable** key.
4. Paste both into `config.js`:

   ```js
   supabaseUrl: 'https://xxxxxxxx.supabase.co',
   supabaseAnonKey: 'sb_publishable_...',
   ```

   This key is designed to be public. The access rules in `schema.sql` are what protect your data.
   Never put the **service_role** or secret key in this project.

### 2. Publish the app (GitHub Pages)

1. Create a new **public** repository on https://github.com (for example `home-finance`).
2. On the repository page choose **Add file > Upload files**, drag in everything **inside** this `web` folder
   (`index.html`, `config.js`, `manifest.webmanifest`, `sw.js`, `.nojekyll`, and the `css`, `js`, `icons` and `supabase` folders), and commit.
3. Open **Settings > Pages**, set **Source** to "Deploy from a branch", choose branch `main` and folder `/ (root)`, and save.
4. After a minute the app is live at `https://YOUR-USERNAME.github.io/YOUR-REPO/`.
5. Put that address in `config.js` as `appUrl`, so invite links always point to it.

### 3. Connect the two

In Supabase open **Authentication > URL Configuration** and set **Site URL** to your GitHub Pages address.
This makes the email confirmation and password-reset links bring people back to the app.

### 4. Create your account and household

Open the app, create an account, and start a household. **Whoever creates a household is its admin.**
In **Settings > Members and invites**, copy the invite link or join code and send it to your family. Each person who uses it
waits for you to approve them and choose their role.

To move your data from the Android app: in the phone app use **Save Backup**, then here open **Settings > Restore from file**.

## Privacy

- No ads, no analytics, no tracking.
- Expense text is read on the device. Nothing is sent to an AI service.
- Voice input uses the browser's own speech recognition. Chrome sends the audio to Google's speech service to turn it into text;
  the app only receives the text.
- Data is stored in your Supabase project. The database rules only let members of a household see that household's data.

## Tests

The parser and backup code have unit tests that run with Node.js (version 20 or newer), from the project folder:

```bash
node --test web/tests
```
