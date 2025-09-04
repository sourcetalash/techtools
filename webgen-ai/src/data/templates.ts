export type ProjectType = 'static' | 'react' | 'vue' | 'angular' | 'next'

export type TemplateDef = {
  id: string
  name: string
  description: string
  promptHint: string
}

export const TEMPLATES_BY_TYPE: Record<ProjectType, TemplateDef[]> = {
  static: [
    { id: 'marketing', name: 'Marketing Landing', description: 'Hero, features, CTA, testimonials', promptHint: 'Create a sleek marketing landing page with hero, 3-6 features, CTA, and testimonials.' },
    { id: 'portfolio', name: 'Portfolio', description: 'Showcase projects and bio', promptHint: 'Personal portfolio with intro, project cards grid, and contact links.' },
    { id: 'docs', name: 'Docs', description: 'Sidebar + content', promptHint: 'Documentation layout with sticky sidebar and content area with typography.' },
  ],
  react: [
    { id: 'saas', name: 'SaaS Dashboard', description: 'Cards, charts, sidebar', promptHint: 'SaaS admin dashboard with sidebar, topbar, KPI cards, and a simple chart placeholder.' },
    { id: 'landing', name: 'SaaS Landing', description: 'Hero, pricing, FAQ', promptHint: 'SaaS product landing with pricing tiers, hero, and FAQ.' },
    { id: 'blog', name: 'Blog', description: 'Posts list + article', promptHint: 'Blog home listing posts and a sample post page.' },
  ],
  vue: [
    { id: 'dashboard', name: 'Dashboard', description: 'Sidebar + cards', promptHint: 'Admin dashboard with sidebar nav and KPI cards.' },
    { id: 'landing', name: 'Landing', description: 'Hero, features, CTA', promptHint: 'Marketing landing with hero, features, and CTA.' },
  ],
  angular: [
    { id: 'lite-landing', name: 'Landing (Lite)', description: 'Static preview', promptHint: 'Angular-like static landing preview with hero and features.' },
    { id: 'lite-dashboard', name: 'Dashboard (Lite)', description: 'Static preview', promptHint: 'Angular-like static dashboard preview with cards.' },
  ],
  next: [
    { id: 'app-router-landing', name: 'Next Landing', description: 'App Router static preview', promptHint: 'Next.js static preview of an app router landing page with hero and sections.' },
    { id: 'app-router-blog', name: 'Next Blog', description: 'Static preview', promptHint: 'Next.js static preview of a blog home and post.' },
  ],
}

export function getTemplatesForType(type: ProjectType): TemplateDef[] {
  return TEMPLATES_BY_TYPE[type]
}

