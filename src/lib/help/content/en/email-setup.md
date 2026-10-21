# Setting up email

The workspace sends email for invites, password resets and notifications through a mail server you choose — your email provider's SMTP service.

## Connect a mail server

1. Open **Settings → Mail**.
2. Under **Mail server**, enter what your provider gives you: the **host** (such as `smtp.example.com`), the **port** and its **security** — usually 587 with STARTTLS, or 465 with TLS — and the username and password. The password is stored encrypted.
3. Set the name and address emails come **from**. Many providers only accept an address on a domain you've verified with them.
4. Save, then choose **Send test email**: it goes to you through the saved settings, and says why if it couldn't.

## Reword the emails

Under **Emails** you can change the subject and wording of each email, once per language. Placeholders such as `{{name}}` are filled in when it's sent; the button and its link are added for you. **Reset to default** brings back the original.
