---
name: advanced-uiux-generator
description: Intelligent UI/UX generation system that autonomously creates premium, modern interfaces from simple prompts. Use when user requests ANY interface, website, app, dashboard, or landing page. System automatically analyzes the request, selects optimal color palettes, layouts, animations, and premium effects without requiring detailed specifications. Generates production-ready code with sophisticated gradients, glassmorphism, smooth animations, and perfect spacing. Avoids neon/high-contrast colors, choosing elegant, muted palettes instead. Works from minimal input like "create a landing page for X" - no detailed requirements needed.
---

# Intelligent Premium UI/UX Generator

## CORE PHILOSOPHY

You are an AUTONOMOUS design system. When given a simple prompt like "create a landing page for my AI agent", you must:

1. **Analyze the project** (5 seconds thinking)
2. **Select design system** (colors, layout, style) 
3. **Generate complete, production-ready code** with ALL premium features
4. **Never ask for clarification** - make intelligent decisions

Every output must look like it cost $10,000 to design.

## DECISION-MAKING SYSTEM

### Step 1: Instant Project Analysis (Think for 5 seconds)

From the user's prompt, extract:

**Project Type Detection**:
- SaaS product → Clean, professional, trust-building
- Creative portfolio → Bold, artistic, expressive
- E-commerce → Commercial, product-focused, conversion-optimized
- Corporate → Traditional, authoritative, stable
- Startup → Modern, innovative, energetic
- Personal brand → Unique, personality-driven
- Mobile app → Native feel, touch-optimized
- Dashboard → Data-focused, functional
- Landing page → Conversion-focused, punchy

**Platform Detection** (auto-detect from context):
- Web app → React, Next.js, Vue, or Svelte
- Mobile app → Flutter or React Native
- Static site → HTML/CSS/JS or Next.js
- Full-stack → Next.js or SvelteKit
- No framework mentioned → Choose best fit based on project type

**Tech Stack Auto-Selection**:
- Modern web app → Next.js 14 + TypeScript + Tailwind
- Landing page → React + TypeScript + Tailwind (single page)
- Mobile app → Flutter (cross-platform) or React Native
- Dashboard → React + TypeScript + Recharts
- Portfolio → Next.js + Framer Motion
- E-commerce → Next.js + TypeScript

**Mood Detection** (from keywords):
- "AI", "tech", "automation" → Futuristic, sleek
- "creative", "design", "art" → Expressive, bold
- "finance", "legal", "medical" → Professional, trustworthy
- "fun", "game", "social" → Playful, energetic
- "luxury", "premium", "exclusive" → Elegant, sophisticated

## FRAMEWORK IMPLEMENTATIONS

### NEXT.JS 14 + TYPESCRIPT + TAILWIND (Web App/Landing)

**Project Structure**:
```
app/
├── layout.tsx
├── page.tsx
├── components/
│   ├── Hero.tsx
│   ├── Features.tsx
│   ├── CTA.tsx
│   └── Navigation.tsx
├── lib/
│   └── utils.ts
└── styles/
    └── globals.css

tailwind.config.ts
tsconfig.json
package.json
```

**Complete Implementation**:

`tailwind.config.ts`:
```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
          950: '#0a0a0a',
        },
        accent: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.6s ease-out forwards',
        'gradient-shift': 'gradientShift 8s ease infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
      },
    },
  },
  plugins: [],
}
export default config
```

`app/layout.tsx`:
```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: '[Project Name]',
  description: '[Project Description]',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased">{children}</body>
    </html>
  )
}
```

`app/page.tsx`:
```typescript
import Hero from './components/Hero'
import Features from './components/Features'
import Stats from './components/Stats'
import CTA from './components/CTA'
import Footer from './components/Footer'
import Navigation from './components/Navigation'

export default function Home() {
  return (
    <main className="min-h-screen bg-primary-50">
      <Navigation />
      <Hero />
      <Stats />
      <Features />
      <CTA />
      <Footer />
    </main>
  )
}
```

`app/components/Navigation.tsx`:
```typescript
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/80 backdrop-blur-xl border-b border-primary-200 shadow-sm'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-8">
        <div className="flex justify-between items-center h-20">
          <Link href="/" className="text-xl font-bold text-primary-900">
            Brand
          </Link>
          
          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-primary-600 hover:text-primary-900 transition-colors">
              Features
            </Link>
            <Link href="#how" className="text-primary-600 hover:text-primary-900 transition-colors">
              How It Works
            </Link>
            <Link href="#pricing" className="text-primary-600 hover:text-primary-900 transition-colors">
              Pricing
            </Link>
            <button className="px-6 py-2.5 bg-gradient-to-r from-accent-600 to-accent-500 text-white rounded-lg font-semibold hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200">
              Get Started
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
```

`app/components/Hero.tsx`:
```typescript
'use client'

import { useEffect, useRef } from 'react'

export default function Hero() {
  const heroRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-fade-in-up')
          }
        })
      },
      { threshold: 0.1 }
    )

    const elements = heroRef.current?.querySelectorAll('.reveal')
    elements?.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [])

  return (
    <section
      ref={heroRef}
      className="relative min-h-screen flex items-center justify-center pt-20 px-8 overflow-hidden"
    >
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent-50 via-primary-50 to-primary-100 opacity-50" />
      
      {/* Mesh Gradient */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-96 h-96 bg-accent-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-accent-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float" style={{ animationDelay: '4s' }} />
      </div>

      <div className="relative max-w-5xl mx-auto text-center">
        {/* Badge */}
        <div className="reveal inline-flex items-center gap-2 px-4 py-1.5 bg-white/80 backdrop-blur-sm border border-primary-200 rounded-full text-sm font-medium text-primary-700 mb-8">
          <span className="w-2 h-2 bg-accent-500 rounded-full animate-pulse" />
          Completely Free Forever
        </div>

        {/* Main Heading with Gradient */}
        <h1 className="reveal text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight mb-8">
          <span className="bg-gradient-to-r from-primary-900 via-accent-600 to-accent-500 bg-clip-text text-transparent animate-gradient-shift bg-[length:200%_auto]">
            Your Autonomous AI Agent
          </span>
          <br />
          <span className="text-primary-900">for Every Messaging App</span>
        </h1>

        {/* Description */}
        <p className="reveal text-xl md:text-2xl text-primary-600 max-w-3xl mx-auto mb-12 leading-relaxed">
          Automate tasks, schedule workflows, debug code, and write content across Telegram, WhatsApp, Discord, and more. No setup fees. No subscriptions.
        </p>

        {/* CTA Buttons */}
        <div className="reveal flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <button className="px-8 py-4 bg-gradient-to-r from-accent-600 to-accent-500 text-white text-lg font-semibold rounded-xl hover:-translate-y-1 hover:shadow-2xl transition-all duration-300">
            Start Automating Now
          </button>
          <button className="px-8 py-4 bg-white text-primary-900 text-lg font-semibold rounded-xl border-2 border-primary-200 hover:border-primary-400 hover:bg-primary-50 transition-all duration-300">
            View Documentation
          </button>
        </div>

        {/* Hero Visual */}
        <div className="reveal">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-accent-400 to-accent-600 rounded-2xl blur-3xl opacity-20" />
            <div className="relative bg-white/70 backdrop-blur-xl border border-white/30 rounded-2xl shadow-2xl p-8">
              {/* Add screenshot, demo, or illustration here */}
              <div className="aspect-video bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
```

`app/components/Features.tsx`:
```typescript
'use client'

import { useEffect, useRef } from 'react'

const features = [
  {
    icon: '⚡',
    title: 'Task Automation',
    description: 'Execute complex workflows automatically across all your messaging platforms with intelligent scheduling.',
  },
  {
    icon: '🔄',
    title: 'Smart Scheduling',
    description: 'Set up recurring tasks, time-based triggers, and conditional workflows that run exactly when you need them.',
  },
  {
    icon: '🐛',
    title: 'Auto Debug',
    description: 'Automatically detect, analyze, and fix code issues in real-time with intelligent error handling.',
  },
  {
    icon: '✍️',
    title: 'Content Generation',
    description: 'Create high-quality written content automatically using advanced AI language models.',
  },
  {
    icon: '🔗',
    title: 'Multi-Platform',
    description: 'Works seamlessly with Telegram, WhatsApp, Discord, Slack, and 10+ other messaging platforms.',
  },
  {
    icon: '🔒',
    title: 'Secure & Private',
    description: 'End-to-end encryption and zero data retention ensure your conversations stay completely private.',
  },
]

export default function Features() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-fade-in-up')
          }
        })
      },
      { threshold: 0.1 }
    )

    const elements = sectionRef.current?.querySelectorAll('.reveal')
    elements?.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [])

  return (
    <section ref={sectionRef} id="features" className="py-32 px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <div className="reveal inline-block text-sm font-semibold text-accent-600 uppercase tracking-wider mb-4">
            CAPABILITIES
          </div>
          <h2 className="reveal text-5xl md:text-6xl font-bold text-primary-900 mb-6">
            Everything You Need to Automate
          </h2>
          <p className="reveal text-xl text-primary-600 max-w-2xl mx-auto">
            Powerful automation features designed for developers and teams who want to streamline their workflow.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="reveal group relative bg-gradient-to-br from-primary-50 to-white p-8 rounded-2xl border border-primary-200 hover:border-accent-300 hover:-translate-y-2 transition-all duration-300 cursor-pointer"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Gradient Border Effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent-500 to-accent-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur-xl" />
              
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-2xl font-semibold text-primary-900 mb-3">
                {feature.title}
              </h3>
              <p className="text-primary-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

`app/components/Stats.tsx`:
```typescript
'use client'

import { useEffect, useRef, useState } from 'react'

const stats = [
  { value: '24/7', label: 'Always Active' },
  { value: '10+', label: 'Platforms Supported' },
  { value: '100%', label: 'Free to Use' },
]

