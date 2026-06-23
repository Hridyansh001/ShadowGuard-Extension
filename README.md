<div align="center">

# 🛡️ ShadowGuard

### AI Prompt Sensitive Data Leakage Prevention System

<img src="https://readme-typing-svg.demolab.com?font=Inter&weight=600&size=24&pause=1000&color=F97316&center=true&vCenter=true&width=700&lines=Protecting+Users+From+AI+Data+Leakage;Real-Time+Prompt+Monitoring;Sensitive+Data+Detection+Extension;Browser-Based+Security+Middleware" />

<br>

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-orange?style=for-the-badge&logo=googlechrome)
![JavaScript](https://img.shields.io/badge/JavaScript-Frontend-yellow?style=for-the-badge&logo=javascript)
![Security](https://img.shields.io/badge/Cybersecurity-AI%20Protection-red?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Prototype-success?style=for-the-badge)

</div>

---

# 📌 Overview

ShadowGuard is a browser extension designed to prevent accidental leakage of sensitive information while interacting with AI platforms such as ChatGPT.

The extension continuously monitors user prompts in real time and warns users whenever potentially sensitive or confidential information is detected before submission.

---

# ✨ Core Features

## 🔍 Real-Time Prompt Monitoring
Continuously scans user input while typing inside AI chat platforms.

## 🚫 Sensitive Data Detection
Detects:
- Aadhaar Numbers
- Bank Details
- IFSC Codes
- Passwords
- Emails
- Phone Numbers

## ⚠️ Dynamic Alert System
Displays warning or blocking alerts instantly before data exposure occurs.

## 🌐 Browser Extension Integration
Runs directly inside ChatGPT using Chrome Extension APIs and content scripts.

## 🧠 AI Prompt Security Middleware
Acts as a middleware layer between users and AI systems to reduce accidental data leakage.

---

# 🛠️ Tech Stack

<div align="center">

| Technology | Purpose |
|---|---|
| JavaScript | Extension Logic |
| HTML5 | Popup UI |
| CSS3 | Styling & Animations |
| Chrome Extension API | Browser Integration |
| DOM Manipulation | Real-Time Monitoring |
| Fetch API | Backend Communication |

</div>

---

# 🧱 Project Architecture

```text
User Types Prompt
        ↓
ShadowGuard Detects Input
        ↓
Prompt Gets Scanned
        ↓
Sensitive Data Identified
        ↓
Warning Banner Displayed
        ↓
User Prevents Data Leakage
```

---

# 📂 Project Structure

```bash
shadowguard-extension/
│
├── manifest.json
├── content.js
├── styles.css
├── popup.html
├── popup.js
├── icon.png
└── README.md
```

---

# 🧪 Testing Scenarios

| Input Type | Expected Result |
|---|---|
| Aadhaar Number | 🚫 Block Alert |
| Bank Details | 🚫 Block Alert |
| Email Address | ⚠️ Warning Alert |
| Phone Number | ⚠️ Warning Alert |
| Normal Prompt | ✅ No Alert |

---

## Example Prompt

```text
My Aadhaar number is 1234 5678 9012
```

### ShadowGuard Response

```text
🚫 ShadowGuard Alert
Sensitive personal or financial data detected
```

---

# 🚀 Installation Guide

## 1️⃣ Clone Repository

```bash
git clone https://github.com/Kshitj696/shadowguard-extension.git
```

---

## 2️⃣ Open Chrome Extensions

```text
chrome://extensions
```

---

## 3️⃣ Enable Developer Mode

Turn ON:
- Developer Mode

---

## 4️⃣ Load Extension

Click:
```text
Load unpacked
```

Select:
```text
shadowguard-extension
```

---

# 🎯 Current Project Status

<div align="center">

| Feature | Status |
|---|---|
| Chrome Extension | ✅ Complete |
| Prompt Monitoring | ✅ Complete |
| Alert System | ✅ Complete |
| Real-Time Detection | ✅ Complete |
| GitHub Integration | ✅ Complete |
| Backend Simulation | ✅ Complete |

</div>

---

# 🔮 Future Enhancements

- 🤖 AI/ML-Based Classification
- 🔐 JWT Authentication
- 📊 Admin Analytics Dashboard
- ☁️ Cloud Backend Integration
- 🌍 Multi-Platform AI Support
- 📈 Threat Intelligence Monitoring
- 🧾 Prompt History & Reporting

---

# 👨‍💻 Project Information

| Category | Details |
|---|---|
| Project Name | ShadowGuard |
| Project Type | NTCC In-House Project |
| Domain | Cybersecurity + AI |
| Role | Frontend Extension Development |

---

# 📖 About

AI Prompt Security Middleware with real-time leak detection, sanitization, browser extension monitoring, and admin dashboard analytics.

---

# 🛡️ Vision

> “Protecting users from accidental AI data leakage through intelligent browser-side security monitoring.”

---

<div align="center">

### ⭐ ShadowGuard — Secure Your AI Conversations

</div>