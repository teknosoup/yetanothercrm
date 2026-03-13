# Product Requirements Document (PRD)
## Aplikasi CRM End-to-End
**Versi:** 1.1  
**Status:** Draft  
**Teknologi:** **Opsi B — Next.js + NestJS + PostgreSQL**

---

## 1. Ringkasan Produk

Aplikasi CRM (Customer Relationship Management) end-to-end adalah sistem berbasis web yang dirancang untuk mengelola seluruh siklus hubungan pelanggan, mulai dari lead acquisition, prospect qualification, account dan contact management, activity tracking, sales pipeline, hingga reporting dan audit trail.

Sistem ini akan menjadi **single source of truth** untuk data pelanggan, histori interaksi, pipeline penjualan, dan aktivitas tindak lanjut antar unit kerja.

---

## 2. Latar Belakang

Pada banyak organisasi, data pelanggan dan aktivitas penjualan masih tersebar di berbagai media seperti spreadsheet, email, chat, dan aplikasi terpisah. Kondisi ini menyebabkan beberapa masalah utama:

- data pelanggan tidak konsisten
- histori interaksi tidak terpusat
- follow-up sering terlewat
- pipeline penjualan sulit dipantau
- reporting lambat dan manual
- audit aktivitas user tidak terdokumentasi dengan baik

Aplikasi CRM ini dibangun untuk menyatukan proses tersebut dalam satu platform terintegrasi.

---

## 3. Tujuan Produk

Tujuan utama dari aplikasi ini adalah:

- meningkatkan efektivitas pengelolaan lead dan customer
- meningkatkan conversion rate dari lead ke opportunity
- meningkatkan visibilitas pipeline penjualan
- meminimalkan missed follow-up
- mempercepat penyusunan laporan operasional dan manajerial
- meningkatkan kualitas dan konsistensi data pelanggan
- menyediakan audit trail yang lengkap untuk kebutuhan kontrol internal

---

## 4. Sasaran Bisnis

Sistem harus mampu mendukung sasaran bisnis berikut:

- peningkatan kecepatan respon terhadap lead baru
- peningkatan jumlah lead yang berhasil dikualifikasi
- peningkatan win rate opportunity
- pengurangan aktivitas sales yang overdue
- peningkatan akurasi forecasting pipeline
- penguatan kontrol data dan aktivitas pengguna

---

## 5. Pengguna Utama

### 5.1 Sales
Bertugas mengelola lead, contact, account, opportunity, serta melakukan follow-up dan pencatatan aktivitas.

### 5.2 Marketing
Bertugas memasukkan lead dari campaign, memantau source lead, dan mengukur kualitas lead.

### 5.3 Customer Service / Relationship Manager
Bertugas melihat histori customer, menangani inquiry dasar, dan membantu onboarding customer.

### 5.4 Supervisor / Manager
Bertugas memantau pipeline tim, approval tertentu, serta memonitor task overdue dan performa tim.

### 5.5 Administrator
Bertugas mengelola user, role, permission, master data, dan konfigurasi sistem.

### 5.6 Management / Executive
Bertugas memantau KPI, forecasting, performa sales, dan status customer secara ringkas melalui dashboard.

---

## 6. Scope Produk

### 6.1 In Scope — Phase 1
- authentication dan role-based access control
- lead management
- contact management
- account/company management
- opportunity management
- activity dan task management
- notes dan interaction history
- dashboard dan reporting dasar
- user management
- audit trail
- import/export data
- notifikasi dasar

### 6.2 In Scope — Phase 2
- quotation/proposal
- onboarding customer workflow
- SLA reminder
- ticketing/service request ringan
- email/WhatsApp integration
- integrasi ke sistem eksternal
- analytics dan forecasting lanjutan
- plugin marketplace/internal extension catalog

### 6.3 Out of Scope
- full ERP
- full billing/invoicing kompleks
- call center platform penuh
- marketing automation enterprise lengkap
- customer data platform (CDP) enterprise

