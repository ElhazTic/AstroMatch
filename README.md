# ✨ AstroMatch

Analyse de compatibilité amoureuse par IA, astrologie et psychologie relationnelle.

## 🚀 Fonctionnalités

- **Test gratuit** : Analyse rapide de compatibilité en 30 secondes
- **Score de compatibilité** : Score sur 100 avec résumé détaillé
- **Rapport PDF complet** : Forces, faiblesses, conseils personnalisés
- **Paiement Stripe** : Checkout sécurisé à 4,90€
- **Email automatique** : Rapport PDF envoyé par email après paiement
- **Dashboard Admin** : Suivi en temps réel du trafic et des conversions
- **Analyse IA** : Insights automatiques sur les performances

## 📦 Stack technique

- **Framework** : Next.js 14 (App Router)
- **Langage** : TypeScript
- **Database** : PostgreSQL + Prisma 6.2.1
- **Styles** : Tailwind CSS
- **IA** : OpenAI GPT-4o-mini
- **Paiement** : Stripe Checkout
- **PDF** : pdf-lib
- **Email** : Resend

## ⚙️ Installation

1. Clonez le repository :
```bash
git clone <repo-url>
cd AstroMatch
```

2. Installez les dépendances :
```bash
npm install
```

3. Créez un fichier `.env.local` à la racine avec ces variables :
```env
# PostgreSQL Database
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE"

# OpenAI
OPENAI_API_KEY=sk-...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_PRICE_ID=price_...

# Resend (Email)
RESEND_API_KEY=re_...
EMAIL_FROM="AstroMatch <no-reply@votre-domaine.com>"

# Telegram Bot (optionnel)
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...

# Cron Secret (optionnel)
CRON_SECRET=your-random-secret
```

4. Appliquez les migrations Prisma :
```bash
npx prisma migrate dev --name init
```

5. Lancez le serveur de développement :
```bash
npm run dev
```

6. Ouvrez [http://localhost:3000](http://localhost:3000)

## 🗄️ Base de données PostgreSQL

### Tables Prisma

Le projet utilise 4 tables principales :

- **Event** : Tous les événements de tracking (visites, formulaires, checkouts, paiements)
- **Payment** : Enregistrement des paiements Stripe
- **MetricsCache** : Cache des métriques calculées (TTL 30s)
- **UserSession** : Sessions utilisateur pour le tracking

### Migrations

```bash
# Créer une nouvelle migration
npx prisma migrate dev --name nom_migration

# Appliquer les migrations en production
npx prisma migrate deploy

# Visualiser la base de données
npx prisma studio
```

## 🔧 Configuration Stripe

### Créer un produit et un prix

1. Allez sur [Stripe Dashboard](https://dashboard.stripe.com/products)
2. Créez un nouveau produit "Rapport AstroMatch"
3. Ajoutez un prix unique de 4,90€
4. Copiez l'ID du prix (`price_...`) dans `STRIPE_PRICE_ID`

### Configurer le webhook

1. Allez sur [Stripe Webhooks](https://dashboard.stripe.com/webhooks)
2. Créez un nouvel endpoint :
   - URL : `https://votre-domaine.com/api/stripe-webhook`
   - Événements : `checkout.session.completed`
3. Copiez le secret de signature (`whsec_...`) dans `STRIPE_WEBHOOK_SECRET`

### Test en local avec Stripe CLI

```bash
# Installer Stripe CLI puis :
stripe listen --forward-to localhost:3000/api/stripe-webhook
```

## 📧 Configuration Resend

1. Créez un compte sur [Resend](https://resend.com)
2. Générez une API key
3. Vérifiez votre domaine d'envoi (ou utilisez le domaine de test)
4. Ajoutez les variables dans `.env.local`

## 🌐 Déploiement sur Vercel

1. Connectez votre repository à Vercel
2. Ajoutez toutes les variables d'environnement dans les settings
3. **Important** : Configurez `DATABASE_URL` avec votre connexion PostgreSQL
4. Déployez !

**Important** : N'oubliez pas de mettre à jour l'URL du webhook Stripe avec votre domaine de production.

## 📁 Structure du projet

```
src/
├── app/
│   ├── admin/
│   │   ├── dashboard/        # Dashboard admin temps réel
│   │   ├── logs/             # Journal des événements
│   │   └── sessions/         # Détails sessions utilisateur
│   ├── api/
│   │   ├── ai/performance/   # Analyse IA des performances
│   │   ├── analyze/          # API analyse compatibilité
│   │   ├── create-checkout/  # API création session Stripe
│   │   ├── events/           # API liste des événements
│   │   ├── log/              # API logging
│   │   ├── log-stream/       # SSE temps réel
│   │   ├── metrics/          # API métriques (avec cache)
│   │   ├── performance/      # API analyse IA
│   │   └── stripe-webhook/   # Webhook Stripe
│   ├── landing/
│   │   └── page.tsx          # Landing page marketing
│   ├── performance/
│   │   └── page.tsx          # Page analyse IA
│   ├── globals.css           # Styles globaux
│   ├── layout.tsx            # Layout principal
│   └── page.tsx              # Page outil (test)
├── components/
│   ├── analytics/            # Composants analytics (Heatmap)
│   ├── dashboard/            # Composants dashboard
│   └── ...
├── lib/
│   ├── prisma.ts             # Client Prisma singleton
│   ├── logger.ts             # Service logging PostgreSQL
│   ├── iaAnalysis.ts         # Cache analyse IA
│   ├── email.ts              # Service d'envoi email
│   ├── openai.ts             # Client OpenAI
│   ├── pdf.ts                # Génération PDF
│   └── stripe.ts             # Client Stripe
└── prisma/
    └── schema.prisma         # Schéma base de données
```

## 🎨 Design

- **Thème** : Bleu nuit (#050818) + Or (#fcd34d)
- **Style** : Mystique moderne, élégant
- **Responsive** : Mobile-first

## 📊 Dashboard Admin

Accessible via `/admin/dashboard` :

- **KPIs temps réel** : Visites, formulaires, paiements, conversion, revenu
- **Graphiques** : Trafic 24h, revenu cumulé
- **Heatmap** : Activité par heure (7 jours)
- **Marketing** : Performance des campagnes UTM
- **Live Feed** : Flux d'événements en temps réel (SSE)

## 🧠 Analyse IA

Accessible via `/performance` :

- **Résumé automatique** : Analyse globale des performances
- **Analyse du funnel** : Points de friction détectés
- **Heures chaudes** : Meilleurs moments pour publier
- **Insights UTM** : Performance des campagnes
- **Recommandations** : Actions concrètes à mettre en place
- **Projections ROI** : Calcul basé sur budget TikTok

## ⚠️ Avertissement

AstroMatch est un projet expérimental à but ludique et de réflexion. Il ne remplace pas un avis professionnel en psychologie ou en conseil conjugal.

## 📄 Licence

Projet privé - Tous droits réservés
