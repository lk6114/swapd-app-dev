import { Baby, Bike, BookOpen, Headphones, Lamp, Package, Shirt, Sprout, type LucideProps } from 'lucide-react'
import type { Category } from '@/data'

const ICONS: Record<Category, React.ComponentType<LucideProps>> = {
  clothes: Shirt,
  books: BookOpen,
  electronics: Headphones,
  home: Lamp,
  sports: Bike,
  kids: Baby,
  plants: Sprout,
  other: Package,
}

export function CategoryIcon({ category, ...props }: { category: Category } & LucideProps) {
  const Icon = ICONS[category]
  return <Icon strokeWidth={2} {...props} />
}