---

## 7. Arsitektur Teknologi

### 7.1 Stack yang Digunakan
- **Frontend:** Next.js
- **Backend:** NestJS
- **Database:** PostgreSQL

### 7.2 Alasan Pemilihan Opsi B
Opsi B dipilih karena CRM end-to-end memiliki karakteristik berikut:

- business logic yang kompleks
- kebutuhan role dan permission yang granular
- workflow approval dan assignment yang dapat berkembang
- integrasi ke banyak sistem eksternal
- kebutuhan audit trail yang kuat
- kebutuhan modularitas dan maintainability jangka panjang

NestJS dipilih sebagai backend karena mendukung arsitektur modular, cocok untuk domain business logic yang kompleks, serta memudahkan pengembangan service terpisah di masa depan.

Next.js dipilih sebagai frontend karena mendukung pengembangan aplikasi web modern dengan performa baik, arsitektur komponen yang kuat, dan mudah dikembangkan untuk dashboard operasional.

PostgreSQL dipilih karena stabil, mendukung relasi data kompleks, transaksi kuat, dan cocok untuk sistem enterprise.

### 7.3 Komponen Tambahan yang Direkomendasikan
- **Redis** untuk cache dan queue
- **Object storage** untuk attachment dokumen
- **Email service** untuk notifikasi
- **Queue worker** untuk proses asynchronous
- **Logging dan monitoring** untuk observability

---

## 8. Fitur Utama

### 8.1 Authentication & Authorization
Sistem harus mendukung:

- login dan logout
- password reset
- session/token management
- role-based access control
- permission per module dan action
- optional SSO/LDAP/OAuth untuk enterprise

#### Role minimum
- Admin
- Sales
- Marketing
- Customer Service
- Supervisor
- Management

---

### 8.2 Lead Management
Sistem harus memungkinkan pengguna untuk:

- membuat lead baru
- mengimpor lead dalam jumlah besar
- menetapkan lead ke owner/sales
- memperbarui status lead
- mencatat source lead
- memberikan priority atau score
- mengubah lead menjadi contact, account, dan opportunity
- melihat histori perubahan lead

#### Field minimum lead
- lead_id
- full_name
- company_name
- email
- phone
- source
- industry
- region
- status
- owner
- score
- notes
- created_at
- updated_at

#### Contoh status lead
- New
- Contacted
- Qualified
- Unqualified
- Converted
- Lost

---

### 8.3 Contact Management
Sistem harus memungkinkan:

- penyimpanan data individu pelanggan
- relasi contact ke account/company
- penyimpanan jabatan, email, nomor telepon
- preferensi komunikasi
- histori interaksi contact

#### Field minimum contact
- contact_id
- full_name
- job_title
- email
- phone
- account_id
- preferred_channel
- owner
- status

---

### 8.4 Account / Company Management
Sistem harus memungkinkan:

- penyimpanan data perusahaan/pelanggan
- relasi satu account ke banyak contact
- klasifikasi account
- penentuan ownership
- segmentasi customer
- pencatatan nilai bisnis dan potensi

#### Field minimum account
- account_id
- company_name
- type
- segment
- industry
- address
- tax_id atau business_identifier
- account_owner
- status
- annual_value_estimate
- notes

---

### 8.5 Opportunity Management
Sistem harus memungkinkan:

- membuat opportunity dari lead atau account
- menentukan pipeline stage
- menentukan estimated value
- menentukan probability
- menentukan expected close date
- mencatat aktivitas terkait opportunity
- menandai outcome menang/kalah dan alasannya

#### Contoh stage opportunity
- Prospecting
- Qualification
- Proposal
- Negotiation
- Closed Won
- Closed Lost

#### Field minimum opportunity
- opportunity_id
- opportunity_name
- account_id
- contact_id
- stage
- estimated_value
- probability
- expected_close_date
- owner
- lost_reason
- won_date
- closed_date

