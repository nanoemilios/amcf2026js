# AMCF Website - Deployment Checklist

## ✅ Completed (Code Changes)
- [x] Created `php/contact_me.php` - Contact form handler with validation, rate limiting, header injection protection
- [x] Created `php/subscription.php` - Newsletter signup with CSV storage, rate limiting
- [x] Created `data/newsletter.csv` - Newsletter subscriber storage
- [x] Secured `save.php` - Server-side password verification, HTTPS enforcement, env var for hash
- [x] Updated `js/admin.js` - Sends plaintext password over HTTPS (server hashes)
- [x] Added multilingual error codes to all 6 i18n files (de, de-ch, en, es, pt, gl)
- [x] Updated `js/scripts.js` - Translates PHP error codes via i18n system
- [x] Fixed German typos in `index.html` and `i18n.de.js` / `i18n.de-ch.js`
- [x] Added dynamic footer year (JavaScript)
- [x] Created `.htaccess` - Security headers, HTTPS enforcement, caching, compression, file protection
- [x] Created `robots.txt` and `sitemap.xml`
- [x] Fixed PHP timezone in all PHP files (Europe/Zurich)

## 🔧 Server Configuration Required

### 1. PHP Configuration
```ini
; php.ini
date.timezone = Europe/Zurich
sendmail_path = /usr/sbin/sendmail -t -i  ; or configure SMTP
session.save_path = /var/lib/php/sessions  ; writable by www-data
```

### 2. Apache/Nginx Setup
- Enable modules: `mod_headers`, `mod_rewrite`, `mod_expires`, `mod_deflate`, `mod_ssl`
- Document root: `/path/to/2026/`
- PHP-FPM or mod_php

### 3. Environment Variable (CRITICAL)
Set `AMCF_ADMIN_PASSWORD_HASH` in Apache/PHP-FPM config:
```apache
# Apache vhost or .htaccess (not recommended for production)
SetEnv AMCF_ADMIN_PASSWORD_HASH "6db70435647eeba1749000dfcb18e0bbe1af1997fd14ef0361e305f34b17ad6e"

# Better: PHP-FPM pool config (/etc/php/8.1/fpm/pool.d/www.conf)
env[AMCF_ADMIN_PASSWORD_HASH] = "6db70435647eeba1749000dfcb18e0bbe1af1997fd14ef0361e305f34b17ad6e"
```
Generate new hash: `echo -n "YOUR_PASSWORD" | sha256sum`

### 4. File Permissions
```bash
chown -R www-data:www-data /path/to/2026/
chmod 755 /path/to/2026/
chmod 775 /path/to/2026/data/
chmod 664 /path/to/2026/data/projects.js
chmod 664 /path/to/2026/data/newsletter.csv
```

### 5. SSL Certificate
- Obtain Let's Encrypt cert: `certbot --apache -d albertocosta.info`
- Enable HSTS in `.htaccess` after confirming HTTPS works

### 6. Email Delivery
- Configure Postfix/Sendmail or use SMTP library (PHPMailer)
- Test: `echo "test" | mail -s "test" info@albertocosta.info`

## 🧪 Testing Checklist

### Local Testing
```bash
cd /path/to/2026
php -S localhost:8000
# Open http://localhost:8000
```

### Test Cases
- [ ] Contact form: valid submission → success message in current language
- [ ] Contact form: missing name → translated error
- [ ] Contact form: invalid email → translated error
- [ ] Contact form: missing message → translated error
- [ ] Contact form: rate limit (30s) → translated error
- [ ] Newsletter: valid email → success in current language
- [ ] Newsletter: invalid email → translated error
- [ ] Newsletter: rate limit (60s) → translated error
- [ ] Admin login: correct password → access granted
- [ ] Admin login: wrong password → error
- [ ] Admin: add/edit/hide project → syncs to server (check data/projects.js)
- [ ] Admin: edit resume facts/jobs → syncs to server
- [ ] Language switch: all 6 languages work, forms translate
- [ ] Dark mode toggle persists
- [ ] Portfolio filtering works
- [ ] Lightboxes open/close
- [ ] HTTPS enforced (no mixed content)
- [ ] Security headers present (check with securityheaders.com)

## 📦 Production Deployment

```bash
# 1. Build (if using build tools - currently not needed)
# 2. Deploy files to server
rsync -avz --exclude '.git' --exclude 'DEPLOYMENT_CHECKLIST.md' ./ user@server:/var/www/albertocosta.info/

# 3. Set permissions on server
ssh user@server 'chown -R www-data:www-data /var/www/albertocosta.info && chmod 775 /var/www/albertocosta.info/data'

# 4. Configure Apache/PHP-FPM with env var
# 5. Reload services
ssh user@server 'systemctl reload php8.1-fpm apache2'

# 6. Test live site
curl -I https://albertocosta.info/
```

## 🔄 Maintenance

### Weekly
- Check `data/newsletter.csv` for new subscribers
- Review PHP error logs: `/var/log/php8.1-fpm.log` or Apache error log

### Monthly
- Update sitemap.xml `lastmod` dates
- Check for PHP/Apache security updates
- Backup `data/projects.js` and `data/newsletter.csv`

### As Needed
- Change admin password: generate new hash, update env var, reload PHP-FPM
- Add new portfolio projects via admin panel
- Update resume via admin panel

## 📝 Notes

- **jQuery Version**: Currently using jQuery 1.x (very old). Consider upgrading to 3.7+ but test all plugins (superslides, mixitup, flexslider, etc.) for compatibility.
- **CSP**: Current policy allows `'unsafe-inline'` and `'unsafe-eval'` due to inline scripts. Refactor to external files to tighten CSP.
- **Rate Limiting**: Current implementation uses PHP sessions (per-user, in-memory). For production scale, use Redis or database.
- **Email**: PHP `mail()` is basic. For production, use SMTP (PHPMailer) or transactional email service (SendGrid, Mailgun).