export default function Stats() {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.3 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <section ref={sectionRef} className="py-20 px-8 bg-primary-50">
      <div className="max-w-5xl mx-auto">
        <div className="grid md:grid-cols-3 gap-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className={`text-center p-8 bg-white rounded-2xl border border-primary-200 transition-all duration-500 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: `${index * 150}ms` }}
            >
              <div className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-accent-600 to-accent-500 bg-clip-text text-transparent mb-3">
                {stat.value}
              </div>
              <div className="text-lg font-medium text-primary-600">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

`app/components/CTA.tsx`:
```typescript
export default function CTA() {
  return (
    <section className="py-32 px-8 bg-gradient-to-br from-primary-900 to-primary-950 text-white">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white via-accent-200 to-white bg-clip-text text-transparent animate-gradient-shift bg-[length:200%_auto]">
          Ready to Automate Everything?
        </h2>
        <p className="text-xl text-primary-300 mb-10">
          Start using AI Agent today with zero setup costs and no credit card required.
        </p>
        <button className="px-10 py-4 bg-white text-primary-900 text-lg font-semibold rounded-xl hover:-translate-y-1 hover:shadow-2xl transition-all duration-300">
          Get Started Free
        </button>
      </div>
    </section>
  )
}
```

`app/components/Footer.tsx`:
```typescript
import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-white border-t border-primary-200 py-16 px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          <div>
            <div className="text-xl font-bold text-primary-900 mb-4">Brand</div>
            <p className="text-primary-600">
              Autonomous automation for modern messaging platforms.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold text-primary-900 mb-4">Product</h4>
            <div className="flex flex-col gap-3">
              <Link href="#" className="text-primary-600 hover:text-primary-900 transition-colors">
                Features
              </Link>
              <Link href="#" className="text-primary-600 hover:text-primary-900 transition-colors">
                Pricing
              </Link>
              <Link href="#" className="text-primary-600 hover:text-primary-900 transition-colors">
                Documentation
              </Link>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold text-primary-900 mb-4">Company</h4>
            <div className="flex flex-col gap-3">
              <Link href="#" className="text-primary-600 hover:text-primary-900 transition-colors">
                About
              </Link>
              <Link href="#" className="text-primary-600 hover:text-primary-900 transition-colors">
                Blog
              </Link>
              <Link href="#" className="text-primary-600 hover:text-primary-900 transition-colors">
                Contact
              </Link>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold text-primary-900 mb-4">Legal</h4>
            <div className="flex flex-col gap-3">
              <Link href="#" className="text-primary-600 hover:text-primary-900 transition-colors">
                Privacy
              </Link>
              <Link href="#" className="text-primary-600 hover:text-primary-900 transition-colors">
                Terms
              </Link>
            </div>
          </div>
        </div>
        
        <div className="pt-8 border-t border-primary-200 text-center text-primary-600">
          <p>&copy; 2024 Brand. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
```

`app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer utilities {
  .animate-gradient-shift {
    background-size: 200% auto;
    animation: gradientShift 8s ease infinite;
  }
}

html {
  scroll-behavior: smooth;
}

.reveal {
  opacity: 0;
}

.reveal.animate-fade-in-up {
  animation: fadeInUp 0.6s ease-out forwards;
}
```

`package.json`:
```json
{
  "name": "premium-landing",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "14.1.0",
    "react": "^18",
    "react-dom": "^18"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "autoprefixer": "^10.0.1",
    "postcss": "^8",
    "tailwindcss": "^3.3.0",
    "typescript": "^5"
  }
}
```

### FLUTTER (Mobile App - iOS/Android)

**Project Structure**:
```
lib/
├── main.dart
├── screens/
│   ├── home_screen.dart
│   ├── features_screen.dart
│   └── profile_screen.dart
├── widgets/
│   ├── custom_button.dart
│   ├── feature_card.dart
│   └── gradient_background.dart
├── theme/
│   └── app_theme.dart
└── utils/
    └── constants.dart

pubspec.yaml
```

**Complete Implementation**:

`pubspec.yaml`:
```yaml
name: premium_app
description: A premium Flutter application
publish_to: 'none'
version: 1.0.0+1

environment:
  sdk: '>=3.0.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
  cupertino_icons: ^1.0.2
  google_fonts: ^6.1.0
  flutter_animate: ^4.3.0
  glassmorphism: ^3.0.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0

flutter:
  uses-material-design: true
```

`lib/main.dart`:
```dart
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'screens/home_screen.dart';
import 'theme/app_theme.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
    ),
  );
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Premium App',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      home: const HomeScreen(),
    );
  }
}
```

`lib/theme/app_theme.dart`:
```dart
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  // Colors
  static const Color primaryColor = Color(0xFF0A0A0A);
  static const Color accentColor = Color(0xFF3B82F6);
  static const Color backgroundColor = Color(0xFFFAFAFA);
  static const Color surfaceColor = Color(0xFFFFFFFF);
  static const Color textPrimary = Color(0xFF0A0A0A);
  static const Color textSecondary = Color(0xFF737373);

  // Gradients
  static const LinearGradient primaryGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF3B82F6), Color(0xFF2563EB)],
  );

  static const LinearGradient backgroundGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFFFAFAFA), Color(0xFFF5F5F5)],
  );

  // Text Styles
  static TextTheme textTheme = TextTheme(
    displayLarge: GoogleFonts.inter(
      fontSize: 56,
      fontWeight: FontWeight.w800,
      letterSpacing: -1.5,
      height: 1.1,
      color: textPrimary,
    ),
    displayMedium: GoogleFonts.inter(
      fontSize: 48,
      fontWeight: FontWeight.w700,
      letterSpacing: -1.0,
      height: 1.2,
      color: textPrimary,
    ),
    headlineMedium: GoogleFonts.inter(
      fontSize: 32,
      fontWeight: FontWeight.w600,
      letterSpacing: -0.5,
      height: 1.3,
      color: textPrimary,
    ),
    titleLarge: GoogleFonts.inter(
      fontSize: 24,
      fontWeight: FontWeight.w600,
      height: 1.3,
      color: textPrimary,
    ),
    bodyLarge: GoogleFonts.inter(
      fontSize: 18,
      fontWeight: FontWeight.w400,
      height: 1.6,
      color: textSecondary,
    ),
    bodyMedium: GoogleFonts.inter(
      fontSize: 16,
      fontWeight: FontWeight.w400,
      height: 1.5,
      color: textSecondary,
    ),
  );

  // Theme Data
  static ThemeData lightTheme = ThemeData(
    useMaterial3: true,
    colorScheme: const ColorScheme.light(
      primary: primaryColor,
      secondary: accentColor,
      background: backgroundColor,
      surface: surfaceColor,
    ),
    scaffoldBackgroundColor: backgroundColor,
    textTheme: textTheme,
    
    // AppBar Theme
    appBarTheme: AppBarTheme(
      elevation: 0,
      backgroundColor: Colors.transparent,
      foregroundColor: textPrimary,
      titleTextStyle: GoogleFonts.inter(
        fontSize: 20,
        fontWeight: FontWeight.w700,
        color: textPrimary,
      ),
    ),
    
    // Card Theme
    cardTheme: CardTheme(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(
          color: Color(0xFFE5E5E5),
          width: 1,
        ),
      ),
      color: surfaceColor,
    ),
    
    // Button Theme
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        elevation: 0,
        padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        textStyle: GoogleFonts.inter(
          fontSize: 16,
          fontWeight: FontWeight.w600,
        ),
      ),
    ),
  );
}
```

`lib/screens/home_screen.dart`:
```dart
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../widgets/custom_button.dart';
import '../widgets/feature_card.dart';
import '../widgets/gradient_background.dart';
import '../theme/app_theme.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final ScrollController _scrollController = ScrollController();
  bool _isScrolled = false;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(() {
      if (_scrollController.offset > 10 && !_isScrolled) {
        setState(() => _isScrolled = true);
      } else if (_scrollController.offset <= 10 && _isScrolled) {
        setState(() => _isScrolled = false);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: _isScrolled 
            ? Colors.white.withOpacity(0.8)
            : Colors.transparent,
        title: const Text('Brand'),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: CustomButton(
              text: 'Get Started',
              onPressed: () {},
              isSmall: true,
            ),
          ),
        ],
      ),
      body: GradientBackground(
        child: SingleChildScrollView(
          controller: _scrollController,
          child: Column(
            children: [
              _buildHeroSection(),
              _buildStatsSection(),
              _buildFeaturesSection(),
              _buildCTASection(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeroSection() {
    return Container(
      padding: const EdgeInsets.fromLTRB(24, 120, 24, 80),
      child: Column(
        children: [
          // Badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.8),
              borderRadius: BorderRadius.circular(100),
              border: Border.all(
                color: AppTheme.textSecondary.withOpacity(0.2),
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(
                    color: AppTheme.accentColor,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  'Completely Free Forever',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    fontWeight: FontWeight.w600,
                    color: AppTheme.textPrimary,
                  ),
                ),
              ],
            ),
          )
              .animate()
              .fadeIn(duration: 600.ms)
              .slideY(begin: 0.3, end: 0),
          
          const SizedBox(height: 32),
          
          // Main Heading with Gradient
          ShaderMask(
            shaderCallback: (bounds) => AppTheme.primaryGradient.createShader(
              Rect.fromLTWH(0, 0, bounds.width, bounds.height),
            ),
            child: Text(
              'Your Autonomous\nAI Agent',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.displayLarge?.copyWith(
                color: Colors.white,
              ),
            ),
          )
              .animate()
              .fadeIn(duration: 600.ms, delay: 200.ms)
              .slideY(begin: 0.3, end: 0),
          
          const SizedBox(height: 16),
          
          Text(
            'for Every Messaging App',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.displayMedium,
          )
              .animate()
              .fadeIn(duration: 600.ms, delay: 400.ms)
              .slideY(begin: 0.3, end: 0),
          
          const SizedBox(height: 24),
          
          // Description
          Text(
            'Automate tasks, schedule workflows, debug code, and write content across Telegram, WhatsApp, Discord, and more. No setup fees. No subscriptions.',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyLarge,
          )
              .animate()
              .fadeIn(duration: 600.ms, delay: 600.ms)
              .slideY(begin: 0.3, end: 0),
          
          const SizedBox(height: 40),
          
          // CTA Buttons
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CustomButton(
                text: 'Get Started',
                onPressed: () {},
              ),
              const SizedBox(width: 16),
              CustomButton(
                text: 'Learn More',
                onPressed: () {},
                isOutlined: true,
              ),
            ],
          )
              .animate()
              .fadeIn(duration: 600.ms, delay: 800.ms)
              .slideY(begin: 0.3, end: 0),
        ],
      ),
    );
  }

  Widget _buildStatsSection() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 48),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _buildStatItem('24/7', 'Always Active', 0),
          _buildStatItem('10+', 'Platforms', 1),
          _buildStatItem('100%', 'Free', 2),
        ],
      ),
    );
  }

  Widget _buildStatItem(String value, String label, int index) {
    return Column(
      children: [
        ShaderMask(
          shaderCallback: (bounds) => AppTheme.primaryGradient.createShader(
            Rect.fromLTWH(0, 0, bounds.width, bounds.height),
          ),
          child: Text(
            value,
            style: Theme.of(context).textTheme.displayMedium?.copyWith(
              color: Colors.white,
            ),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          label,
          style: Theme.of(context).textTheme.bodyMedium,
        ),
      ],
    )
        .animate()
        .fadeIn(duration: 600.ms, delay: (index * 200).ms)
        .slideY(begin: 0.3, end: 0);
  }

  Widget _buildFeaturesSection() {
    final features = [
      {'icon': '⚡', 'title': 'Task Automation', 'desc': 'Execute complex workflows automatically'},
      {'icon': '🔄', 'title': 'Smart Scheduling', 'desc': 'Set up recurring tasks and triggers'},
      {'icon': '🐛', 'title': 'Auto Debug', 'desc': 'Detect and fix code issues automatically'},
      {'icon': '✍️', 'title': 'Content Generation', 'desc': 'Create high-quality content with AI'},
      {'icon': '🔗', 'title': 'Multi-Platform', 'desc': 'Works with 10+ messaging apps'},
      {'icon': '🔒', 'title': 'Secure & Private', 'desc': 'End-to-end encryption built-in'},
    ];

    return Container(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          Text(
            'CAPABILITIES',
            style: Theme.of(context).textTheme.labelLarge?.copyWith(
              color: AppTheme.accentColor,
              letterSpacing: 2,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Everything You Need',
            style: Theme.of(context).textTheme.displayMedium,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 48),
          ...features.asMap().entries.map((entry) {
            return Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: FeatureCard(
                icon: entry.value['icon']!,
                title: entry.value['title']!,
                description: entry.value['desc']!,
              )
                  .animate()
                  .fadeIn(duration: 600.ms, delay: (entry.key * 100).ms)
                  .slideX(begin: 0.2, end: 0),
            );
          }).toList(),
        ],
      ),
    );
  }

  Widget _buildCTASection() {
    return Container(
      margin: const EdgeInsets.all(24),
      padding: const EdgeInsets.all(48),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF0A0A0A), Color(0xFF1A1A1A)],
        ),
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        children: [
          ShaderMask(
            shaderCallback: (bounds) => const LinearGradient(
              colors: [Colors.white, Color(0xFFBFDBFE)],
            ).createShader(
              Rect.fromLTWH(0, 0, bounds.width, bounds.height),
            ),
            child: Text(
              'Ready to Automate?',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.displayMedium?.copyWith(
                color: Colors.white,
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Start using AI Agent today with zero setup costs',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
              color: Colors.white70,
            ),
          ),
          const SizedBox(height: 32),
          CustomButton(
            text: 'Get Started Free',
            onPressed: () {},
            isLight: true,
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }
}
```

`lib/widgets/custom_button.dart`:
```dart
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class CustomButton extends StatefulWidget {
  final String text;
  final VoidCallback onPressed;
  final bool isOutlined;
  final bool isSmall;
  final bool isLight;

  const CustomButton({
    super.key,
    required this.text,
    required this.onPressed,
    this.isOutlined = false,
    this.isSmall = false,
    this.isLight = false,
  });

  @override
  State<CustomButton> createState() => _CustomButtonState();
}

class _CustomButtonState extends State<CustomButton> 
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 150),
      vsync: this,
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: 0.95).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => _controller.forward(),
      onTapUp: (_) {
        _controller.reverse();
        widget.onPressed();
      },
      onTapCancel: () => _controller.reverse(),
      child: ScaleTransition(
        scale: _scaleAnimation,
        child: Container(
          padding: EdgeInsets.symmetric(
            horizontal: widget.isSmall ? 20 : 32,
            vertical: widget.isSmall ? 10 : 16,
          ),
          decoration: BoxDecoration(
            gradient: widget.isOutlined || widget.isLight
                ? null
                : AppTheme.primaryGradient,
            color: widget.isLight 
                ? Colors.white 
                : widget.isOutlined 
                    ? Colors.transparent 
                    : null,
            borderRadius: BorderRadius.circular(12),
            border: widget.isOutlined
                ? Border.all(color: AppTheme.textPrimary, width: 2)
                : null,
            boxShadow: !widget.isOutlined
                ? [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.1),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ]
                : null,
          ),
          child: Text(
            widget.text,
            style: TextStyle(
              fontSize: widget.isSmall ? 14 : 16,
              fontWeight: FontWeight.w600,
              color: widget.isLight
                  ? AppTheme.textPrimary
                  : widget.isOutlined
                      ? AppTheme.textPrimary
                      : Colors.white,
            ),
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }
}
```

`lib/widgets/feature_card.dart`:
```dart
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class FeatureCard extends StatelessWidget {
  final String icon;
  final String title;
  final String description;

  const FeatureCard({
    super.key,
    required this.icon,
    required this.title,
    required this.description,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppTheme.surfaceColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: AppTheme.textSecondary.withOpacity(0.2),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              gradient: AppTheme.primaryGradient,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Center(
              child: Text(
                icon,
                style: const TextStyle(fontSize: 28),
              ),
            ),
          ),
          const SizedBox(width: 20),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 4),
                Text(
                  description,
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
```

`lib/widgets/gradient_background.dart`:
```dart
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class GradientBackground extends StatelessWidget {
  final Widget child;

  const GradientBackground({
    super.key,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        gradient: AppTheme.backgroundGradient,
      ),
      child: Stack(
        children: [
          // Floating blobs
          Positioned(
            top: -100,
            left: -100,
            child: Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(
                color: AppTheme.accentColor.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
            ),
          ),
          Positioned(
            top: 200,
            right: -100,
            child: Container(
              width: 250,
              height: 250,
              decoration: BoxDecoration(
                color: AppTheme.accentColor.withOpacity(0.08),
                shape: BoxShape.circle,
              ),
            ),
          ),
          child,
        ],
      ),
    );
  }
}
```

### REACT NATIVE (Mobile - Cross Platform)

### REACT NATIVE (Mobile - Cross Platform)

**Project Structure**:
```
src/
├── App.tsx
├── screens/
│   ├── HomeScreen.tsx
│   └── FeaturesScreen.tsx
├── components/
│   ├── CustomButton.tsx
│   ├── FeatureCard.tsx
│   └── GradientBackground.tsx
├── theme/
│   └── colors.ts
└── navigation/
    └── RootNavigator.tsx

package.json
tsconfig.json
```

**package.json**:
```json
{
  "name": "PremiumApp",
  "version": "1.0.0",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios"
  },
  "dependencies": {
    "react": "18.2.0",
    "react-native": "0.73.0",
    "expo": "~50.0.0",
    "expo-linear-gradient": "~12.7.0",
    "expo-blur": "~12.9.0",
    "react-native-reanimated": "~3.6.0",
    "@react-navigation/native": "^6.1.9",
    "@react-navigation/bottom-tabs": "^6.5.11"
  },
  "devDependencies": {
    "@types/react": "~18.2.45",
    "@types/react-native": "~0.73.0",
    "typescript": "^5.3.0"
  }
}
```

**src/theme/colors.ts**:
```typescript
export const colors = {
  primary: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0A0A0A',
  },
  accent: {
    400: '#60A5FA',
    500: '#3B82F6',
    600: '#2563EB',
  },
  white: '#FFFFFF',
  transparent: 'transparent',
};

export const gradients = {
  primary: ['#3B82F6', '#2563EB'],
  background: ['#FAFAFA', '#F5F5F5'],
  dark: ['#0A0A0A', '#1A1A1A'],
};
```

**src/App.tsx**:
```typescript
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import HomeScreen from './screens/HomeScreen';
import FeaturesScreen from './screens/FeaturesScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              backgroundColor: '#FFFFFF',
              borderTopWidth: 1,
              borderTopColor: '#E5E5E5',
              paddingBottom: 8,
              paddingTop: 8,
              height: 60,
            },
            tabBarActiveTintColor: '#3B82F6',
            tabBarInactiveTintColor: '#737373',
          }}
        >
          <Tab.Screen name="Home" component={HomeScreen} />
          <Tab.Screen name="Features" component={FeaturesScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
```

**src/screens/HomeScreen.tsx**:
```typescript
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import CustomButton from '../components/CustomButton';
import { colors, gradients } from '../theme/colors';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient
        colors={gradients.background}
        style={styles.gradientBackground}
      >
        {/* Floating Blobs */}
        <View style={styles.blob1} />
        <View style={styles.blob2} />
        
        {/* Hero Section */}
        <View style={styles.hero}>
          <Animated.View
            style={[
              styles.badge,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <BlurView intensity={20} style={styles.badgeBlur}>
              <View style={styles.badgeContent}>
                <View style={styles.badgeDot} />
                <Text style={styles.badgeText}>Completely Free Forever</Text>
              </View>
            </BlurView>
          </Animated.View>

          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            <LinearGradient
              colors={gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientTextContainer}
            >
              <Text style={styles.heroTitle}>Your Autonomous{'\n'}AI Agent</Text>
            </LinearGradient>
            
            <Text style={styles.heroSubtitle}>for Every Messaging App</Text>
            
            <Text style={styles.heroDescription}>
              Automate tasks, schedule workflows, debug code, and write content
              across Telegram, WhatsApp, Discord, and more.
            </Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.buttonContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <CustomButton
              title="Get Started"
              onPress={() => {}}
              gradient={gradients.primary}
            />
            <CustomButton
              title="Learn More"
              onPress={() => {}}
              variant="outlined"
              style={{ marginTop: 12 }}
            />
          </Animated.View>
        </View>

        {/* Stats Section */}
        <View style={styles.stats}>
          {[
            { value: '24/7', label: 'Always Active' },
            { value: '10+', label: 'Platforms' },
            { value: '100%', label: 'Free' },
          ].map((stat, index) => (
            <Animated.View
              key={index}
              style={[
                styles.statCard,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <LinearGradient
                colors={gradients.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statGradient}
              >
                <Text style={styles.statValue}>{stat.value}</Text>
              </LinearGradient>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </Animated.View>
          ))}
        </View>

        {/* CTA Section */}
        <View style={styles.cta}>
          <LinearGradient
            colors={gradients.dark}
            style={styles.ctaGradient}
          >
            <Text style={styles.ctaTitle}>Ready to Automate?</Text>
            <Text style={styles.ctaDescription}>
              Start using AI Agent today with zero setup costs
            </Text>
            <CustomButton
              title="Get Started Free"
              onPress={() => {}}
              variant="light"
              style={{ marginTop: 24 }}
            />
          </LinearGradient>
        </View>
      </LinearGradient>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary[50],
  },
  gradientBackground: {
    flex: 1,
    paddingTop: 60,
  },
  blob1: {
    position: 'absolute',
    top: -100,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: `${colors.accent[500]}15`,
  },
  blob2: {
    position: 'absolute',
    top: 200,
    right: -100,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: `${colors.accent[500]}10`,
  },
  hero: {
    paddingHorizontal: 24,
    paddingVertical: 48,
    alignItems: 'center',
  },
  badge: {
    marginBottom: 32,
    borderRadius: 100,
    overflow: 'hidden',
  },
  badgeBlur: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  badgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent[500],
    marginRight: 8,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary[900],
  },
  gradientTextContainer: {
    borderRadius: 8,
    padding: 2,
  },
  heroTitle: {
    fontSize: 48,
    fontWeight: '800',
    textAlign: 'center',
    color: colors.white,
    letterSpacing: -1.5,
    lineHeight: 52,
  },
  heroSubtitle: {
    fontSize: 40,
    fontWeight: '700',
    textAlign: 'center',
    color: colors.primary[900],
    marginTop: 16,
    letterSpacing: -1,
  },
  heroDescription: {
    fontSize: 18,
    textAlign: 'center',
    color: colors.primary[600],
    marginTop: 24,
    lineHeight: 28,
    paddingHorizontal: 16,
  },
  buttonContainer: {
    width: '100%',
    marginTop: 40,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  statCard: {
    alignItems: 'center',
  },
  statGradient: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statValue: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.white,
  },
  statLabel: {
    fontSize: 14,
    color: colors.primary[600],
    marginTop: 8,
  },
  cta: {
    margin: 24,
    borderRadius: 24,
    overflow: 'hidden',
  },
  ctaGradient: {
    padding: 48,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.white,
    textAlign: 'center',
  },
  ctaDescription: {
    fontSize: 16,
    color: `${colors.white}B3`,
    textAlign: 'center',
    marginTop: 12,
  },
});
```

**src/components/CustomButton.tsx**:
```typescript
import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';

interface CustomButtonProps {
  title: string;
  onPress: () => void;
  gradient?: string[];
  variant?: 'primary' | 'outlined' | 'light';
  style?: ViewStyle;
}

export default function CustomButton({
  title,
  onPress,
  gradient = ['#3B82F6', '#2563EB'],
  variant = 'primary',
  style,
}: CustomButtonProps) {
  const scaleAnim = new Animated.Value(1);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  if (variant === 'outlined') {
    return (
      <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
        <TouchableOpacity
          style={styles.outlinedButton}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.8}
        >
          <Text style={styles.outlinedButtonText}>{title}</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  if (variant === 'light') {
    return (
      <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
        <TouchableOpacity
          style={styles.lightButton}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.8}
        >
          <Text style={styles.lightButtonText}>{title}</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.button}
        >
          <Text style={styles.buttonText}>{title}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  outlinedButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary[900],
    alignItems: 'center',
    backgroundColor: colors.transparent,
  },
  outlinedButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary[900],
  },
  lightButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  lightButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary[900],
  },
});
```

### VUE 3 + TYPESCRIPT + TAILWIND (Web App)

**Project Structure**:
```
src/
├── App.vue
├── components/
│   ├── Navigation.vue
│   ├── Hero.vue
│   ├── Features.vue
│   ├── Stats.vue
│   └── CTA.vue
├── composables/
│   └── useScrollReveal.ts
└── assets/
    └── main.css

vite.config.ts
tailwind.config.ts
tsconfig.json
package.json
```

**package.json**:
```json
{
  "name": "premium-vue-app",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "vue": "^3.4.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.0.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
```

**src/App.vue**:
```vue
<script setup lang="ts">
import Navigation from './components/Navigation.vue'
import Hero from './components/Hero.vue'
import Stats from './components/Stats.vue'
import Features from './components/Features.vue'
import CTA from './components/CTA.vue'
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
    <Navigation />
    <Hero />
    <Stats />
    <Features />
    <CTA />
  </div>
</template>
```

**src/components/Hero.vue**:
```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useScrollReveal } from '../composables/useScrollReveal'

const { reveal } = useScrollReveal()
const heroRef = ref<HTMLElement | null>(null)

onMounted(() => {
  if (heroRef.value) {
    reveal(heroRef.value.querySelectorAll('.reveal'))
  }
})
</script>

<template>
  <section ref="heroRef" class="relative min-h-screen flex items-center justify-center pt-20 px-8 overflow-hidden">
    <!-- Gradient Background -->
    <div class="absolute inset-0 bg-gradient-to-br from-blue-50 via-gray-50 to-gray-100 opacity-50" />
    
    <!-- Floating Blobs -->
    <div class="absolute top-0 left-0 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
    <div class="absolute top-0 right-0 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
    <div class="absolute bottom-0 left-1/2 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" />

    <div class="relative max-w-5xl mx-auto text-center z-10">
      <!-- Badge -->
      <div class="reveal inline-flex items-center gap-2 px-4 py-1.5 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-full text-sm font-medium text-gray-700 mb-8">
        <span class="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
        Completely Free Forever
      </div>

      <!-- Main Heading -->
      <h1 class="reveal text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight mb-8">
        <span class="bg-gradient-to-r from-gray-900 via-blue-600 to-blue-500 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
          Your Autonomous AI Agent
        </span>
        <br />
        <span class="text-gray-900">for Every Messaging App</span>
      </h1>

      <!-- Description -->
      <p class="reveal text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto mb-12 leading-relaxed">
        Automate tasks, schedule workflows, debug code, and write content across Telegram, WhatsApp, Discord, and more.
      </p>

      <!-- CTA Buttons -->
      <div class="reveal flex flex-col sm:flex-row items-center justify-center gap-4">
        <button class="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-lg font-semibold rounded-xl hover:-translate-y-1 hover:shadow-2xl transition-all duration-300">
          Start Automating Now
        </button>
        <button class="px-8 py-4 bg-white text-gray-900 text-lg font-semibold rounded-xl border-2 border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-all duration-300">
          View Documentation
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.reveal {
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.reveal.is-visible {
  opacity: 1;
  transform: translateY(0);
}

@keyframes blob {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-20px);
  }
}

.animate-blob {
  animation: blob 7s ease-in-out infinite;
}

.animation-delay-2000 {
  animation-delay: 2s;
}

.animation-delay-4000 {
  animation-delay: 4s;
}

@keyframes gradient {
  0%, 100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

.animate-gradient {
  animation: gradient 8s ease infinite;
}
</style>
```

**src/composables/useScrollReveal.ts**:
```typescript
import { onMounted, onUnmounted } from 'vue'

export function useScrollReveal() {
  let observer: IntersectionObserver | null = null

  const reveal = (elements: NodeListOf<Element> | Element[]) => {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
          }
        })
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px',
      }
    )

    elements.forEach((el) => observer?.observe(el))
  }

  onUnmounted(() => {
    observer?.disconnect()
  })

  return { reveal }
}
```

### SVELTE + TYPESCRIPT + TAILWIND (Web App)

**src/routes/+page.svelte**:
```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import Hero from '$lib/components/Hero.svelte';
  import Features from '$lib/components/Features.svelte';
  import CTA from '$lib/components/CTA.svelte';

  let mounted = false;

  onMount(() => {
    mounted = true;
  });
</script>

<svelte:head>
  <title>Premium Landing Page</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
  {#if mounted}
    <Hero />
    <Features />
    <CTA />
  {/if}
</div>
```

**src/lib/components/Hero.svelte**:
```svelte
<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
</script>

<section class="relative min-h-screen flex items-center justify-center pt-20 px-8 overflow-hidden">
  <!-- Gradient Background -->
  <div class="absolute inset-0 bg-gradient-to-br from-blue-50 via-gray-50 to-gray-100 opacity-50" />
  
  <!-- Floating Blobs -->
  <div class="absolute top-0 left-0 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
  <div class="absolute top-0 right-0 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" style="animation-delay: 2s" />

  <div class="relative max-w-5xl mx-auto text-center z-10">
    <!-- Badge -->
    <div 
      in:fade={{ duration: 600 }}
      class="inline-flex items-center gap-2 px-4 py-1.5 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-full text-sm font-medium text-gray-700 mb-8"
    >
      <span class="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
      Completely Free Forever
    </div>

    <!-- Main Heading -->
    <h1 
      in:fly={{ y: 30, duration: 600, delay: 200, easing: quintOut }}
      class="text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight mb-8"
    >
      <span class="bg-gradient-to-r from-gray-900 via-blue-600 to-blue-500 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
        Your Autonomous AI Agent
      </span>
      <br />
      <span class="text-gray-900">for Every Messaging App</span>
    </h1>

    <!-- Description -->
    <p 
      in:fly={{ y: 30, duration: 600, delay: 400, easing: quintOut }}
      class="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto mb-12 leading-relaxed"
    >
      Automate tasks, schedule workflows, debug code, and write content across Telegram, WhatsApp, Discord, and more.
    </p>

    <!-- CTA Buttons -->
    <div 
      in:fly={{ y: 30, duration: 600, delay: 600, easing: quintOut }}
      class="flex flex-col sm:flex-row items-center justify-center gap-4"
    >
      <button class="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-lg font-semibold rounded-xl hover:-translate-y-1 hover:shadow-2xl transition-all duration-300">
        Start Automating Now
      </button>
      <button class="px-8 py-4 bg-white text-gray-900 text-lg font-semibold rounded-xl border-2 border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-all duration-300">
        View Documentation
      </button>
    </div>
  </div>
</section>

<style>
  @keyframes blob {
    0%, 100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-20px);
    }
  }

  .animate-blob {
    animation: blob 7s ease-in-out infinite;
  }

  @keyframes gradient {
    0%, 100% {
      background-position: 0% 50%;
    }
    50% {
      background-position: 100% 50%;
    }
  }

  .animate-gradient {
    animation: gradient 8s ease infinite;
  }
</style>
```

## FRAMEWORK AUTO-SELECTION RULES

When generating code, automatically choose based on these signals:

**Choose Next.js + TypeScript** when:
- User mentions: "web app", "website", "landing page", "SEO"
- Default choice for web projects
- Full-stack capabilities needed

**Choose Flutter** when:
- User mentions: "mobile app", "iOS", "Android", "cross-platform"
- Native performance needed
- Dart experience indicated

**Choose React Native** when:
- User mentions: "mobile", "Expo", "React Native"
- JavaScript/TypeScript team
- Rapid prototyping

**Choose Vue 3** when:
- User mentions: "Vue", "Vite"
- Simpler state management needed

**Choose Svelte** when:
- User mentions: "Svelte", "SvelteKit"
- Minimal bundle size priority
- Simple reactive patterns

**Choose HTML/CSS/JS** when:
- User mentions: "simple", "static", "no framework"
- Learning project
- Maximum compatibility

### Step 2: Auto-Select Color Palette

#### Palette Database (Choose 1):

**Tech/AI Projects**:
```css
/* Option 1: Midnight Professional */
--bg-primary: #0f0f0f;
--bg-secondary: #1a1a1a;
--text-primary: #ffffff;
--text-secondary: #a3a3a3;
--accent: #3b82f6;
--accent-light: #60a5fa;

/* Option 2: Clean Slate */
--bg-primary: #fafafa;
--bg-secondary: #ffffff;
--text-primary: #0a0a0a;
--text-secondary: #737373;
--accent: #1a1a1a;
--accent-light: #404040;

/* Option 3: Muted Ocean */
--bg-primary: #f8fafc;
--bg-secondary: #ffffff;
--text-primary: #0f172a;
--text-secondary: #64748b;
--accent: #0ea5e9;
--accent-light: #38bdf8;
```

**Creative/Design Projects**:
```css
/* Option 1: Warm Canvas */
--bg-primary: #faf8f5;
--bg-secondary: #ffffff;
--text-primary: #1c1917;
--text-secondary: #78716c;
--accent: #ea580c;
--accent-light: #fb923c;

/* Option 2: Olive Professional */
--bg-primary: #fafaf9;
--bg-secondary: #ffffff;
--text-primary: #1c1917;
--text-secondary: #78716c;
--accent: #65a30d;
--accent-light: #84cc16;

/* Option 3: Forest Depth */
--bg-primary: #fafaf9;
--bg-secondary: #ffffff;
--text-primary: #052e16;
--text-secondary: #365314;
--accent: #16a34a;
--accent-light: #22c55e;
```

**Corporate/Finance Projects**:
```css
/* Option 1: Navy Authority */
--bg-primary: #fafafa;
--bg-secondary: #ffffff;
--text-primary: #0c1222;
--text-secondary: #475569;
--accent: #1e40af;
--accent-light: #3b82f6;

/* Option 2: Charcoal Trust */
--bg-primary: #fafafa;
--bg-secondary: #ffffff;
--text-primary: #18181b;
--text-secondary: #52525b;
--accent: #27272a;
--accent-light: #3f3f46;

/* Option 3: Deep Teal */
--bg-primary: #f8fafc;
--bg-secondary: #ffffff;
--text-primary: #0f172a;
--text-secondary: #475569;
--accent: #0e7490;
--accent-light: #06b6d4;
```

**Luxury/Premium Projects**:
```css
/* Option 1: Gold Elegance */
--bg-primary: #fafaf9;
--bg-secondary: #ffffff;
--text-primary: #1c1917;
--text-secondary: #78716c;
--accent: #ca8a04;
--accent-light: #eab308;

/* Option 2: Deep Burgundy */
--bg-primary: #faf5f5;
--bg-secondary: #ffffff;
--text-primary: #1c0a0a;
--text-secondary: #7c2d12;
--accent: #991b1b;
--accent-light: #dc2626;

/* Option 3: Platinum Minimal */
--bg-primary: #fafafa;
--bg-secondary: #ffffff;
--text-primary: #0a0a0a;
--text-secondary: #737373;
--accent: #525252;
--accent-light: #737373;
```

### Step 3: Auto-Select Premium Effects

Every project gets 4-6 of these effects. Choose based on project type:

**Effect 1: Gradient Backgrounds** (MANDATORY for all projects)
```css
/* Subtle mesh gradient */
.gradient-bg {
  background: 
    radial-gradient(at 0% 0%, rgba(var(--accent-rgb), 0.1) 0%, transparent 50%),
    radial-gradient(at 100% 100%, rgba(var(--accent-rgb), 0.08) 0%, transparent 50%),
    var(--bg-primary);
}

/* Gradient overlay on sections */
.section-gradient {
  background: linear-gradient(
    180deg,
    var(--bg-primary) 0%,
    var(--bg-secondary) 50%,
    var(--bg-primary) 100%
  );
}
```

**Effect 2: Glassmorphism** (Use for cards, modals, navigation)
```css
.glass {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
}

.glass-dark {
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(12px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}
```

**Effect 3: Gradient Text** (Use for headings, CTAs)
```css
.gradient-text {
  background: linear-gradient(
    135deg,
    var(--text-primary) 0%,
    var(--accent) 50%,
    var(--accent-light) 100%
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Animated gradient */
.gradient-text-animated {
  background: linear-gradient(
    270deg,
    var(--text-primary),
    var(--accent),
    var(--accent-light),
    var(--text-primary)
  );
  background-size: 400% 400%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: gradientFlow 8s ease infinite;
}

@keyframes gradientFlow {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}
```

**Effect 4: Smooth Shadows** (Layered, realistic)
```css
.shadow-sm {
  box-shadow: 
    0 1px 2px rgba(0, 0, 0, 0.04),
    0 1px 4px rgba(0, 0, 0, 0.04);
}

.shadow-md {
  box-shadow: 
    0 2px 4px rgba(0, 0, 0, 0.04),
    0 4px 8px rgba(0, 0, 0, 0.04),
    0 8px 16px rgba(0, 0, 0, 0.04);
}

.shadow-lg {
  box-shadow: 
    0 4px 6px rgba(0, 0, 0, 0.05),
    0 10px 15px rgba(0, 0, 0, 0.05),
    0 20px 25px rgba(0, 0, 0, 0.05);
}

.shadow-xl {
  box-shadow: 
    0 10px 15px rgba(0, 0, 0, 0.05),
    0 20px 30px rgba(0, 0, 0, 0.05),
    0 30px 40px rgba(0, 0, 0, 0.05);
}
```

**Effect 5: Animated Gradient Borders**
```css
.gradient-border {
  position: relative;
  background: var(--bg-secondary);
  border-radius: 16px;
}

.gradient-border::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 16px;
  padding: 2px;
  background: linear-gradient(
    135deg,
    var(--accent),
    var(--accent-light),
    var(--accent)
  );
  -webkit-mask: 
    linear-gradient(#fff 0 0) content-box, 
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
}

.gradient-border-animated::before {
  background: linear-gradient(
    270deg,
    var(--accent),
    var(--accent-light),
    var(--accent)
  );
  background-size: 400% 400%;
  animation: borderGradient 3s ease infinite;
}

@keyframes borderGradient {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}
```

**Effect 6: Floating Elements**
```css
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-20px); }
}

.float {
  animation: float 6s ease-in-out infinite;
}

.float-slow {
  animation: float 8s ease-in-out infinite;
}
```

**Effect 7: Spotlight Effect**
```css
.spotlight {
  position: relative;
  overflow: hidden;
}

.spotlight::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(
    circle,
    rgba(255, 255, 255, 0.1) 0%,
    transparent 70%
  );
  opacity: 0;
  transition: opacity 0.3s;
}

.spotlight:hover::before {
  opacity: 1;
}
```

**Effect 8: Scroll-triggered Parallax**
```css
.parallax {
  transform: translateY(calc(var(--scroll-position) * -0.3px));
  will-change: transform;
}
```

```javascript
// Add to every page
let scrollPosition = 0;
window.addEventListener('scroll', () => {
  scrollPosition = window.pageYOffset;
  document.querySelectorAll('.parallax').forEach(el => {
    el.style.setProperty('--scroll-position', scrollPosition);
  });
});
```

### Step 4: Auto-Select Layout Pattern

Based on content type, choose ONE:

**Pattern A: Hero-Dominant** (For products, SaaS, tools)
```
- Full-height hero (100vh) with gradient background
- Large heading (80px+) with gradient text
- CTA buttons with premium hover
- Floating card with demo/image
- Stats bar below hero
- Feature grid (3 columns)
- Testimonials carousel
- Pricing table
- FAQ accordion
- Footer
```

**Pattern B: Content-First** (For agencies, studios, portfolios)
```
- Minimal header
- Medium hero (70vh) with bold typography
- Featured work grid (masonry layout)
- Services cards with icons
- Process timeline
- Team section with hover effects
- Contact form with gradient accent
- Footer
```

**Pattern C: Dashboard-Style** (For apps, platforms, tools)
```
- Sidebar navigation (fixed)
- Top bar with search
- Main content area with cards
- Data visualization sections
- Action buttons floating
- Quick stats widgets
- Activity feed
- Footer
```

## MANDATORY PREMIUM FEATURES

Every single UI MUST include ALL of these:

### 1. Advanced Typography System

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  /* Spacing scale - ONLY use these values */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;
  --space-24: 96px;
  --space-32: 128px;
  
  /* Typography scale */
  --text-xs: 12px;
  --text-sm: 14px;
  --text-base: 16px;
  --text-lg: 18px;
  --text-xl: 20px;
  --text-2xl: 24px;
  --text-3xl: 30px;
  --text-4xl: 36px;
  --text-5xl: 48px;
  --text-6xl: 60px;
  --text-7xl: 72px;
  --text-8xl: 96px;
  
  /* Border radius */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-full: 9999px;
  
  /* Transitions */
  --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-base: 250ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 350ms cubic-bezier(0.4, 0, 0.2, 1);
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: var(--text-base);
  line-height: 1.5;
  color: var(--text-primary);
  background: var(--bg-primary);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

h1, .h1 {
  font-size: var(--text-7xl);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.03em;
  margin-bottom: var(--space-6);
}

h2, .h2 {
  font-size: var(--text-5xl);
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.02em;
  margin-bottom: var(--space-6);
}

h3, .h3 {
  font-size: var(--text-3xl);
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: -0.01em;
  margin-bottom: var(--space-4);
}

p {
  line-height: 1.6;
  margin-bottom: var(--space-4);
}

.lead {
  font-size: var(--text-xl);
  font-weight: 400;
  line-height: 1.6;
  color: var(--text-secondary);
}

/* Responsive typography */
@media (max-width: 768px) {
  h1, .h1 { font-size: var(--text-5xl); }
  h2, .h2 { font-size: var(--text-4xl); }
  h3, .h3 { font-size: var(--text-2xl); }
}
```

### 2. Perfect Button System

```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-6);
  font-size: var(--text-base);
  font-weight: 600;
  border-radius: var(--radius-md);
  border: none;
  cursor: pointer;
  transition: all var(--transition-base);
  text-decoration: none;
  white-space: nowrap;
}