---

### 8.6 Activity Management
Sistem harus mendukung aktivitas seperti:

- call
- email
- meeting
- visit
- follow-up task
- activity custom

#### Data minimum activity
- activity_id
- activity_type
- due_date
- assigned_to
- linked_entity_type
- linked_entity_id
- outcome/result
- reminder
- status
- notes

---

### 8.7 Task & Reminder
Sistem harus mendukung:

- pembuatan task manual
- pembuatan task otomatis dari workflow
- reminder sebelum jatuh tempo
- overdue tracking
- dashboard task per user

#### Contoh status task
- Open
- In Progress
- Completed
- Cancelled
- Overdue

---

### 8.8 Notes & Timeline
Sistem harus memiliki timeline histori yang menampilkan:

- perubahan status
- perpindahan owner
- aktivitas user
- notes internal
- upload dokumen
- komentar internal
- histori interaksi

---

### 8.9 Dashboard & Reporting
Dashboard minimum harus menyediakan:

- total lead
- total qualified lead
- lead conversion rate
- total open opportunity value
- won/lost opportunity value
- activity summary
- overdue follow-up
- sales leaderboard
- pipeline by stage

#### Filter minimum
- date range
- team
- owner
- source
- region
- product/category

---

### 8.10 User Management
Admin harus dapat:

- membuat user
- mengubah role user
- mengaktifkan/menonaktifkan user
- reset password
- mengelola assignment user
- melihat audit aktivitas user

---

### 8.11 Audit Trail
Sistem harus menyimpan audit trail untuk aktivitas penting, meliputi:

- siapa yang melakukan perubahan
- kapan perubahan dilakukan
- data sebelum perubahan
- data setelah perubahan
- modul/entitas yang diubah
- informasi tambahan seperti IP/device bila diperlukan

Audit trail harus tersedia untuk kebutuhan kontrol internal dan penelusuran perubahan data.

---

### 8.12 Import / Export
Sistem harus mendukung:

- import lead/contact/account dari CSV/XLSX
- validasi data sebelum import
- laporan partial failure
- export data berdasarkan filter
- template import standar

---

## 9. Workflow Utama

### 9.1 Lead to Customer Workflow
1. Lead masuk dari form, import, campaign, atau API
2. Lead di-assign ke sales
3. Sales melakukan follow-up
4. Lead dikualifikasi atau ditolak
5. Bila qualified:
   - dibuat Contact
   - dibuat Account
   - dibuat Opportunity
6. Opportunity masuk ke pipeline penjualan
7. Jika deal berhasil, status menjadi Closed Won
8. Jika gagal, status menjadi Closed Lost disertai alasan

### 9.2 Follow-up Workflow
1. User membuat activity atau task
2. Sistem mengirim reminder
3. User mencatat hasil follow-up
4. User menentukan next action
5. Task overdue muncul di dashboard dan monitoring supervisor

### 9.3 Assignment Workflow
1. Lead baru masuk ke sistem
2. Sistem dapat menerapkan assignment rule
3. Jika tidak ada rule, supervisor/admin assign manual
4. Semua perubahan owner dicatat dalam audit trail

---

## 10. Functional Requirements

### 10.1 General
- sistem harus menyediakan login aman
- sistem harus mendukung RBAC
- sistem harus mendukung search global
- sistem harus mendukung filtering, sorting, pagination
- sistem harus mendukung attachment dokumen
- sistem harus mendukung tagging
- sistem harus mendukung komentar internal
- sistem harus menyimpan histori perubahan data penting

### 10.2 Lead Management
- user dapat create, read, update lead sesuai permission
- user dapat convert lead menjadi entitas turunan
- sistem harus mendukung duplicate detection
- sistem harus mendukung merge duplicate lead

