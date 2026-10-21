# Sign-in protection

Two things stand between your workspace and someone guessing passwords: a throttle, which is always on, and a captcha you can add.

## The throttle

After **3** failed sign-ins for an email, each new attempt waits a little longer. After **10** within 15 minutes, that email is refused until the window ends — or, with a captcha on, asked to solve it instead, so nobody can lock someone else out. An address that fails **30** times across any emails is treated the same way. A successful sign-in clears the count.

## Add a captcha

1. Open **Settings → Sign-in protection** and turn on **Use a captcha**.
2. Pick a provider — Cloudflare Turnstile, Google reCAPTCHA or hCaptcha — and create a site for your domain in its console to get a **site key** and a **secret**.
3. Enter both, choose **when to ask on sign-in** — **after failed attempts** (most people never see it) or **every time** — and save.
4. Use **Test** in the preview: it checks the saved keys with the provider from this domain.

The captcha also shows on sign-up and forgot-password whenever it's on. If the keys stop working, turn it off here: nobody is locked out by a half-set captcha.