.btn-primary {
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-light) 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
}

.btn-primary:active {
  transform: translateY(0);
}

.btn-secondary {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 2px solid var(--text-primary);
}

.btn-secondary:hover {
  background: var(--text-primary);
  color: var(--bg-secondary);
}

.btn-ghost {
  background: transparent;
  color: var(--text-primary);
}

.btn-ghost:hover {
  background: rgba(0, 0, 0, 0.05);
}

.btn-large {
  padding: var(--space-4) var(--space-8);
  font-size: var(--text-lg);
}
```

### 3. Premium Card Components

```css
.card {
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  padding: var(--space-8);
  transition: all var(--transition-base);
}

.card-hover {
  cursor: pointer;
}

.card-hover:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
}

.card-glass {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.card-gradient-border {
  position: relative;
  background: var(--bg-secondary);
}

.card-gradient-border::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: var(--radius-lg);
  padding: 2px;
  background: linear-gradient(135deg, var(--accent), var(--accent-light));
  -webkit-mask: 
    linear-gradient(#fff 0 0) content-box, 
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
}
```

### 4. Scroll Animations (MANDATORY)

```javascript
// Include this script in EVERY page
document.addEventListener('DOMContentLoaded', () => {
  // Scroll reveal observer
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });

  // Observe all elements with reveal class
  document.querySelectorAll('.reveal').forEach(el => {
    revealObserver.observe(el);
  });

  // Parallax scroll
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        const scrolled = window.pageYOffset;
        document.querySelectorAll('.parallax').forEach(el => {
          const speed = el.dataset.speed || 0.5;
          el.style.transform = `translateY(${scrolled * speed}px)`;
        });
        ticking = false;
      });
      ticking = true;
    }
  });

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
});
```

```css
.reveal {
  opacity: 0;
  transform: translateY(40px);
  transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.reveal.revealed {
  opacity: 1;
  transform: translateY(0);
}

/* Stagger delays for sequential reveals */
.reveal:nth-child(1) { transition-delay: 0ms; }
.reveal:nth-child(2) { transition-delay: 100ms; }
.reveal:nth-child(3) { transition-delay: 200ms; }
.reveal:nth-child(4) { transition-delay: 300ms; }
.reveal:nth-child(5) { transition-delay: 400ms; }
.reveal:nth-child(6) { transition-delay: 500ms; }
```

### 5. Navigation (Always Include)

```html
<nav class="nav">
  <div class="nav-container">
    <div class="logo">Brand</div>
    <div class="nav-links">
      <a href="#features">Features</a>
      <a href="#pricing">Pricing</a>
      <a href="#about">About</a>
    </div>
    <button class="btn btn-primary">Get Started</button>
  </div>
</nav>
```

```css
.nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px) saturate(180%);
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.nav-container {
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 var(--space-8);
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 72px;
}