### 10.3 Contact & Account
- user dapat melihat relasi account dan contact
- user dapat melihat histori interaksi per contact/account
- user dapat memperbarui data pelanggan sesuai akses

### 10.4 Opportunity
- user dapat membuat dan mengubah opportunity
- user dapat memindahkan opportunity antar stage
- sistem harus mencatat stage history
- sistem harus menghitung weighted pipeline

### 10.5 Activity & Task
- user dapat membuat activity dan task
- sistem harus mendukung reminder
- task overdue harus ditampilkan secara jelas
- supervisor harus dapat melihat task yang belum selesai

### 10.6 Notification
- sistem harus mengirim notifikasi untuk:
  - new assignment
  - task due
  - overdue task
  - mention/comment
  - status change tertentu

### 10.7 Reporting
- dashboard harus dapat difilter
- data dapat diexport
- dashboard harus menyesuaikan role user
- data KPI harus tersedia near-real-time

---

## 11. Plugin Architecture Requirement

### 11.1 Tujuan
Sistem CRM harus dirancang agar mendukung mekanisme plugin untuk memungkinkan penambahan fitur baru tanpa mengubah core system secara signifikan.

Arsitektur plugin ditujukan untuk:
- mempercepat pengembangan fitur tambahan
- mengurangi coupling antara core CRM dan fitur eksternal
- memungkinkan custom module per unit bisnis atau industri
- mendukung integrasi eksternal secara modular
- menjaga maintainability jangka panjang

### 11.2 Prinsip Umum
Arsitektur plugin harus mengikuti prinsip berikut:

- core CRM tetap minimal dan stabil
- fitur tambahan non-core sebaiknya dikembangkan sebagai plugin
- plugin tidak boleh memodifikasi core system secara langsung tanpa extension point resmi
- plugin harus bisa diaktifkan, dinonaktifkan, dan dikelola secara terpusat
- plugin harus mengikuti kontrak dan lifecycle yang ditentukan sistem

### 11.3 Core Module vs Plugin Module
#### Core module minimum
- authentication
- user management
- role & permission
- lead
- contact
- account
- opportunity
- task/activity
- notes/timeline
- audit trail
- notification
- settings
- plugin registry
- event bus

#### Contoh plugin module
- WhatsApp integration plugin
- email sync plugin
- approval workflow plugin
- SLA reminder plugin
- document management plugin
- AI lead scoring plugin
- onboarding workflow plugin
- custom reporting plugin
- industry-specific plugin

### 11.4 Plugin Capability Requirement
Sistem harus mendukung kemampuan plugin berikut:

- registrasi plugin baru
- aktivasi/non-aktivasi plugin
- konfigurasi plugin per environment atau tenant
- versioning plugin
- dependency checking antar plugin
- permission registration oleh plugin
- menu/page/widget registration oleh plugin
- event subscription oleh plugin
- custom route/API registration oleh plugin
- database migration/plugin schema update
- logging dan audit aktivitas plugin

### 11.5 Backend Plugin Requirement
Pada sisi backend, plugin harus dapat:

- didaftarkan sebagai module terpisah di NestJS
- memiliki service dan controller sendiri
- memiliki konfigurasi sendiri
- mendaftarkan event handler sendiri
- menambahkan permission baru
- memiliki migration sendiri bila dibutuhkan
- menggunakan service core melalui interface resmi
- mengakses extension point yang telah didefinisikan

Plugin backend tidak boleh mengakses tabel atau service internal core secara bebas tanpa kontrak resmi.

### 11.6 Frontend Plugin Requirement
Pada sisi frontend, sistem harus mendukung extension UI yang memungkinkan plugin untuk:

- menambahkan menu/sidebar item
- menambahkan halaman/module baru
- menambahkan dashboard widget
- menambahkan tab baru pada halaman detail entity
- menambahkan custom action button
- menambahkan custom field renderer atau section tambahan

Frontend plugin harus mengikuti registry dan slot/extension point yang ditetapkan oleh frontend core.

