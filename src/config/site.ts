/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const siteConfig = {
  name: 'Cherryflow',
  tagline: 'Manage. Automate. Grow.',
  description:
    'A production-oriented, full-stack Business Management SaaS application engineered for small businesses. Unified management across inventory, invoicing, CRM, expenses, and automated operations.',
  phase: 'Phase 1 - Frontend Foundation, Layout & Architecture',
  version: '1.0.0-phase1',
  developer: {
    name: 'Nithiarasu',
    email: 'nithiarasu248@gmail.com',
    contact: '9952281794',
    role: 'Lead Full-Stack Software Engineer & Architect',
    bio: 'Software engineer building resilient, accessible, and high-performance SaaS applications with strict architectural discipline.',
    github: 'https://github.com',
    portfolio: 'https://cherryflow.dev',
  },
  links: {
    dashboard: '/app/dashboard',
    signIn: '/sign-in',
    signUp: '/sign-up',
    developer: '/developer',
    settingsDeveloper: '/app/settings#developer',
  },
  theme: {
    mainBg: '#090a0f',
    surfaceCharcoal: '#12141c',
    surfaceCharcoalElevated: '#181b26',
    borderSubtle: '#222634',
    accentCherry: '#e11d48',
    accentCherryHover: '#be123c',
    textMain: '#f8fafc',
    textMuted: '#94a3b8',
  },
} as const;