.logo {
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--text-primary);
}

.nav-links {
  display: flex;
  gap: var(--space-8);
  align-items: center;
}

.nav-links a {
  color: var(--text-secondary);
  text-decoration: none;
  font-weight: 500;
  font-size: var(--text-base);
  transition: color var(--transition-fast);
}

.nav-links a:hover {
  color: var(--text-primary);
}

@media (max-width: 768px) {
  .nav-links {
    display: none;
  }
}
```

## COMPLETE PAGE STRUCTURE TEMPLATE

Use this structure for EVERY landing page:

## COMPLETE PAGE STRUCTURE TEMPLATE

Use this structure for EVERY landing page:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>[Project Name]</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    /* PASTE COMPLETE STYLESHEET HERE */
    /* Include: Reset, CSS variables, Typography, Components, Animations, Responsive */
  </style>
</head>
<body>
  
  <!-- Navigation (Fixed + Glass) -->
  <nav class="nav">
    <div class="nav-container">
      <div class="logo">[Brand Name]</div>
      <div class="nav-links">
        <a href="#features">Features</a>
        <a href="#how">How It Works</a>
        <a href="#pricing">Pricing</a>
      </div>
      <button class="btn btn-primary">[CTA Text]</button>
    </div>
  </nav>

  <!-- Hero Section (Full height + Gradient) -->
  <section class="hero gradient-bg">
    <div class="container">
      <div class="hero-content">
        <!-- Badge (optional) -->
        <div class="badge reveal">[Free Forever / New / Beta / etc]</div>
        
        <!-- Main Heading (MUST use gradient-text) -->
        <h1 class="reveal gradient-text-animated">
          [Powerful Headline]<br>
          [With Line Break]
        </h1>
        
        <!-- Subtitle -->
        <p class="lead reveal">[Compelling value proposition in 1-2 sentences]</p>
        
        <!-- CTA Buttons -->
        <div class="hero-ctas reveal">
          <button class="btn btn-primary btn-large">[Primary CTA]</button>
          <button class="btn btn-secondary btn-large">[Secondary CTA]</button>
        </div>
        
        <!-- Hero Visual (Optional: Image, Video, or Demo) -->
        <div class="hero-visual reveal">
          <div class="card card-glass shadow-xl">
            <!-- Screenshot, animation, or illustration -->
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Stats/Social Proof Bar -->
  <section class="stats">
    <div class="container">
      <div class="stats-grid">
        <div class="stat-item reveal">
          <div class="stat-number gradient-text">[Number]</div>
          <div class="stat-label">[Metric Name]</div>
        </div>
        <div class="stat-item reveal">
          <div class="stat-number gradient-text">[Number]</div>
          <div class="stat-label">[Metric Name]</div>
        </div>
        <div class="stat-item reveal">
          <div class="stat-number gradient-text">[Number]</div>
          <div class="stat-label">[Metric Name]</div>
        </div>
      </div>
    </div>
  </section>

  <!-- Features Section -->
  <section class="features" id="features">
    <div class="container">
      <div class="section-header">
        <div class="section-label reveal">[CATEGORY]</div>
        <h2 class="reveal">[Feature Section Headline]</h2>
        <p class="section-description reveal">[Supporting description]</p>
      </div>
      
      <div class="features-grid">
        <!-- Repeat 6 times -->
        <div class="card card-hover card-gradient-border reveal">
          <div class="feature-icon gradient-text">[Icon/Emoji]</div>
          <h3>[Feature Name]</h3>
          <p>[Feature description in 1-2 sentences]</p>
        </div>
      </div>
    </div>
  </section>

  <!-- How It Works (Optional) -->
  <section class="how-it-works gradient-bg" id="how">
    <div class="container">
      <div class="section-header">
        <div class="section-label reveal">[PROCESS]</div>
        <h2 class="reveal">[How It Works Headline]</h2>
      </div>
      
      <div class="steps">
        <div class="step reveal">
          <div class="step-number gradient-text">01</div>
          <h3>[Step Name]</h3>
          <p>[Step description]</p>
        </div>
        <div class="step reveal">
          <div class="step-number gradient-text">02</div>
          <h3>[Step Name]</h3>
          <p>[Step description]</p>
        </div>
        <div class="step reveal">
          <div class="step-number gradient-text">03</div>
          <h3>[Step Name]</h3>
          <p>[Step description]</p>
        </div>
      </div>
    </div>
  </section>

  <!-- CTA Section (Dark + Gradient) -->
  <section class="cta">
    <div class="container">
      <div class="cta-content reveal">
        <h2 class="gradient-text-animated">[Final CTA Headline]</h2>
        <p>[Supporting text encouraging action]</p>
        <div class="cta-buttons">
          <button class="btn btn-primary btn-large">[Primary CTA]</button>
          <button class="btn btn-ghost btn-large">[Secondary CTA]</button>
        </div>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="footer">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <div class="logo">[Brand Name]</div>
          <p>[Short company description]</p>
        </div>
        <div class="footer-links">
          <h4>Product</h4>
          <a href="#">Features</a>
          <a href="#">Pricing</a>
          <a href="#">Updates</a>
        </div>
        <div class="footer-links">
          <h4>Company</h4>
          <a href="#">About</a>
          <a href="#">Blog</a>
          <a href="#">Careers</a>
        </div>
        <div class="footer-links">
          <h4>Legal</h4>
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
        </div>
      </div>
      <div class="footer-bottom">
        <p>&copy; 2024 [Company Name]. All rights reserved.</p>
      </div>
    </div>
  </footer>

  <script>
    // PASTE COMPLETE JAVASCRIPT HERE
    // Include: Scroll reveal, Parallax, Smooth scroll
  </script>
</body>
</html>
```