### 11.7 Event-Driven Extension Requirement
Core CRM harus memiliki event bus internal untuk memungkinkan plugin merespons kejadian penting di sistem.

#### Contoh event minimum
- `lead.created`
- `lead.updated`
- `lead.assigned`
- `lead.converted`
- `contact.created`
- `account.created`
- `opportunity.created`
- `opportunity.stage_changed`
- `task.created`
- `task.completed`
- `task.overdue`
- `user.created`

Plugin harus dapat subscribe ke event-event tersebut tanpa mengubah source code modul inti.

### 11.8 Extension Point Requirement
Sistem harus menyediakan extension point resmi, minimal pada area berikut:

- sebelum entity dibuat
- setelah entity dibuat
- sebelum entity diupdate
- setelah entity diupdate
- setelah status/stage berubah
- saat dashboard dirender
- saat menu aplikasi dibangun
- saat permission dimuat
- saat notifikasi diproses
- saat import/export dijalankan

Extension point ini harus terdokumentasi dan stabil.

### 11.9 Plugin Registry Requirement
Sistem harus memiliki plugin registry untuk mengelola metadata plugin, minimal meliputi:

- plugin_id
- plugin_name
- plugin_key
- version
- status (active/inactive)
- installed_at
- installed_by
- config
- dependency_list
- compatible_core_version

Admin harus dapat melihat daftar plugin yang terpasang dan statusnya.

### 11.10 Plugin Security Requirement
Plugin harus mengikuti standar keamanan sistem, termasuk:

- semua route plugin harus tunduk pada auth dan authorization
- plugin tidak boleh bypass audit trail
- akses data plugin harus dibatasi sesuai permission
- konfigurasi sensitif plugin harus tersimpan aman
- plugin harus tervalidasi sebelum diaktifkan
- plugin harus memiliki mekanisme compatibility check terhadap core version

### 11.11 Plugin Data & Custom Field Requirement
Sistem harus mendukung kebutuhan custom field atau metadata agar plugin dapat memperluas entity inti tanpa harus selalu mengubah schema inti.

Pendekatan yang dapat digunakan:
- custom field table
- JSONB metadata field pada PostgreSQL
- plugin-owned tables yang terhubung ke entity inti

Tujuannya agar kebutuhan khusus per unit bisnis dapat ditambahkan secara fleksibel.

### 11.12 Plugin Lifecycle Requirement
Sistem harus mendukung lifecycle plugin berikut:

1. install  
2. validate  
3. migrate  
4. activate  
5. configure  
6. update  
7. deactivate  
8. uninstall

Setiap transisi lifecycle harus tercatat di audit trail.

### 11.13 Plugin Observability Requirement
Sistem harus dapat memonitor plugin melalui:

- plugin log
- plugin error tracking
- plugin execution status
- plugin version monitoring
- plugin health/status check

Jika plugin gagal, core CRM tetap harus berjalan normal sebisa mungkin tanpa menyebabkan kegagalan total sistem.

### 11.14 Acceptance Criteria — Plugin Architecture
- admin dapat melihat daftar plugin terpasang
- admin dapat mengaktifkan dan menonaktifkan plugin
- plugin dapat mendaftarkan permission baru
- plugin dapat menambahkan menu atau widget baru
- plugin dapat subscribe ke event core
- plugin dapat berjalan tanpa mengubah core module secara langsung
- kegagalan satu plugin tidak menyebabkan seluruh sistem CRM berhenti
- aktivitas penting plugin tercatat di audit trail

---

## 12. Non-Functional Requirements

### 12.1 Performance
- halaman list utama target load < 3 detik untuk beban normal
- search target response < 2 detik untuk skenario umum
- sistem harus mendukung pagination untuk data besar

