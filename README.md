# ✨ AstroMatch

Analyse de compatibilité amoureuse par IA, astrologie et psychologie relationnelle.

## 🚀 Fonctionnalités

- **Test gratuit** : Analyse rapide de compatibilité en 30 secondes
- **Score de compatibilité** : Score sur 100 avec résumé détaillé
- **Rapport PDF complet** : Forces, faiblesses, conseils personnalisés
- **Paiement Stripe** : Checkout sécurisé à 4,90€
- **Email automatique** : Rapport PDF envoyé par email après paiement

## 📦 Stack technique

- **Framework** : Next.js 14 (App Router)
- **Langage** : TypeScript
- **Styles** : Tailwind CSS
- **IA** : OpenAI GPT-4.1-mini
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
```

4. Lancez le serveur de développement :
```bash
npm run dev
```

5. Ouvrez [http://localhost:3000](http://localhost:3000)

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
3. Déployez !

**Important** : N'oubliez pas de mettre à jour l'URL du webhook Stripe avec votre domaine de production.

## 📁 Structure du projet

```
src/
├── app/
│   ├── api/
│   │   ├── analyze/          # API analyse IA
│   │   ├── create-checkout/  # API création session Stripe
│   │   └── stripe-webhook/   # Webhook Stripe
│   ├── landing/
│   │   └── page.tsx          # Landing page marketing
│   ├── globals.css           # Styles globaux
│   ├── layout.tsx            # Layout principal
│   └── page.tsx              # Page outil (test)
├── components/
│   └── LoadingDots.tsx       # Composant loader
└── lib/
    ├── email.ts              # Service d'envoi email
    ├── openai.ts             # Client OpenAI
    ├── pdf.ts                # Génération PDF
    └── stripe.ts             # Client Stripe
```

## 🎨 Design

- **Thème** : Bleu nuit (#050818) + Or (#fcd34d)
- **Style** : Mystique moderne, élégant
- **Responsive** : Mobile-first

## ⚠️ Avertissement

AstroMatch est un projet expérimental à but ludique et de réflexion. Il ne remplace pas un avis professionnel en psychologie ou en conseil conjugal.

## 📄 Licence

Projet privé - Tous droits réservés