## AUTONOMOUS GENERATION WORKFLOW

When user says: "Create a landing page for [X]"

**Execute these steps automatically (no questions):**

### Step 1: Analyze (5 seconds internal thinking)
- Project type: SaaS / Agency / E-commerce / Portfolio / etc
- Mood: Professional / Creative / Playful / Luxury / etc
- Target audience: Developers / Designers / Business / General / etc

### Step 2: Auto-select Design System
- Choose color palette from database (12 options)
- Choose 5-6 premium effects from Effect Database
- Choose layout pattern (Hero-Dominant / Content-First / Dashboard)

### Step 3: Generate Complete Code
- Write FULL HTML (500-800 lines)
- Write COMPLETE CSS (800-1200 lines) including:
  * CSS variables with selected palette
  * All typography styles
  * All component styles
  * All animations
  * Full responsive design
- Write COMPLETE JavaScript (100-150 lines)

### Step 4: Fill Content Intelligently
Based on the project description, generate appropriate:
- Headlines (benefit-focused, not generic)
- Descriptions (specific to the product/service)
- Feature names (6 unique features)
- CTAs (action-oriented)
- Stats (realistic numbers)

### Step 5: Apply ALL Premium Features
EVERY page must have:
- ✅ Gradient backgrounds (mesh or linear)
- ✅ Glassmorphism navigation
- ✅ Gradient text on main heading
- ✅ Gradient borders on cards
- ✅ Scroll reveal animations
- ✅ Hover effects on all interactive elements
- ✅ Smooth shadows (layered)
- ✅ Perfect spacing (8px grid)
- ✅ Responsive design (3 breakpoints minimum)