### 12.2 Security
- password harus di-hash dengan algoritma aman
- authorization harus berbasis role dan permission
- proteksi terhadap SQL injection, XSS, CSRF, dan brute force
- endpoint sensitif harus dilengkapi rate limiting
- audit log harus terlindungi dari perubahan sembarangan
- field sensitif tertentu harus dapat dimasking bila diperlukan

### 12.3 Reliability
- backup database harian
- sistem harus memiliki error handling yang jelas
- target availability minimal 99.5% untuk penggunaan internal

### 12.4 Scalability
- backend harus modular dan dapat dikembangkan secara horizontal
- attachment sebaiknya disimpan di object storage
- cache dapat digunakan untuk mempercepat akses data tertentu

### 12.5 Maintainability
- backend harus dibangun secara modular
- API harus memiliki versioning
- logging, monitoring, dan observability harus tersedia
- unit test dan integration test minimal tersedia untuk modul kritikal

---

## 13. Integrasi

Integrasi yang direncanakan atau opsional:

- email service
- WhatsApp API
- LDAP / SSO / OAuth
- core system / ERP
- ticketing/helpdesk
- marketing campaign tools
- BI tools

---

## 14. Struktur Modul Sistem

Modul utama yang direkomendasikan:

- Authentication Module
- User & Role Management Module
- Lead Module
- Contact Module
- Account Module
- Opportunity Module
- Activity Module
- Task Module
- Notes & Timeline Module
- Notification Module
- Reporting Dashboard Module
- Audit Trail Module
- Import Export Module
- Master Data Module
- Integration Module
- Plugin Registry Module
- Event Bus Module

---

## 15. Data Model Tingkat Tinggi

Entitas utama dalam sistem:

- User
- Role
- Permission
- Lead
- Contact
- Account
- Opportunity
- Activity
- Task
- Note
- Attachment
- Tag
- CampaignSource
- PipelineStage
- AuditLog
- Notification
- Plugin
- PluginSetting
- PluginPermission
- PluginEventLog

### Relasi utama
- satu Account memiliki banyak Contact
- satu Account memiliki banyak Opportunity
- satu Lead dapat dikonversi menjadi Contact, Account, dan Opportunity
- Activity dan Task dapat terkait ke Lead, Contact, Account, atau Opportunity
- User menjadi owner untuk banyak entitas
- AuditLog merekam perubahan di seluruh entitas penting
- Plugin memiliki konfigurasi, versi, dan status aktivasi

---

## 16. Acceptance Criteria

### 16.1 Lead Management
- user dapat membuat lead baru
- lead dapat di-assign ke owner
- lead dapat di-convert menjadi opportunity
- histori perubahan status lead tampil di timeline

### 16.2 Opportunity
- user dapat mengubah stage opportunity
- dashboard pipeline ikut berubah setelah update stage
- Closed Won dan Closed Lost harus menyimpan timestamp dan owner

### 16.3 Task
- task yang overdue tampil di dashboard user
- reminder terkirim sesuai rule yang dikonfigurasi

### 16.4 Security
- user tanpa permission tidak dapat mengakses modul terbatas
- seluruh perubahan penting tercatat di audit trail

### 16.5 Plugin Architecture
- plugin registry tersedia dan dapat diakses admin
- plugin memiliki status active/inactive
- plugin dapat menambahkan extension tanpa memodifikasi core system
- plugin dapat mengikuti auth, permission, audit, dan observability standar sistem

---

## 17. KPI Keberhasilan Produk

Indikator keberhasilan minimum:

- lead follow-up compliance rate
- average response time ke lead baru
- lead to opportunity conversion rate
- opportunity win rate
- overdue task rate
- active user adoption rate
- data completeness score
- jumlah plugin aktif yang berjalan stabil
- rata-rata waktu implementasi fitur baru melalui plugin

---

## 18. Prioritas MVP

### 18.1 Must Have
- authentication
- role-based access control
- lead management
- contact management
- account management
- opportunity management
- activity dan task management
- dashboard dasar
- audit trail
- import/export
- search dan filter
- event bus dasar
- plugin registry dasar

