import { useState } from 'react'
import type { TutorialCategory } from '@/pages/landing/types'

type UseCategoriesOptions = {
  onCategoryAdded?: () => void
}

export function useCategories({ onCategoryAdded }: UseCategoriesOptions = {}) {
  const [categories, setCategories] = useState<TutorialCategory[]>([])
  const [activeCategory, setActiveCategory] = useState<number | null>(null)
  const [showCategoryModal, setShowCategoryModal] = useState(false)

  const addCategory = (preset: { name: string }) => {
    const newCategory: TutorialCategory = {
      id: categories.length > 0 ? categories[categories.length - 1].id + 1 : 1,
      name: preset.name,
    }
    setCategories(prev => [...prev, newCategory])
    setActiveCategory(newCategory.id)
    setShowCategoryModal(false)
    onCategoryAdded?.()
  }

  return {
    categories,
    setCategories,
    activeCategory,
    setActiveCategory,
    showCategoryModal,
    setShowCategoryModal,
    addCategory,
  }
}