## EXAMPLE: Complete Output for "AI Agent Landing Page"

When user says: "Create a landing page for my AI automation agent"

Auto-decisions made:
1. **Type**: SaaS/Tech product
2. **Mood**: Professional + Modern + Futuristic
3. **Palette**: Midnight Professional (dark theme)
4. **Effects**: Glassmorphism, Gradient text, Animated borders, Scroll reveal, Parallax
5. **Layout**: Hero-Dominant pattern

Then generate 2000+ lines of complete, production-ready code with:
- Dark gradient background
- Glass navigation
- Animated gradient text "Autonomous AI Agent"
- 6 feature cards with gradient borders
- Stats section with large numbers
- CTA with dark background
- Professional footer
- ALL animations working
- Fully responsive

## QUALITY ENFORCEMENT RULES

Before delivering, verify EVERY item:

**Visual Quality** (10/10 required):
- [ ] Uses selected color palette consistently
- [ ] Has gradient backgrounds (mesh or linear)
- [ ] Main heading has gradient-text-animated
- [ ] Navigation has glassmorphism
- [ ] Cards have hover effects
- [ ] At least 3 sections use gradient-bg
- [ ] No empty white spaces > 64px
- [ ] All images/icons have proper styling

**Animation Quality** (10/10 required):
- [ ] Hero content fades in with stagger
- [ ] All .reveal elements animate on scroll
- [ ] All buttons have hover transforms
- [ ] All cards have hover lift
- [ ] Smooth scroll for anchor links works
- [ ] Parallax elements move correctly
- [ ] No janky or laggy animations

**Code Quality** (10/10 required):
- [ ] Complete HTML structure (no TODOs)
- [ ] Complete CSS (800+ lines minimum)
- [ ] Complete JavaScript (scroll reveal working)
- [ ] All spacing uses CSS variables
- [ ] All colors use CSS variables
- [ ] Fully responsive (mobile, tablet, desktop)
- [ ] No console errors
- [ ] Semantic HTML throughout

