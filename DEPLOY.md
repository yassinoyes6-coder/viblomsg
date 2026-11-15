# نشر VIBLO-MSG مجاناً على Render 🚀

سيعطيك Render رابطاً دائماً بصيغة `https://<اسم-الخدمة>.onrender.com` مع HTTPS ودعم كامل لـ WebSocket (الرسائل الفورية والمكالمات).

> **مهم:** لا يمكن استخدام Cloudflare Pages (`pages.dev`) لأنه يستضيف ملفات ثابتة فقط، بينما VIBLO-MSG يحتاج خادم Node.js + Socket.IO.

---

## 1) إنشاء مستودع GitHub

1. أنشئ حساباً على [github.com](https://github.com) إن لم يكن لديك.
2. اضغط **New repository**.
3. الاسم: `viblomsg` — النوع: **Public** — بدون README أو .gitignore.
4. اضغط **Create repository**.

## 2) رفع الكود من جهازك

افتح PowerShell داخل مجلد المشروع ونفّذ:

```powershell
cd C:\Users\VIBLO\viblo-msg

git init
git add .
git commit -m "VIBLO-MSG initial deploy"

git branch -M main
git remote add origin https://github.com/<اسم-حسابك>/viblomsg.git
git push -u origin main
```

عند أول `git push` ستفتح نافذة تسجيل دخول GitHub في المتصفح — وافق عليها. (Git مثبّت الآن على جهازك.)

> بدّل `<اسم-حسابك>` باسم حسابك الحقيقي.

## 3) النشر على Render

1. اذهب إلى [render.com](https://render.com) وسجّل باستخدام **GitHub**.
2. من لوحة التحكم: **New +** → **Blueprint**.
3. اختر مستودع `viblomsg` → **Connect**.
4. سيتعرّف Render تلقائياً على ملف `render.yaml`، اضغط **Apply**.
5. انتظر 2–5 دقائق حتى تظهر حالة **Live**.

سيصبح رابطك:

```
https://viblomsg.onrender.com
```

(إن كان الاسم محجوزاً عند Render، سيطلب منك اسماً آخر مثل `viblomsg-app`.)

## 4) بعد النشر

- أنشئ حسابك من صفحة الموقع، وجرّب محادثة بين حسابين (نافذة عادية + نافذة خفيّة).
- المكالمات تعمل لأن Render يوفّر HTTPS.
- أي تعديل تدفعه إلى GitHub يُنشر تلقائياً (`autoDeploy`).

## 5) ملاحظات الخطة المجانية

- **الخمول:** الخدمة تنام بعد 15 دقيقة بلا زيارات، وأول طلب بعدها يستغرق ~50 ثانية للاستيقاظ.
- **تخزين مؤقت:** الخطة المجانية لا توفر قرصاً دائماً، لذلك `data/db.json` والملفات المرفوعة تُفقد عند إعادة النشر/إعادة التشغيل. الحسابات والمحادثات تبقى أثناء عمل الخدمة فقط.
  - للحل الدائم: ترقية Render لقرص مدفوع، أو إضافة قاعدة بيانات مجانية (Neon/Supabase) وتخزين ملفات (Cloudflare R2) — يمكن تنفيذها لاحقاً.
- **الجلسات:** `SESSION_SECRET` يُولَّد تلقائياً ويبقى ثابتاً، لذا لا تنتهي الجلسات عند كل نشر.
- **إبقاء الخدمة مستيقظة (اختياري):** استخدم خدمة Ping مجانية مثل [cron-job.org](https://cron-job.org) لفتح `https://viblomsg.onrender.com/api/config` كل 10 دقائق.

## بديل سريع بدون GitHub

إذا واجهت مشكلة في الرفع، أخبرني وسنجهّز النشر مباشرة عبر واجهة Render بعد رفع المشروع يدوياً من موقع GitHub (Add file → Upload files).
