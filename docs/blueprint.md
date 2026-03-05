# **App Name**: Sellers Pulse

## Core Features:

- User Authentication: Secure login system using Firebase Auth with Google Sign-in, presented with a custom glassmorphism-styled page.
- Project Hub Dashboard: A personalized dashboard displaying all projects in a grid of dynamically themed cards, reflecting client branding, overall progress, and current status.
- New Project Configuration: An interactive modal for creating new projects, allowing users to input client details, select branding colors with real-time preview, upload logos, and automatically initialize standard project phases in Firestore.
- Interactive Project Overview: A detailed view for each project featuring key performance indicators (KPIs), animated progress indicators, and a dynamic, draggable Gantt chart with inline editing for phase names and dates.
- AI-Powered Presentation Builder: An integrated tool that automatically generates customizable presentation slides based on project data and weekly updates, available in a fullscreen presentation mode for client meetings.
- Intelligent AI Assistant Chat: A contextual chat interface powered by the Gemini API, capable of providing executive summaries, risk analysis, action suggestions, and using its tool to update presentation slide content based on project data.
- Dynamic Theming System: An instantaneous theming system that updates global CSS variables for primary and secondary client colors (--color-brand, --color-brand-secondary) across the entire UI upon project selection, ensuring brand consistency.

## Style Guidelines:

- The base background color across the application will be pitch black (#000000), creating a sleek and premium dark mode aesthetic as per the user's explicit request.
- UI surfaces and interactive elements will feature translucent glassmorphism (rgba(255,255,255,0.05) with backdrop-blur) to provide depth and a modern visual style.
- The default accent for global Sellers Pulse branding (when no project is selected) will be a vibrant indigo-purple (#6247EB), conveying innovation and energy.
- A core feature is the dynamic theme system, which instantly loads and applies project-specific primary and secondary brand colors (--color-brand, --color-brand-secondary) across the entire UI when a project is active.
- Headlines and prominent titles will use 'Outfit' (sans-serif) for a strong, modern, and impactful visual presence. Note: currently only Google Fonts are supported.
- General UI text, body content, and descriptive elements will utilize 'Inter' (sans-serif) to ensure excellent readability and maintain a contemporary, objective aesthetic.
- A consistent set of modern, clear, and contextually relevant icons (e.g., outline or solid-filled styles) will be used throughout the navigation, project cards, and feature displays, optimizing for clarity within the dark theme.
- Key layouts include a dynamic grid for dashboard project cards, a fixed-height scrollable main content area within project views, and a collapsible sidebar with smooth label transitions for efficient navigation.
- Subtle and sophisticated animations powered by Framer Motion will provide smooth transitions for UI state changes, interactive element hovers, and unique visual feedback like the pulsing glow on active Gantt phases and focused components.