**Content Quality** (10/10 required):
- [ ] No "[placeholder]" text anywhere
- [ ] Real headlines (not generic)
- [ ] Specific feature descriptions
- [ ] Actionable CTA copy
- [ ] No lorem ipsum
- [ ] All links have proper href (# or real)

## PROHIBITED ITEMS (NEVER include)

- ❌ Emoji in text (only in feature icons if appropriate)
- ❌ Neon colors (#00FF00, #FF00FF, #00FFFF)
- ❌ High saturation colors (saturation > 70%)
- ❌ Purple as primary (#800080, #9B59B6, #8B5CF6, #A855F7)
- ❌ Multiple font families (stick to Inter only)
- ❌ Lorem ipsum placeholder text
- ❌ TODOs or comments like "add content here"
- ❌ Generic CTAs ("Click here", "Learn more")
- ❌ Empty sections
- ❌ Missing animations
- ❌ No glassmorphism
- ❌ No gradients

## ADVANCED TECHNIQUES TO ALWAYS USE

### Technique 1: Mesh Gradients
```css
.mesh-gradient {
  background: 
    radial-gradient(at 0% 0%, rgba(59, 130, 246, 0.15) 0px, transparent 50%),
    radial-gradient(at 50% 0%, rgba(59, 130, 246, 0.1) 0px, transparent 50%),
    radial-gradient(at 100% 0%, rgba(59, 130, 246, 0.08) 0px, transparent 50%),
    var(--bg-primary);
}
```

### Technique 2: Text Shimmer Effect
```css
.shimmer {
  background: linear-gradient(
    90deg,
    var(--text-primary) 0%,
    var(--accent) 50%,
    var(--text-primary) 100%
  );
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: shimmer 3s linear infinite;
}

@keyframes shimmer {
  to {
    background-position: 200% center;
  }
}
```

### Technique 3: Morphing Blob Backgrounds
```css
@keyframes morph {
  0%, 100% {
    border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
  }
  50% {
    border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%;
  }
}

.blob {
  background: linear-gradient(135deg, var(--accent), var(--accent-light));
  animation: morph 8s ease-in-out infinite;
  filter: blur(40px);
  opacity: 0.3;
}
```

### Technique 4: Stagger Grid Animation
```css
.grid-item {
  opacity: 0;
  animation: fadeInUp 0.6s ease forwards;
}

.grid-item:nth-child(1) { animation-delay: 0.1s; }
.grid-item:nth-child(2) { animation-delay: 0.2s; }
.grid-item:nth-child(3) { animation-delay: 0.3s; }
.grid-item:nth-child(4) { animation-delay: 0.4s; }
.grid-item:nth-child(5) { animation-delay: 0.5s; }
.grid-item:nth-child(6) { animation-delay: 0.6s; }
```

### Technique 5: Floating Action Elements
```css
.floating-cta {
  position: fixed;
  bottom: 32px;
  right: 32px;
  z-index: 999;
  animation: float 3s ease-in-out infinite;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}
```

## FINAL MANDATE

Every UI you generate must be:

1. **Completely autonomous** - Generated from minimal prompt, no questions
2. **Fully premium** - Gradients, glass, animations, perfect spacing
3. **Production-ready** - Complete code, no placeholders, no TODOs
4. **Visually stunning** - Looks expensive, modern, professional
5. **Fully functional** - All animations work, responsive, accessible

If the output doesn't make someone say "wow, this looks amazing", it's not good enough.

Generate 2000+ lines of complete, production-ready code every time.

```css
/* Primary Button - Use for main actions */
.btn-primary {
  padding: 12px 24px; /* Space 3 and Space 6 */
  font-size: 16px;
  font-weight: 600;
  border-radius: 8px;
  border: none;
  background: linear-gradient(180deg, #1a1a1a 0%, #000000 100%); /* Dark gradient */
  color: white;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.btn-primary:active {
  transform: translateY(0);
}

/* Secondary Button - Use for secondary actions */
.btn-secondary {
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 8px;
  border: 1.5px solid #e5e7eb; /* gray-200 */
  background: white;
  color: #1f2937; /* gray-800 */
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-secondary:hover {
  border-color: #9ca3af; /* gray-400 */
  background: #f9fafb; /* gray-50 */
}

/* Ghost Button - Use for tertiary actions */
.btn-ghost {
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: #1f2937;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-ghost:hover {
  background: #f3f4f6; /* gray-100 */
}
```

### Input Fields - Perfect Implementation

```css
.input {
  width: 100%;
  padding: 12px 16px; /* Space 3 and Space 4 */
  font-size: 16px;
  font-weight: 400;
  border: 1.5px solid #e5e7eb; /* gray-200 */
  border-radius: 8px;
  background: white;
  color: #1f2937;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  outline: none;
}

.input:focus {
  border-color: #1f2937; /* gray-800 */
  box-shadow: 0 0 0 3px rgba(31, 41, 55, 0.1);
}

.input::placeholder {
  color: #9ca3af; /* gray-400 */
}

.input:disabled {
  background: #f9fafb; /* gray-50 */
  color: #9ca3af;
  cursor: not-allowed;
}

/* Input with error */
.input.error {
  border-color: #dc2626; /* red-600 */
}

.input.error:focus {
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
}

/* Input label */
.label {
  display: block;
  margin-bottom: 8px; /* Space 2 */
  font-size: 14px;
  font-weight: 500;
  color: #374151; /* gray-700 */
}
```

### Cards - Perfect Implementation

```css
.card {
  padding: 32px; /* Space 8 */
  border-radius: 12px;
  background: white;
  border: 1px solid #f3f4f6; /* gray-100 */
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.card:hover {
  border-color: #e5e7eb; /* gray-200 */
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 
              0 2px 4px -1px rgba(0, 0, 0, 0.03);
}

/* Card with glassmorphism */
.card-glass {
  padding: 32px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

/* Dark mode card */
.card-dark {
  padding: 32px;
  border-radius: 12px;
  background: #1f2937; /* gray-800 */
  border: 1px solid #374151; /* gray-700 */
  color: white;
}
```

## MODERN ANIMATIONS - REQUIRED

Every UI must include at least 3 of these animations:

### Fade In Up (Entry Animation)

```css
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-in-up {
  animation: fadeInUp 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

/* Stagger for multiple elements */
.fade-in-up:nth-child(1) { animation-delay: 0ms; }
.fade-in-up:nth-child(2) { animation-delay: 100ms; }
.fade-in-up:nth-child(3) { animation-delay: 200ms; }
.fade-in-up:nth-child(4) { animation-delay: 300ms; }
```

### Smooth Scroll Reveal

```javascript
// Required for scroll animations
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
    }
  });
}, observerOptions);

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
```

```css
.reveal {
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.reveal.is-visible {
  opacity: 1;
  transform: translateY(0);
}
```

### Parallax Effect

```css
.parallax {
  transform: translateY(calc(var(--scroll) * 0.5px));
  transition: transform 0.1s linear;
}
```

```javascript
window.addEventListener('scroll', () => {
  const scroll = window.pageYOffset;
  document.querySelectorAll('.parallax').forEach(el => {
    el.style.setProperty('--scroll', scroll);
  });
});
```

### Smooth Hover Lift

```css
.hover-lift {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.hover-lift:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1),
              0 4px 6px -2px rgba(0, 0, 0, 0.05);
}
```

### Gradient Animation

```css
.gradient-animate {
  background: linear-gradient(
    270deg,
    #1f2937,
    #374151,
    #1f2937
  );
  background-size: 200% 200%;
  animation: gradientShift 3s ease infinite;
}

@keyframes gradientShift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
```

### Scale on Hover

```css
.scale-hover {
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.scale-hover:hover {
  transform: scale(1.02);
}
```

## LAYOUT PERFECTION

### Full-Width Sections (No Empty Space)

```html
<section class="section-full">
  <div class="container">
    <!-- Content here -->
  </div>
</section>
```

```css
.section-full {
  width: 100%;
  padding: 96px 0; /* Space 24 vertical */
  background: white;
}

.container {
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 32px; /* Space 8 horizontal */
}

/* Responsive */
@media (max-width: 768px) {
  .section-full {
    padding: 64px 0; /* Space 16 on mobile */
  }
  
  .container {
    padding: 0 16px; /* Space 4 on mobile */
  }
}
```

### Grid System (Perfect Alignment)

```css
.grid {
  display: grid;
  gap: 32px; /* Space 8 */
}

/* 2 columns on desktop */
.grid-2 {
  grid-template-columns: repeat(2, 1fr);
}

/* 3 columns on desktop */
.grid-3 {
  grid-template-columns: repeat(3, 1fr);
}

/* 4 columns on desktop */
.grid-4 {
  grid-template-columns: repeat(4, 1fr);
}

/* Responsive */
@media (max-width: 1024px) {
  .grid-3,
  .grid-4 {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .grid-2,
  .grid-3,
  .grid-4 {
    grid-template-columns: 1fr;
    gap: 24px; /* Space 6 on mobile */
  }
}
```

### Flex Layouts (Perfect Spacing)

```css
/* Horizontal flex with gap */
.flex-row {
  display: flex;
  gap: 16px; /* Space 4 */
  align-items: center;
}

/* Vertical flex with gap */
.flex-col {
  display: flex;
  flex-direction: column;
  gap: 16px; /* Space 4 */
}

/* Space between */
.flex-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

/* Center everything */
.flex-center {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
}
```

## TYPOGRAPHY SYSTEM

### Font Setup

```css
/* Import fonts */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Fraunces:wght@400;600;700&display=swap');

:root {
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-serif: 'Fraunces', Georgia, serif;
}

body {
  font-family: var(--font-sans);
  font-size: 16px;
  line-height: 1.5;
  color: #1f2937; /* gray-800 */
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

### Heading Styles

```css
h1, .h1 {
  font-size: 56px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.02em;
  color: #111827; /* gray-900 */
  margin-bottom: 24px; /* Space 6 */
}

h2, .h2 {
  font-size: 48px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.01em;
  color: #111827;
  margin-bottom: 24px;
}

h3, .h3 {
  font-size: 36px;
  font-weight: 600;
  line-height: 1.2;
  color: #1f2937;
  margin-bottom: 16px; /* Space 4 */
}

h4, .h4 {
  font-size: 24px;
  font-weight: 600;
  line-height: 1.3;
  color: #1f2937;
  margin-bottom: 16px;
}

h5, .h5 {
  font-size: 20px;
  font-weight: 600;
  line-height: 1.4;
  color: #374151; /* gray-700 */
  margin-bottom: 12px; /* Space 3 */
}

/* Responsive headings */
@media (max-width: 768px) {
  h1, .h1 { font-size: 40px; }
  h2, .h2 { font-size: 32px; }
  h3, .h3 { font-size: 28px; }
  h4, .h4 { font-size: 20px; }
}
```

### Body Text Styles

```css
p {
  font-size: 16px;
  font-weight: 400;
  line-height: 1.5;
  color: #4b5563; /* gray-600 */
  margin-bottom: 16px; /* Space 4 */
}

.text-large {
  font-size: 18px;
  line-height: 1.6;
}

.text-small {
  font-size: 14px;
  line-height: 1.5;
}

.text-bold {
  font-weight: 600;
  color: #1f2937;
}

/* Lead paragraph */
.lead {
  font-size: 20px;
  font-weight: 400;
  line-height: 1.6;
  color: #374151;
}
```

## COLOR PALETTES - CHOOSE ONE PER PROJECT

### Option 1: Monochrome Minimal

```css
:root {
  --color-bg: #ffffff;
  --color-bg-alt: #f9fafb;
  --color-text: #1f2937;
  --color-text-light: #6b7280;
  --color-border: #e5e7eb;
  --color-accent: #1f2937;
}
```

### Option 2: Dark Elegant

```css
:root {
  --color-bg: #0a0a0a;
  --color-bg-alt: #1a1a1a;
  --color-text: #ffffff;
  --color-text-light: #a3a3a3;
  --color-border: #2a2a2a;
  --color-accent: #ffffff;
}
```

### Option 3: Navy Professional

```css
:root {
  --color-bg: #ffffff;
  --color-bg-alt: #f8fafc;
  --color-text: #0f172a;
  --color-text-light: #64748b;
  --color-border: #e2e8f0;
  --color-accent: #1e40af;
}
```

### Option 4: Warm Neutral

```css
:root {
  --color-bg: #fafaf9;
  --color-bg-alt: #f5f5f4;
  --color-text: #1c1917;
  --color-text-light: #78716c;
  --color-border: #e7e5e4;
  --color-accent: #a16207;
}
```

### Option 5: Forest Green

```css
:root {
  --color-bg: #ffffff;
  --color-bg-alt: #f0fdf4;
  --color-text: #052e16;
  --color-text-light: #4b5563;
  --color-border: #d1fae5;
  --color-accent: #065f46;
}
```

## PERFECT EXAMPLE - LANDING PAGE

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Premium Landing Page</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <!-- Navigation -->
  <nav class="nav">
    <div class="container">
      <div class="nav-content">
        <div class="logo">Brand</div>
        <div class="nav-links">
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <a href="#contact">Contact</a>
        </div>
        <button class="btn-primary">Get Started</button>
      </div>
    </div>
  </nav>

  <!-- Hero Section -->
  <section class="hero">
    <div class="container">
      <div class="hero-content fade-in-up">
        <h1 class="hero-title">Build Something Amazing</h1>
        <p class="hero-subtitle">Create exceptional digital experiences with our modern platform designed for professionals.</p>
        <div class="hero-buttons">
          <button class="btn-primary">Start Free Trial</button>
          <button class="btn-secondary">View Demo</button>
        </div>
      </div>
    </div>
  </section>

  <!-- Features Section -->
  <section class="features">
    <div class="container">
      <h2 class="section-title">Everything You Need</h2>
      <div class="grid grid-3">
        <div class="card hover-lift reveal">
          <h3>Fast Performance</h3>
          <p>Lightning-fast load times optimized for every device and connection.</p>
        </div>
        <div class="card hover-lift reveal">
          <h3>Secure by Default</h3>
          <p>Enterprise-grade security protecting your data at every level.</p>
        </div>
        <div class="card hover-lift reveal">
          <h3>Scale Effortlessly</h3>
          <p>Grow from zero to millions without changing your infrastructure.</p>
        </div>
      </div>
    </div>
  </section>

  <script src="script.js"></script>
</body>
</html>
```

```css
/* styles.css */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  --color-bg: #ffffff;
  --color-bg-alt: #f9fafb;
  --color-text: #1f2937;
  --color-text-light: #6b7280;
  --color-border: #e5e7eb;
  --color-accent: #1f2937;
}

body {
  font-family: 'Inter', sans-serif;
  font-size: 16px;
  line-height: 1.5;
  color: var(--color-text);
  background: var(--color-bg);
  -webkit-font-smoothing: antialiased;
}

.container {
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 32px;
}

/* Navigation */
.nav {
  position: sticky;
  top: 0;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--color-border);
  z-index: 1000;
}

.nav-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 64px;
}

.logo {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-text);
}

.nav-links {
  display: flex;
  gap: 32px;
}

.nav-links a {
  color: var(--color-text-light);
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s;
}

.nav-links a:hover {
  color: var(--color-text);
}

/* Hero Section */
.hero {
  padding: 128px 0;
  background: var(--color-bg);
}

.hero-content {
  max-width: 800px;
  margin: 0 auto;
  text-align: center;
}

.hero-title {
  font-size: 64px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.02em;
  color: var(--color-text);
  margin-bottom: 24px;
}

.hero-subtitle {
  font-size: 20px;
  line-height: 1.6;
  color: var(--color-text-light);
  margin-bottom: 32px;
}

.hero-buttons {
  display: flex;
  gap: 16px;
  justify-content: center;
}

/* Features Section */
.features {
  padding: 96px 0;
  background: var(--color-bg-alt);
}

.section-title {
  font-size: 48px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 64px;
}

/* Buttons */
.btn-primary {
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 8px;
  border: none;
  background: var(--color-accent);
  color: white;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.btn-secondary {
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 8px;
  border: 1.5px solid var(--color-border);
  background: white;
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-secondary:hover {
  border-color: var(--color-text-light);
}

/* Grid */
.grid {
  display: grid;
  gap: 32px;
}

.grid-3 {
  grid-template-columns: repeat(3, 1fr);
}

@media (max-width: 1024px) {
  .grid-3 {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .grid-3 {
    grid-template-columns: 1fr;
  }
  
  .hero-title {
    font-size: 40px;
  }
  
  .hero-buttons {
    flex-direction: column;
  }
}

/* Card */
.card {
  padding: 32px;
  border-radius: 12px;
  background: white;
  border: 1px solid var(--color-border);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.card h3 {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 12px;
}

.card p {
  color: var(--color-text-light);
  line-height: 1.6;
}

.hover-lift:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
}

/* Animations */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-in-up {
  animation: fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

.reveal {
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.reveal.is-visible {
  opacity: 1;
  transform: translateY(0);
}
```

```javascript
// script.js
// Scroll reveal animation
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
    }
  });
}, observerOptions);

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
```

## IMPLEMENTATION CHECKLIST

Before delivering any UI, verify ALL of these:

**Structure & Spacing**:
- [ ] NO empty white spaces larger than 128px
- [ ] All spacing uses values from spacing scale (4, 8, 12, 16, 24, 32, 48, 64, 96, 128)
- [ ] Content max-width is 1440px
- [ ] Container padding: 32px desktop, 24px tablet, 16px mobile
- [ ] Section padding: 96px desktop, 64px tablet, 48px mobile
- [ ] Grid gaps consistent: 32px desktop, 24px tablet, 16px mobile

**Typography**:
- [ ] NO emojis anywhere
- [ ] Line height 1.5 for body text (exactly)
- [ ] Line height 1.2 for headings (exactly)
- [ ] Font weights: 400, 500, 600, or 700 only
- [ ] Letter spacing: -0.02em on large headings
- [ ] Responsive font sizes defined
- [ ] No centered body text (only headings)

**Colors**:
- [ ] Maximum 4 colors total
- [ ] NO neon colors
- [ ] NO purple as primary
- [ ] NO saturated colors (saturation < 70%)
- [ ] Text contrast ratio minimum 4.5:1
- [ ] Backgrounds: white, gray-50, gray-900, or gray-950 only

**Components**:
- [ ] All buttons have hover states
- [ ] All buttons have active states
- [ ] All inputs have focus states
- [ ] All inputs have error states
- [ ] Cards have consistent padding (32px)
- [ ] Cards have hover effects
- [ ] NO default browser styling

**Animations**:
- [ ] At least 3 modern animations implemented
- [ ] Fade in up on hero content
- [ ] Scroll reveal on feature cards
- [ ] Hover lift on interactive elements
- [ ] All animations under 500ms
- [ ] Using transform and opacity only

**Responsiveness**:
- [ ] Breakpoints: 640px, 768px, 1024px, 1280px
- [ ] Mobile-first approach
- [ ] Touch targets minimum 44x44px
- [ ] Grid collapses to single column on mobile
- [ ] Navigation collapses appropriately
- [ ] Font sizes scale down on mobile

**Accessibility**:
- [ ] All interactive elements keyboard accessible
- [ ] Focus visible on all elements
- [ ] Alt text on all images
- [ ] Semantic HTML (header, nav, main, section, footer)
- [ ] ARIA labels where needed

**Performance**:
- [ ] Images lazy loaded
- [ ] Fonts preloaded
- [ ] CSS minified
- [ ] No inline styles (except dynamic ones)

## FRAMEWORK-SPECIFIC IMPLEMENTATIONS

### React with Tailwind CSS

```jsx
// Use Tailwind's exact spacing scale
<div className="px-8 py-12 md:px-12 md:py-16 lg:px-16 lg:py-24">
  <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-gray-900 mb-6">
    Perfect Heading
  </h1>
  <p className="text-lg text-gray-600 leading-relaxed mb-8">
    Perfect paragraph with proper spacing.
  </p>
  <button className="px-6 py-3 bg-gray-900 text-white rounded-lg font-semibold 
    hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200">
    Perfect Button
  </button>
</div>
```

### Vue with Composition API

```vue
<script setup>
const spacing = {
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  6: '24px',
  8: '32px',
  12: '48px',
  16: '64px',
  24: '96px'
};
</script>

<template>
  <div :style="{ padding: `${spacing[24]} ${spacing[16]}` }">
    <h1 class="heading-1">Perfect Heading</h1>
    <p class="body-text">Perfect paragraph</p>
    <button class="btn-primary">Perfect Button</button>
  </div>
</template>

<style scoped>
.heading-1 {
  font-size: 56px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.02em;
  color: #1f2937;
  margin-bottom: 24px;
}

.body-text {
  font-size: 16px;
  line-height: 1.5;
  color: #6b7280;
  margin-bottom: 16px;
}

.btn-primary {
  padding: 12px 24px;
  background: #1f2937;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
</style>
```

## REFERENCE IMPLEMENTATION - MUST FOLLOW THIS STANDARD

This is the EXACT quality level every UI must meet. Study this example carefully.

### Complete Landing Page Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Agent - Autonomous Messaging Automation</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    :root {
      --color-bg: #fafafa;
      --color-surface: #ffffff;
      --color-text: #0a0a0a;
      --color-text-secondary: #525252;
      --color-border: #e5e5e5;
      --color-accent: #0a0a0a;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--color-bg);
      color: var(--color-text);
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
      overflow-x: hidden;
    }

    /* Navigation */
    nav {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: rgba(255, 255, 255, 0.8);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--color-border);
      z-index: 1000;
    }

    .nav-container {
      max-width: 1440px;
      margin: 0 auto;
      padding: 0 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      height: 72px;
    }

    .logo {
      font-size: 18px;
      font-weight: 700;
      color: var(--color-text);
    }

    .nav-links {
      display: flex;
      gap: 32px;
      align-items: center;
    }

    .nav-links a {
      color: var(--color-text-secondary);
      text-decoration: none;
      font-size: 15px;
      font-weight: 500;
      transition: color 0.2s;
    }

    .nav-links a:hover {
      color: var(--color-text);
    }

    .btn {
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      border: none;
      text-decoration: none;
      display: inline-block;
    }

    .btn-primary {
      background: var(--color-accent);
      color: white;
    }

    .btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .btn-secondary {
      background: transparent;
      color: var(--color-text);
      border: 1.5px solid var(--color-border);
    }

    .btn-secondary:hover {
      background: var(--color-surface);
      border-color: var(--color-text-secondary);
    }

    /* Hero Section */
    .hero {
      padding: 160px 32px 96px;
      max-width: 1440px;
      margin: 0 auto;
    }

    .hero-content {
      max-width: 900px;
      margin: 0 auto;
      text-align: center;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 6px 16px;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 100px;
      font-size: 13px;
      font-weight: 500;
      margin-bottom: 24px;
      color: var(--color-text);
    }

    h1 {
      font-size: 72px;
      font-weight: 700;
      line-height: 1.1;
      letter-spacing: -0.03em;
      color: var(--color-text);
      margin-bottom: 24px;
    }

    .gradient-text {
      background: linear-gradient(135deg, #0a0a0a 0%, #525252 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .hero p {
      font-size: 20px;
      line-height: 1.6;
      color: var(--color-text-secondary);
      margin-bottom: 32px;
      max-width: 700px;
      margin-left: auto;
      margin-right: auto;
    }

    .hero-buttons {
      display: flex;
      gap: 16px;
      justify-content: center;
      margin-bottom: 64px;
    }

    /* Stats Section */
    .stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 32px;
      max-width: 900px;
      margin: 0 auto;
    }

    .stat-card {
      text-align: center;
      padding: 32px;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 16px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .stat-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
    }

    .stat-number {
      font-size: 48px;
      font-weight: 700;
      line-height: 1;
      margin-bottom: 8px;
      color: var(--color-text);
    }

    .stat-label {
      font-size: 15px;
      color: var(--color-text-secondary);
      font-weight: 500;
    }

    /* Features Section */
    .features {
      padding: 128px 32px;
      background: var(--color-surface);
      border-top: 1px solid var(--color-border);
    }

    .features-container {
      max-width: 1440px;
      margin: 0 auto;
    }

    .section-header {
      text-align: center;
      margin-bottom: 64px;
    }

    .section-label {
      font-size: 14px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-text-secondary);
      margin-bottom: 12px;
    }

    h2 {
      font-size: 48px;
      font-weight: 700;
      line-height: 1.2;
      letter-spacing: -0.02em;
      color: var(--color-text);
      margin-bottom: 16px;
    }

    .section-description {
      font-size: 18px;
      color: var(--color-text-secondary);
      max-width: 600px;
      margin: 0 auto;
      line-height: 1.6;
    }

    .features-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 32px;
    }

    .feature-card {
      padding: 32px;
      background: var(--color-bg);
      border: 1px solid var(--color-border);
      border-radius: 16px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .feature-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
      border-color: var(--color-text-secondary);
    }

    .feature-icon {
      width: 48px;
      height: 48px;
      background: var(--color-text);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
      font-size: 24px;
    }

    .feature-card h3 {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 12px;
      color: var(--color-text);
    }

    .feature-card p {
      font-size: 15px;
      line-height: 1.6;
      color: var(--color-text-secondary);
    }

    /* CTA Section */
    .cta {
      padding: 128px 32px;
      background: var(--color-text);
      color: white;
    }

    .cta-container {
      max-width: 800px;
      margin: 0 auto;
      text-align: center;
    }

    .cta h2 {
      color: white;
      margin-bottom: 16px;
    }

    .cta p {
      font-size: 18px;
      color: rgba(255, 255, 255, 0.7);
      margin-bottom: 32px;
    }

    .btn-white {
      background: white;
      color: var(--color-text);
    }

    .btn-white:hover {
      transform: translateY(-1px);
      box-shadow: 0 8px 16px rgba(255, 255, 255, 0.2);
    }

    /* Footer */
    footer {
      padding: 64px 32px;
      background: var(--color-surface);
      border-top: 1px solid var(--color-border);
    }

    .footer-container {
      max-width: 1440px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1fr;
      gap: 48px;
    }

    .footer-brand {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 12px;
    }

    .footer-description {
      font-size: 14px;
      color: var(--color-text-secondary);
      line-height: 1.6;
    }

    .footer-title {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 16px;
      color: var(--color-text);
    }

    .footer-links {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .footer-links a {
      font-size: 14px;
      color: var(--color-text-secondary);
      text-decoration: none;
      transition: color 0.2s;
    }

    .footer-links a:hover {
      color: var(--color-text);
    }

    /* Animations */
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .fade-in-up {
      animation: fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }

    .delay-1 { animation-delay: 0.1s; opacity: 0; }
    .delay-2 { animation-delay: 0.2s; opacity: 0; }
    .delay-3 { animation-delay: 0.3s; opacity: 0; }
    .delay-4 { animation-delay: 0.4s; opacity: 0; }

    .reveal {
      opacity: 0;
      transform: translateY(30px);
      transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .reveal.is-visible {
      opacity: 1;
      transform: translateY(0);
    }

    /* Responsive */
    @media (max-width: 1024px) {
      .features-grid,
      .footer-container {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 768px) {
      h1 {
        font-size: 48px;
      }

      h2 {
        font-size: 36px;
      }

      .hero {
        padding: 120px 24px 64px;
      }

      .features,
      .cta {
        padding: 96px 24px;
      }

      .stats,
      .features-grid,
      .footer-container {
        grid-template-columns: 1fr;
        gap: 24px;
      }

      .hero-buttons {
        flex-direction: column;
      }

      .nav-links {
        display: none;
      }
    }
  </style>
</head>
<body>
  <!-- Navigation -->
  <nav>
    <div class="nav-container">
      <div class="logo">AI Agent</div>
      <div class="nav-links">
        <a href="#features">Features</a>
        <a href="#how-it-works">How It Works</a>
        <a href="#platforms">Platforms</a>
        <a href="#" class="btn btn-primary">Get Started Free</a>
      </div>
    </div>
  </nav>

  <!-- Hero Section -->
  <section class="hero">
    <div class="hero-content">
      <div class="badge fade-in-up">Completely Free Forever</div>
      <h1 class="fade-in-up delay-1">
        Your Autonomous AI Agent<br>
        for <span class="gradient-text">Every Messaging App</span>
      </h1>
      <p class="fade-in-up delay-2">
        Automate tasks, schedule workflows, debug code, and write content across Telegram, WhatsApp, Discord, and more. No setup fees. No subscriptions. Just pure automation.
      </p>
      <div class="hero-buttons fade-in-up delay-3">
        <a href="#" class="btn btn-primary">Start Automating Now</a>
        <a href="#" class="btn btn-secondary">View Documentation</a>
      </div>
      
      <div class="stats fade-in-up delay-4">
        <div class="stat-card">
          <div class="stat-number">24/7</div>
          <div class="stat-label">Always Active</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">10+</div>
          <div class="stat-label">Platforms Supported</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">100%</div>
          <div class="stat-label">Free to Use</div>
        </div>
      </div>
    </div>
  </section>

  <!-- Features Section -->
  <section class="features" id="features">
    <div class="features-container">
      <div class="section-header">
        <div class="section-label">CAPABILITIES</div>
        <h2>Everything You Need to Automate</h2>
        <p class="section-description">
          Powerful automation features designed for developers and teams who want to streamline their workflow.
        </p>
      </div>

      <div class="features-grid">
        <div class="feature-card reveal">
          <div class="feature-icon">⚡</div>
          <h3>Task Automation</h3>
          <p>Execute complex workflows automatically across all your messaging platforms with intelligent scheduling.</p>
        </div>

        <div class="feature-card reveal">
          <div class="feature-icon">🔄</div>
          <h3>Smart Scheduling</h3>
          <p>Set up recurring tasks, time-based triggers, and conditional workflows that run exactly when you need them.</p>
        </div>

        <div class="feature-card reveal">
          <div class="feature-icon">🐛</div>
          <h3>Auto Debug</h3>
          <p>Automatically detect, analyze, and fix code issues in real-time with intelligent error handling.</p>
        </div>

        <div class="feature-card reveal">
          <div class="feature-icon">✍️</div>
          <h3>Content Generation</h3>
          <p>Create high-quality written content automatically using advanced AI language models.</p>
        </div>

        <div class="feature-card reveal">
          <div class="feature-icon">🔗</div>
          <h3>Multi-Platform</h3>
          <p>Works seamlessly with Telegram, WhatsApp, Discord, Slack, and 10+ other messaging platforms.</p>
        </div>

        <div class="feature-card reveal">
          <div class="feature-icon">🔒</div>
          <h3>Secure & Private</h3>
          <p>End-to-end encryption and zero data retention ensure your conversations stay completely private.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- CTA Section -->
  <section class="cta">
    <div class="cta-container">
      <h2>Ready to Automate Everything?</h2>
      <p>Start using AI Agent today with zero setup costs and no credit card required.</p>
      <a href="#" class="btn btn-white">Get Started Free</a>
    </div>
  </section>

  <!-- Footer -->
  <footer>
    <div class="footer-container">
      <div>
        <div class="footer-brand">AI Agent</div>
        <p class="footer-description">
          Autonomous automation for modern messaging platforms. Built for developers, designed for everyone.
        </p>
      </div>
      <div>
        <div class="footer-title">Product</div>
        <div class="footer-links">
          <a href="#">Features</a>
          <a href="#">Platforms</a>
          <a href="#">Pricing</a>
          <a href="#">Documentation</a>
        </div>
      </div>
      <div>
        <div class="footer-title">Company</div>
        <div class="footer-links">
          <a href="#">About</a>
          <a href="#">Blog</a>
          <a href="#">Careers</a>
          <a href="#">Contact</a>
        </div>
      </div>
      <div>
        <div class="footer-title">Legal</div>
        <div class="footer-links">
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="#">Security</a>
        </div>
      </div>
    </div>
  </footer>

  <script>
    // Scroll reveal animation
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        }
      });
    }, observerOptions);

    document.querySelectorAll('.reveal').forEach(el => {
      observer.observe(el);
    });
  </script>