### 18.2 Should Have
- assignment rules
- duplicate detection
- email notification
- comments dan mentions
- backend plugin loader
- frontend widget extension point

### 18.3 Could Have
- AI lead scoring
- WhatsApp integration
- SLA automation
- advanced forecasting
- plugin marketplace/internal catalog

---

## 19. Rekomendasi Arsitektur Implementasi

### 19.1 Frontend — Next.js
Frontend dibangun menggunakan Next.js untuk:

- dashboard modern dan responsif
- routing yang terstruktur
- manajemen halaman internal user
- integrasi mudah dengan API backend
- pengembangan komponen UI reusable

#### Modul frontend yang direkomendasikan
- login dan auth pages
- dashboard
- lead pages
- contact pages
- account pages
- opportunity pages
- task/activity pages
- reporting pages
- admin pages
- settings pages
- plugin extension slots

---

### 19.2 Backend — NestJS
Backend dibangun menggunakan NestJS dengan pendekatan modular.

#### Modul backend yang direkomendasikan
- auth module
- users module
- roles/permissions module
- leads module
- contacts module
- accounts module
- opportunities module
- activities module
- tasks module
- notifications module
- audit logs module
- import/export module
- dashboard/reporting module
- integrations module
- plugins module
- events module

#### Prinsip implementasi
- REST API sebagai baseline
- DTO validation untuk semua request
- guard/interceptor/filter untuk security dan consistency
- service-layer untuk business logic
- repository/data access layer untuk persistence
- queue untuk async processing
- audit middleware/interceptor untuk logging aktivitas
- plugin contract dan extension point terdokumentasi

---

### 19.3 Database — PostgreSQL
PostgreSQL digunakan sebagai database utama karena:

- mendukung relasi kompleks antar entitas CRM
- kuat untuk transaksi
- cocok untuk query reporting operasional
- stabil untuk kebutuhan enterprise/internal application

#### Area yang perlu diperhatikan
- indexing pada field pencarian dan filter
- strategi soft delete bila dibutuhkan
- struktur audit log terpisah
- optimasi query dashboard dan reporting
- migrasi database yang terkontrol
- dukungan metadata/custom field untuk extensibility plugin

---

## 20. Risiko dan Mitigasi

### 20.1 Risiko
- kebutuhan bisnis berkembang terlalu cepat
- scope membesar sebelum MVP selesai
- data duplikasi dari proses import
- permission matrix menjadi terlalu kompleks
- reporting berat mempengaruhi performa transaksi
- plugin incompatibility antar versi
- plugin gagal dan mengganggu stabilitas sistem

### 20.2 Mitigasi
- tetapkan fase implementasi dengan jelas
- prioritaskan MVP berdasarkan must-have
- gunakan duplicate detection dan validation rule
- desain RBAC sejak awal
- pisahkan query reporting berat bila diperlukan
- siapkan audit trail dari fase awal
- buat plugin contract dan compatibility matrix
- isolasi kegagalan plugin dan siapkan fallback behavior

---

## 21. Kesimpulan

Aplikasi CRM end-to-end ini dirancang untuk menjadi platform terpusat dalam mengelola hubungan pelanggan, pipeline penjualan, aktivitas operasional, dan pelaporan manajerial.

Pemilihan **Next.js + NestJS + PostgreSQL** adalah pilihan yang tepat untuk kebutuhan CRM yang:

- modular
- scalable
- maintainable
- memiliki business logic kompleks
- membutuhkan role dan permission granular
- siap untuk integrasi dan pengembangan jangka panjang

Dengan tambahan **Plugin Architecture Requirement**, sistem CRM tidak hanya siap untuk kebutuhan inti saat ini, tetapi juga siap berkembang secara terstruktur untuk fitur tambahan, integrasi, dan kebutuhan khusus per unit bisnis di masa depan.