</body>
</html>
```

## MANDATORY IMPLEMENTATION RULES

When generating ANY UI, you MUST:

1. **Use the template above as your quality baseline** - Match or exceed this level
2. **Include ALL these sections** for landing pages:
   - Sticky navigation with backdrop blur
   - Hero with badge, large heading, description, CTA buttons
   - Stats/metrics section
   - Features grid (minimum 6 features)
   - CTA section with dark background
   - Complete footer with links

3. **Required animations**:
   - Fade in up on hero content with stagger delays
   - Scroll reveal on feature cards
   - Hover lift on all cards
   - Button hover states with transform

4. **Exact spacing**:
   - Nav height: 72px
   - Hero padding top: 160px (accounts for fixed nav)
   - Section padding: 128px vertical, 32px horizontal
   - Card padding: 32px
   - Grid gap: 32px

5. **Typography**:
   - H1: 72px, weight 700, line-height 1.1, letter-spacing -0.03em
   - H2: 48px, weight 700, line-height 1.2, letter-spacing -0.02em
   - H3: 20px, weight 600
   - Body: 18-20px for lead text, 15-16px for body
   - All with proper line-height (1.5-1.6 for body, 1.1-1.2 for headings)

6. **Colors** (choose ONE palette):
   - Light minimal: bg #fafafa, surface #ffffff, text #0a0a0a
   - Dark minimal: bg #0a0a0a, surface #1a1a1a, text #ffffff
   - Warm: bg #fafaf9, surface #ffffff, text #1c1917

7. **No empty space** - Every section fills width, proper padding, no gaps > 64px

## FINAL RULES

1. **NO EMOJIS** - This is critical. Never use emojis anywhere.
2. **NO EMPTY SPACE** - Fill sections completely, use proper spacing scale.
3. **PERFECT ALIGNMENT** - Everything on 8px grid.
4. **MODERN ANIMATIONS** - Always include at least 3 animation types.
5. **CONSISTENT SPACING** - Only use values from the spacing scale.
6. **PERFECT TYPOGRAPHY** - Exact line heights, weights, and sizes.
7. **MINIMAL COLORS** - Maximum 4 colors total.
8. **HOVER EVERYTHING** - All interactive elements need hover states.
9. **RESPONSIVE ALWAYS** - Test all breakpoints.
10. **ACCESSIBILITY FIRST** - Keyboard navigation, focus states, contrast ratios.

Every UI must look like it was designed by a world-class agency. No exceptions.
